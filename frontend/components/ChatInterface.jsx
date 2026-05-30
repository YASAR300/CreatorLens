'use client';

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Square, Zap } from "lucide-react";
import clsx from "clsx";
import MessageBubble from "./MessageBubble";

const SUGGESTIONS = [
  "Why did Video A get more engagement?",
  "Compare the hooks in the first 5 seconds",
  "What's the engagement rate of each video?",
  "Who created Video B and their followers?",
  "Suggest 3 improvements for Video B",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const readerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  /* Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Auto-resize textarea (1–4 rows) */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }, [input]);

  const stopStream = useCallback(() => {
    readerRef.current?.cancel();
    readerRef.current = null;
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  }, []);

  const handleSend = useCallback(async (textOverride) => {
    const query = (textOverride ?? input).trim();
    if (!query || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    const userMsg = { id: `u-${Date.now()}`, sender: "user", text: query };
    const botId = `b-${Date.now()}`;
    const botMsg = { id: botId, sender: "bot", text: "", citations: [], isStreaming: true };

    setMessages((prev) => [...prev, userMsg, botMsg]);

    try {
      const res = await fetch("http://localhost:8000/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";
      let pendingEvent = null;
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) buffer += decoder.decode(value, { stream: true });

        // Process all complete lines in buffer
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
            // Strip exactly "data: " (6 chars when a space follows the colon).
            // Do NOT call .trim() — LLM tokens carry their own leading space
            // (e.g. " need") and trimming merges words together.
            const data = line.startsWith("data: ") ? line.slice(6) : line.slice(5);

            if (data === "[DONE]") {
              setMessages((prev) =>
                prev.map((m) => (m.id === botId ? { ...m, isStreaming: false } : m))
              );
              setIsStreaming(false);
              readerRef.current = null;
              done = true;
              break;
            }

            if (pendingEvent === "sources") {
              try {
                const sources = JSON.parse(data);
                setMessages((prev) =>
                  prev.map((m) => (m.id === botId ? { ...m, citations: sources } : m))
                );
              } catch { /* skip malformed */ }
              pendingEvent = null;
              continue;
            }

            // Try to detect error JSON
            if (data.startsWith("{")) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "error") {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === botId
                        ? { ...m, text: m.text + `\n\n[Error: ${parsed.content}]`, isStreaming: false }
                        : m
                    )
                  );
                  setIsStreaming(false);
                  readerRef.current = null;
                  done = true;
                  break;
                }
              } catch { /* not an error JSON, fall through */ }
            }

            // Regular token
            setMessages((prev) =>
              prev.map((m) => (m.id === botId ? { ...m, text: m.text + data } : m))
            );
            pendingEvent = null;
          }
        }
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? { ...m, text: m.text || "Connection failed. Is the backend running on port 8000?", isStreaming: false }
              : m
          )
        );
      }
      setIsStreaming(false);
      readerRef.current = null;
    }
  }, [input, isStreaming]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = !input.trim();

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#0a0a0a",
      borderLeft: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>

      {/* ── Header ── */}
      <div style={{
        height: 56, padding: "0 20px", flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={15} color="#0071e3" />
          <span style={{ fontSize: 15, fontWeight: 500, color: "#f5f5f7" }}>Creator Chat</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <motion.span
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 7, height: 7, borderRadius: "50%",
              background: isStreaming ? "#0071e3" : "#30d158",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 11, color: "#86868b" }}>
            Groq · Llama 3.3 70B
          </span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: 16, display: "flex", flexDirection: "column", gap: 12,
      }}>
        {/* Empty state */}
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 16, padding: "40px 20px", textAlign: "center",
              }}
            >
              {/* Concentric circles icon */}
              <div style={{ position: "relative", width: 56, height: 56 }}>
                {[56, 42, 28].map((s, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    top: "50%", left: "50%",
                    transform: "translate(-50%,-50%)",
                    width: s, height: s, borderRadius: "50%",
                    border: `1px solid rgba(255,255,255,${0.06 + i * 0.04})`,
                  }} />
                ))}
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%,-50%)",
                  width: 12, height: 12, borderRadius: "50%",
                  background: "#0071e3", opacity: 0.6,
                }} />
              </div>

              <p style={{ fontSize: 15, color: "#86868b", margin: 0 }}>
                Ask anything about the videos
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.2)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSend(s)}
                    style={{
                      background: "#111111",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8, padding: "8px 14px",
                      fontSize: 12, color: "#cccccc", cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message list */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick chips (persistent after first message) ── */}
      {messages.length > 0 && !isStreaming && (
        <div style={{
          padding: "8px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexWrap: "wrap", gap: 6,
        }}>
          {SUGGESTIONS.slice(0, 3).map((s, i) => (
            <motion.button
              key={i}
              whileHover={{ background: "#1a1a1a" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSend(s)}
              style={{
                background: "#111111",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, padding: "5px 12px",
                fontSize: 11, color: "#86868b", cursor: "pointer",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: 200,
              }}
            >
              {s}
            </motion.button>
          ))}
        </div>
      )}

      {/* ── Input area ── */}
      <div style={{
        padding: 12,
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", gap: 10, alignItems: "flex-end",
      }}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder={isStreaming ? "Generating response…" : "Ask a question…"}
          className="apple-focus"
          style={{
            flex: 1,
            background: "#111111",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: "11px 14px",
            fontSize: 14,
            color: "#f5f5f7",
            resize: "none",
            outline: "none",
            minHeight: 44,
            maxHeight: 96,
            overflowY: "auto",
            fontFamily: "inherit",
            lineHeight: 1.5,
            transition: "border-color 150ms ease",
          }}
        />

        {/* Send / Stop */}
        <motion.button
          whileHover={isStreaming || !isEmpty ? { background: "#0077ed" } : {}}
          whileTap={isStreaming || !isEmpty ? { scale: 0.93 } : {}}
          onClick={isStreaming ? stopStream : () => handleSend()}
          style={{
            width: 36, height: 36, flexShrink: 0,
            background: "#0071e3", border: "none", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#ffffff",
            cursor: isStreaming ? "pointer" : isEmpty ? "default" : "pointer",
            opacity: !isStreaming && isEmpty ? 0.3 : 1,
            transition: "opacity 150ms ease",
            pointerEvents: !isStreaming && isEmpty ? "none" : "auto",
          }}
        >
          {isStreaming ? <Square size={14} /> : <Send size={14} />}
        </motion.button>
      </div>
    </div>
  );
}
