/**
 * lib/api.js — Single source of truth for all backend communication.
 *
 * Every component/hook imports from here instead of writing inline fetch calls.
 * Change the backend URL in ONE place (or via NEXT_PUBLIC_API_URL) and the whole
 * app follows.
 */

// Read the API base from the environment, defaulting to local dev. Documented
// in frontend/.env.example. NEXT_PUBLIC_ prefix is required for Next.js to
// expose the var to the browser bundle.
export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

/**
 * POST /api/videos/process
 * Kicks off the full ingestion pipeline for both videos.
 * @returns {Promise<{video_a: object, video_b: object}>}
 * @throws {Error} with the backend's `detail` message on non-2xx responses.
 */
export async function processVideos(youtubeUrl, instagramUrl) {
  const res = await fetch(`${API_BASE}/api/videos/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      youtube_url: youtubeUrl.trim(),
      instagram_url: instagramUrl.trim(),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

/**
 * POST /api/chat/reset — wipe the conversation memory window on the backend.
 */
export async function resetChat(analysisId = "default") {
  const res = await fetch(
    `${API_BASE}/api/chat/reset?analysis_id=${encodeURIComponent(analysisId)}`,
    { method: "POST", credentials: "include" }
  );
  if (!res.ok) throw new Error(`Reset failed: HTTP ${res.status}`);
  return res.json();
}

/**
 * POST /api/videos/load/{id} — reopen a saved analysis (re-hydrates RAG state).
 */
export async function loadAnalysis(analysisId) {
  const res = await fetch(`${API_BASE}/api/videos/load/${encodeURIComponent(analysisId)}`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

// ── Auth ──

export async function apiRegister(email, password, name) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

export async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

export async function apiMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export async function apiLogout() {
  await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
}

export async function apiGoogleAuth(idToken) {
  const res = await fetch(`${API_BASE}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

export async function apiForgotPassword(email) {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

export async function apiResetPassword(token, password) {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `Server error ${res.status}`);
  }
  return res.json();
}

export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/api/videos/history`, { credentials: "include" });
  if (!res.ok) throw new Error(`History failed: HTTP ${res.status}`);
  return res.json();
}

/**
 * POST /api/chat/stream — stream an answer as Server-Sent Events.
 *
 * Handles the ENTIRE SSE lifecycle: parsing `data:`/`event:` frames, decoding
 * partial chunks, and dispatching to the right callback. The backend emits:
 *   - default data frames: `data: <token>`              -> onToken(token)
 *   - a named event:       `event: sources\ndata: [..]`  -> onSources(array)
 *   - closure:             `data: [DONE]`                -> onDone()
 *   - error JSON:          `data: {"type":"error",...}`  -> onError(msg)
 *
 * @returns {{ cancel: () => void }} a handle whose cancel() aborts the stream.
 */
export function streamChatMessage(message, { onToken, onSources, onDone, onError, analysisId = "default" }) {
  const controller = new AbortController();
  let cancelled = false;

  (async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/chat/stream?analysis_id=${encodeURIComponent(analysisId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message }),
          signal: controller.signal,
        }
      );

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let pendingEvent = null;
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep trailing partial line

        for (const raw of lines) {
          const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
          if (!line) continue;

          if (line.startsWith("event:")) {
            pendingEvent = line.slice(6).trim();
            continue;
          }

          if (line.startsWith("data:")) {
            // Strip exactly "data: " (not .trim()) — LLM tokens carry their own
            // leading spaces (e.g. " need"); trimming would merge words.
            const data = line.startsWith("data: ") ? line.slice(6) : line.slice(5);

            if (data === "[DONE]") {
              done = true;
              break;
            }

            if (pendingEvent === "sources") {
              try {
                onSources?.(JSON.parse(data));
              } catch {
                /* ignore malformed sources frame */
              }
              pendingEvent = null;
              continue;
            }

            // Backend error frames arrive as JSON objects.
            if (data.startsWith("{")) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "error") {
                  onError?.(parsed.content || "The assistant ran into an error.");
                  done = true;
                  break;
                }
              } catch {
                /* not error JSON — fall through and treat as a literal token */
              }
            }

            onToken?.(data);
            pendingEvent = null;
          }
        }
      }

      if (!cancelled) onDone?.();
    } catch (err) {
      if (err?.name === "AbortError" || cancelled) return; // user-initiated stop
      onError?.(
        err?.message?.includes("Failed to fetch")
          ? "Connection failed. Is the backend running on port 8000?"
          : err?.message || "Streaming failed unexpectedly."
      );
    }
  })();

  return {
    cancel() {
      cancelled = true;
      controller.abort();
    },
  };
}
