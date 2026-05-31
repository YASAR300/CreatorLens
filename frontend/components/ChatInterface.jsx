'use client';

import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { motion } from "framer-motion";
import { Send, Square, Zap } from "lucide-react";
import MessageBubble from "./MessageBubble";
import EmptyState from "./EmptyState";
import { useStreamingChat } from "../hooks/useStreamingChat";

const SUGGESTIONS = [
  "Why did Video A get more engagement?",
  "Compare the hooks in the first 5 seconds",
  "What's the engagement rate of each video?",
  "Who created Video B and their followers?",
  "Suggest 3 improvements for Video B",
];

/**
 * ChatInterface — pure rendering layer. All stream logic lives in
 * useStreamingChat. Exposes clearChat() to the parent via ref so a new
 * analysis can wipe the conversation.
 */
function ChatInterface(_props, ref) {
  const { messages, isStreaming, sendMessage, stopStreaming, retryLast, clearChat, setAnalysisId } =
    useStreamingChat();
  const [input, setInput] = useState("");

  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  // Tracks whether the user is pinned near the bottom (controls auto-scroll).
  const stickToBottom = useRef(true);

  useImperativeHandle(ref, () => ({ clearChat, setAnalysisId }), [clearChat, setAnalysisId]);

  /* Smart auto-scroll: only follow new content if the user is near the bottom.
     If they scrolled up to read history, don't yank them back down. */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  useEffect(() => {
    if (stickToBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  /* Auto-resize textarea (1–4 rows) */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }, [input]);

  const submit = useCallback(
    (textOverride) => {
      const q = (textOverride ?? input).trim();
      if (!q || isStreaming) return;
      stickToBottom.current = true; // jump to the new turn
      sendMessage(q);
      setInput("");
    },
    [input, isStreaming, sendMessage]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const isEmpty = !input.trim();

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#060606",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* ── Header ── */}
      <div style={{
        height: 54, padding: "0 22px", flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(10,10,10,0.6)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8,
            background: "rgba(0,113,227,0.12)", border: "1px solid rgba(0,113,227,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Zap size={13} color="#0071e3" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#f5f5f7", letterSpacing: "-0.2px" }}>Creator Chat</span>
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
          <span style={{ fontSize: 11, color: "#86868b" }}>Groq · Llama 3.3 70B</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: "auto",
          padding: "20px 0",
        }}
      >
        <div style={{
          maxWidth: 720, margin: "0 auto", padding: "0 24px",
          display: "flex", flexDirection: "column", gap: 14,
          minHeight: "100%",
        }}>
          {messages.length === 0 ? (
            <EmptyState suggestions={SUGGESTIONS} onPick={submit} />
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onRetry={msg.error ? retryLast : undefined}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Quick chips (persistent after first message) ── */}
      {messages.length > 0 && !isStreaming && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            maxWidth: 720, margin: "0 auto", padding: "8px 24px",
            display: "flex", flexWrap: "wrap", gap: 6,
          }}>
            {SUGGESTIONS.slice(0, 3).map((s, i) => (
              <motion.button
                key={i}
                whileHover={{ background: "rgba(255,255,255,0.08)" }}
                whileTap={{ scale: 0.97 }}
                onClick={() => submit(s)}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, padding: "5px 12px",
                  fontSize: 11, color: "#86868b", cursor: "pointer",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  maxWidth: 220, fontFamily: "inherit",
                }}
              >
                {s}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input area ── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(10,10,10,0.6)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
      }}>
        <div style={{
          maxWidth: 720, margin: "0 auto", padding: "14px 24px",
          display: "flex", gap: 10, alignItems: "flex-end",
        }}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder={isStreaming ? "Generating response…" : "Ask anything about the videos…"}
            className="apple-focus"
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
              padding: "12px 16px",
              fontSize: 14,
              color: "#f5f5f7",
              resize: "none",
              outline: "none",
              minHeight: 46,
              maxHeight: 120,
              overflowY: "auto",
              fontFamily: "inherit",
              lineHeight: 1.5,
              transition: "border-color 150ms ease",
            }}
          />

          <motion.button
            whileHover={isStreaming || !isEmpty ? { background: "#0077ed" } : {}}
            whileTap={isStreaming || !isEmpty ? { scale: 0.93 } : {}}
            onClick={isStreaming ? stopStreaming : () => submit()}
            style={{
              width: 38, height: 38, flexShrink: 0,
              background: "#0071e3", border: "none", borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#ffffff",
              cursor: isStreaming ? "pointer" : isEmpty ? "default" : "pointer",
              opacity: !isStreaming && isEmpty ? 0.3 : 1,
              transition: "opacity 150ms ease",
              pointerEvents: !isStreaming && isEmpty ? "none" : "auto",
              boxShadow: !isEmpty || isStreaming ? "0 2px 12px rgba(0,113,227,0.35)" : "none",
            }}
          >
            {isStreaming ? <Square size={14} /> : <Send size={14} />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default forwardRef(ChatInterface);
