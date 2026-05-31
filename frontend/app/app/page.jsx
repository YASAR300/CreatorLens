'use client';

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, CheckCircle, BarChart3, LogOut,
  Plus, Inbox, Star, Sparkles, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import VideoCard from "../../components/VideoCard";
import SkeletonVideoCard from "../../components/SkeletonVideoCard";
import ChatInterface from "../../components/ChatInterface";
import ProcessingBar from "../../components/ProcessingBar";
import { useVideoProcessor } from "../../hooks/useVideoProcessor";
import { useAuth } from "../../hooks/useAuth";
import Logo from "../../components/Logo";
import { resetChat, fetchHistory, loadAnalysis } from "../../lib/api";

const LAST_KEY = "creatorlens_last_analysis";

/* Linear-style palette */
const C = {
  bg: "#08090a",
  sidebar: "#0b0c0d",
  panel: "#0e0f11",
  panel2: "#121315",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.05)",
  text: "#f7f8f8",
  dim: "#8a8f98",
  dimmer: "#62666d",
  blue: "#5e6ad2",
};

const YoutubeInputIcon = () => (
  <svg viewBox="0 0 24 24" fill="#ff3333" width="14" height="14">
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.388.51a3.002 3.002 0 0 0-2.11 2.108C0 8.029 0 12 0 12s0 3.972.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.863.51 9.388.51 9.388.51s7.525 0 9.388-.51a3.002 3.002 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.971-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const InstagramInputIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
    <defs>
      <linearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#fcb045" />
        <stop offset="50%" stopColor="#fd1d1d" />
        <stop offset="100%" stopColor="#833ab4" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#ig)" strokeWidth="2" />
    <circle cx="12" cy="12" r="4" stroke="url(#ig)" strokeWidth="2" />
    <circle cx="17.5" cy="6.5" r="1.2" fill="#fd1d1d" />
  </svg>
);

export default function Dashboard() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const {
    youtubeUrl, setYoutubeUrl,
    instagramUrl, setInstagramUrl,
    isProcessing, processingStep,
    videoA, videoB,
    analyze, reset, loadVideos,
  } = useVideoProcessor();

  const [isResetting, setIsResetting] = useState(false);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState("comparison");   // comparison | history | insights
  const [activeId, setActiveId] = useState(null);    // currently open analysis id
  const [loadingId, setLoadingId] = useState(null);   // history item being opened
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [restored] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(LAST_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const chatRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const refreshHistory = useCallback(() => {
    setLoadingHistory(true);
    fetchHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // loadingHistory defaults to true; just fetch and settle it.
    fetchHistory()
      .then((rows) => { if (!cancelled) setHistory(rows); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingHistory(false); });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (videoA && videoB) {
      try { localStorage.setItem(LAST_KEY, JSON.stringify({ videoA, videoB, ts: Date.now() })); } catch { /* ignore */ }
    }
  }, [videoA, videoB]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (isProcessing) return; // guard double submit
    setView("comparison");
    chatRef.current?.clearChat();
    analyze(async (data) => {
      // point chat at the freshly created analysis and refresh history
      setActiveId(data.analysis_id || null);
      chatRef.current?.setAnalysisId(data.analysis_id || "default");
      try { await resetChat(data.analysis_id || "default"); } catch { /* ignore */ }
      refreshHistory();
    });
  };

  // Open a saved analysis: load cards, re-hydrate RAG, point chat at it.
  const handleOpenAnalysis = useCallback(async (item) => {
    if (loadingId || isProcessing) return; // prevent repeat clicks
    setLoadingId(item.id);
    setView("comparison");
    try {
      const full = await loadAnalysis(item.id);
      loadVideos(full.video_a, full.video_b);
      setActiveId(full.id);
      chatRef.current?.clearChat();
      chatRef.current?.setAnalysisId(full.id);
      toast.success("Analysis loaded.");
    } catch (err) {
      toast.error(err?.message || "Could not load analysis.");
    } finally {
      setLoadingId(null);
    }
  }, [loadingId, isProcessing, loadVideos]);

  const handleReset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      await resetChat(activeId || "default");
      chatRef.current?.clearChat();
      reset();
      setActiveId(null);
      setView("comparison");
      try { localStorage.removeItem(LAST_KEY); } catch { /* ignore */ }
      toast.success("New comparison ready.");
    } catch {
      toast.error("Failed to reset.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = async () => {
    if (isResetting) return;
    await logout();
    router.replace("/login");
  };

  const hasData = !!(videoA && videoB);
  const showWork = hasData || isProcessing;
  const winner =
    hasData && videoA.engagement_rate !== videoB.engagement_rate
      ? (videoA.engagement_rate > videoB.engagement_rate ? "A" : "B")
      : null;

  const inputBase = {
    flex: 1, background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 9,
    padding: "0 12px 0 36px", height: 38, fontSize: 13.5, color: C.text,
    outline: "none", width: "100%", fontFamily: "inherit",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
  };
  const focusHandlers = {
    onFocus: (e) => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(94,106,210,0.25)"; e.currentTarget.style.borderColor = "rgba(94,106,210,0.5)"; },
    onBlur: (e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = C.border; },
  };

  if (loading || !user) {
    return (
      <div style={{ height: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={22} color={C.blue} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  const initials = (user.name || user.email || "?").trim().charAt(0).toUpperCase();

  const navItems = [
    { key: "comparison", icon: BarChart3, label: "Comparison" },
    { key: "history", icon: Inbox, label: "History" },
    { key: "insights", icon: Sparkles, label: "Insights" },
  ];

  return (
    <div className="dash-shell" style={{ height: "100vh", background: C.bg, color: C.text, display: "grid", gridTemplateColumns: "232px 1fr 400px", overflow: "hidden" }}>

      {/* ════════ LEFT SIDEBAR ════════ */}
      <aside className="dash-sidebar" style={{ background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "14px 14px 10px", display: "flex", alignItems: "center", gap: 9 }}>
          <Logo size={24} withWordmark />
        </div>

        <div style={{ padding: "6px 10px" }}>
          <button onClick={handleReset} disabled={isResetting || isProcessing}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontWeight: 500, cursor: (isResetting || isProcessing) ? "not-allowed" : "pointer", opacity: (isResetting || isProcessing) ? 0.6 : 1, fontFamily: "inherit" }}>
            {isResetting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
            {isResetting ? "Resetting…" : "New comparison"}
          </button>
        </div>

        <nav style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map((n) => {
            const active = view === n.key;
            return (
              <button key={n.key} onClick={() => setView(n.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", borderRadius: 7,
                  fontSize: 13, color: active ? C.text : C.dim, textAlign: "left",
                  background: active ? "rgba(255,255,255,0.06)" : "transparent", cursor: "pointer",
                  border: "none", fontFamily: "inherit", width: "100%",
                }}>
                <n.icon size={15} color={active ? C.blue : C.dim} /> {n.label}
                {n.key === "history" && history.length > 0 && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: C.dimmer }}>{history.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "14px 16px 6px" }}>
          <div className="text-label-uppercase" style={{ fontSize: 10, color: C.dimmer, letterSpacing: "0.6px" }}>Recent</div>
        </div>
        <div className="scroll-thin" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 10px" }}>
          {loadingHistory ? (
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.dimmer, padding: "6px 10px" }}>
              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Loading…
            </div>
          ) : history.length === 0 ? (
            <div style={{ fontSize: 12, color: C.dimmer, padding: "4px 10px" }}>No analyses yet.</div>
          ) : (
            history.slice(0, 20).map((h) => {
              const isActive = activeId === h.id;
              const isLoading = loadingId === h.id;
              return (
                <button key={h.id} onClick={() => handleOpenAnalysis(h)}
                  disabled={!!loadingId || isProcessing}
                  title={`${h.video_a?.creator || "?"} vs ${h.video_b?.creator || "?"}`}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                    borderRadius: 7, cursor: (loadingId || isProcessing) ? "wait" : "pointer",
                    color: isActive ? C.text : C.dim, fontSize: 12.5, textAlign: "left",
                    background: isActive ? "rgba(94,106,210,0.12)" : "transparent",
                    border: isActive ? "1px solid rgba(94,106,210,0.25)" : "1px solid transparent",
                    fontFamily: "inherit", opacity: (loadingId && !isLoading) ? 0.5 : 1,
                  }}>
                  {isLoading
                    ? <Loader2 size={12} color={C.blue} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                    : <Star size={12} color={isActive ? C.blue : C.dimmer} style={{ flexShrink: 0 }} />}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {h.video_a?.creator || "?"} vs {h.video_b?.creator || "?"}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* user footer */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 10, display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#5e6ad2,#30d158)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{initials}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name || "Creator"}</div>
            <div style={{ fontSize: 11, color: C.dimmer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
          </div>
          <button onClick={handleLogout} title="Log out"
            style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", padding: 6, display: "flex" }}>
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* ════════ CENTER ════════ */}
      <main className="dash-center" style={{ minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        <div aria-hidden style={{ position: "absolute", top: -160, left: "50%", transform: "translateX(-50%)", width: 700, height: 300, background: "radial-gradient(ellipse at center, rgba(94,106,210,0.10), transparent 70%)", filter: "blur(20px)", pointerEvents: "none", zIndex: 0 }} />

        {/* breadcrumb header */}
        <div style={{ height: 48, flexShrink: 0, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, padding: "0 18px", background: "rgba(8,9,10,0.6)", backdropFilter: "blur(12px)", zIndex: 2 }}>
          {view === "history" ? <Inbox size={15} color={C.dim} /> : view === "insights" ? <Sparkles size={15} color={C.dim} /> : <BarChart3 size={15} color={C.dim} />}
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>
            {view === "history" ? "History" : view === "insights" ? "Insights" : "Comparison"}
          </span>
          {view === "comparison" && hasData && (
            <>
              <ChevronRight size={13} color={C.dimmer} />
              <span style={{ fontSize: 13, color: C.dim }}>{videoA?.creator} vs {videoB?.creator}</span>
            </>
          )}
          <span style={{ marginLeft: "auto" }}>
            {view === "comparison" && hasData && (
              <span style={{ fontSize: 10.5, color: "#30d158", background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.2)", borderRadius: 7, padding: "3px 9px", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <CheckCircle size={11} /> Indexed in Qdrant
              </span>
            )}
          </span>
        </div>

        {/* URL form — only in Comparison view */}
        {view === "comparison" && (
        <form onSubmit={handleAnalyze} style={{ flexShrink: 0, display: "flex", gap: 8, padding: "12px 18px", borderBottom: `1px solid ${C.borderSoft}`, position: "relative", zIndex: 2 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex", pointerEvents: "none" }}><YoutubeInputIcon /></span>
            <input type="url" required disabled={isProcessing} placeholder="YouTube URL…" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} style={inputBase} {...focusHandlers} />
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex", pointerEvents: "none" }}><InstagramInputIcon /></span>
            <input type="url" required disabled={isProcessing} placeholder="Instagram Reel URL…" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} style={inputBase} {...focusHandlers} />
          </div>
          <motion.button type="submit" disabled={isProcessing} whileHover={!isProcessing ? { background: "#6b77e0" } : {}} whileTap={!isProcessing ? { scale: 0.98 } : {}}
            style={{ height: 38, padding: "0 16px", background: C.blue, border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 500, color: "#fff", cursor: isProcessing ? "not-allowed" : "pointer", opacity: isProcessing ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7, flexShrink: 0, whiteSpace: "nowrap", fontFamily: "inherit" }}>
            {isProcessing ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Analyzing…</> : "Analyze"}
          </motion.button>
        </form>
        )}
        <ProcessingBar isProcessing={isProcessing} />
        <AnimatePresence>
          {isProcessing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ padding: "6px 18px", overflow: "hidden", flexShrink: 0 }}>
              <motion.p key={processingStep} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} style={{ fontSize: 12, color: C.dim, margin: 0 }}>{processingStep}</motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* content area (scrolls) — view-aware */}
        <div className="scroll-thin" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 18, position: "relative", zIndex: 1 }}>

          {/* ── HISTORY VIEW ── */}
          {view === "history" && (
            <div style={{ maxWidth: 820, margin: "0 auto" }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: "4px 0 4px" }}>Your analyses</h2>
              <p style={{ fontSize: 13, color: C.dim, margin: "0 0 18px" }}>Click any comparison to reopen it and chat against its data.</p>
              {loadingHistory ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.dim, fontSize: 13 }}>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading history…
                </div>
              ) : history.length === 0 ? (
                <div style={{ fontSize: 13, color: C.dimmer }}>No analyses yet. Run your first comparison.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {history.map((h) => {
                    const isLoading = loadingId === h.id;
                    const isActive = activeId === h.id;
                    return (
                      <button key={h.id} onClick={() => handleOpenAnalysis(h)} disabled={!!loadingId || isProcessing}
                        style={{
                          display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", textAlign: "left",
                          background: isActive ? "rgba(94,106,210,0.1)" : C.panel,
                          border: `1px solid ${isActive ? "rgba(94,106,210,0.3)" : C.border}`,
                          borderRadius: 12, cursor: (loadingId || isProcessing) ? "wait" : "pointer",
                          fontFamily: "inherit", color: C.text, opacity: (loadingId && !isLoading) ? 0.5 : 1,
                        }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(94,106,210,0.12)", border: "1px solid rgba(94,106,210,0.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {isLoading ? <Loader2 size={15} color={C.blue} style={{ animation: "spin 1s linear infinite" }} /> : <BarChart3 size={15} color={C.blue} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>
                            {h.video_a?.creator || "?"} <span style={{ color: C.dimmer, fontWeight: 400 }}>vs</span> {h.video_b?.creator || "?"}
                          </div>
                          <div style={{ fontSize: 12, color: C.dim }}>
                            A {h.video_a?.engagement_rate ?? 0}% · B {h.video_b?.engagement_rate ?? 0}% · {h.chunks_stored || 0} chunks
                          </div>
                        </div>
                        <ChevronRight size={16} color={C.dimmer} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── INSIGHTS VIEW ── */}
          {view === "insights" && (
            <div style={{ maxWidth: 820, margin: "0 auto" }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: "4px 0 4px" }}>Insights</h2>
              <p style={{ fontSize: 13, color: C.dim, margin: "0 0 18px" }}>A quick read on your current comparison.</p>
              {!hasData ? (
                <div style={{ fontSize: 13, color: C.dimmer }}>Open or run a comparison to see insights.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
                  {[
                    { label: "Winner", value: winner ? (winner === "A" ? videoA.creator : videoB.creator) : "Tie", sub: "by engagement rate" },
                    { label: "Video A engagement", value: `${videoA.engagement_rate}%`, sub: `${videoA.creator}` },
                    { label: "Video B engagement", value: `${videoB.engagement_rate}%`, sub: `${videoB.creator}` },
                    { label: "Combined reach", value: `${((videoA.views + videoB.views) / 1_000_000).toFixed(1)}M`, sub: "total views" },
                  ].map((c) => (
                    <div key={c.label} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                      <div className="text-label-uppercase" style={{ fontSize: 10, color: C.dimmer, marginBottom: 8 }}>{c.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.4px" }}>{c.value}</div>
                      <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{c.sub}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── COMPARISON VIEW ── */}
          {view === "comparison" && (
            !showWork && !hasData ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 20px" }}>
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{ marginBottom: 22 }}>
                  <Logo size={64} />
                </motion.div>
                <h1 style={{ fontSize: 28, fontWeight: 600, margin: "0 0 12px", letterSpacing: "-0.6px" }}>
                  Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
                </h1>
                <p style={{ fontSize: 15, color: C.dim, maxWidth: 420, lineHeight: 1.6, margin: 0 }}>
                  Paste a YouTube URL and an Instagram Reel URL above to compare metrics, transcripts, and creator strategy.
                </p>
                {restored && (
                  <div style={{ marginTop: 20, fontSize: 12, color: C.dimmer }}>
                    Last compared: <span style={{ color: C.dim }}>{restored.videoA?.creator} vs {restored.videoB?.creator}</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 1000, margin: "0 auto" }} className="cards-grid">
                {isProcessing ? (
                  <><SkeletonVideoCard /><SkeletonVideoCard /></>
                ) : (
                  <>
                    {videoA && <VideoCard key="a" video={videoA} animationDelay={0} isWinner={winner === "A"} />}
                    {videoB && <VideoCard key="b" video={videoB} animationDelay={100} isWinner={winner === "B"} />}
                  </>
                )}
              </div>
            )
          )}
        </div>
      </main>

      {/* ════════ RIGHT CHAT PANEL ════════ */}
      <aside className="dash-chat" style={{ borderLeft: `1px solid ${C.border}`, minHeight: 0, overflow: "hidden" }}>
        <ChatInterface ref={chatRef} />
      </aside>

      <style>{`
        .scroll-thin::-webkit-scrollbar { width: 8px; }
        .scroll-thin::-webkit-scrollbar-thumb { background-color: #2a2b2e; border-radius: 9999px; }
        .scroll-thin::-webkit-scrollbar-thumb:hover { background-color: #3a3b3e; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media (max-width: 1180px) {
          .dash-shell { grid-template-columns: 200px 1fr 340px !important; }
        }
        @media (max-width: 980px) {
          .dash-shell { display: flex !important; flex-direction: column !important; height: auto !important; min-height: 100vh; overflow: visible !important; }
          .dash-sidebar { display: none !important; }
          .dash-center { min-height: 70vh; }
          .dash-chat { height: 560px; border-left: none !important; border-top: 1px solid rgba(255,255,255,0.08); }
          .cards-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
