'use client';

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ExternalLink } from "lucide-react";
import clsx from "clsx";

/* ─── Citation pill with Radix tooltip ─── */
function CitationPill({ cit, index }) {
  const label = `${cit.video_id}:${cit.chunk_index ?? index}`;
  const preview = cit.content
    ? cit.content.slice(0, 150) + (cit.content.length > 150 ? "…" : "")
    : null;
  const isA = cit.video_id === "A";

  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <a
            href={cit.url || "#"}
            target={cit.url ? "_blank" : undefined}
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              background: "#1a1a1a",
              border: `1px solid ${isA ? "rgba(0,113,227,0.3)" : "rgba(48,209,88,0.3)"}`,
              borderRadius: 6,
              fontSize: 11,
              color: isA ? "#0071e3" : "#30d158",
              fontWeight: 500,
              textDecoration: "none",
              cursor: "pointer",
              transition: "background 150ms ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#222222"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#1a1a1a"; }}
          >
            [{label}]
            {cit.url && <ExternalLink size={9} style={{ opacity: 0.6 }} />}
          </a>
        </Tooltip.Trigger>

        {preview && (
          <Tooltip.Portal>
            <Tooltip.Content
              className="TooltipContent"
              sideOffset={6}
              side="top"
              align="start"
              style={{
                background: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "12px 14px",
                maxWidth: 280,
                fontSize: 12,
                color: "#86868b",
                lineHeight: 1.5,
                boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
                zIndex: 9999,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 600, color: isA ? "#0071e3" : "#30d158", marginBottom: 5, letterSpacing: "0.8px", textTransform: "uppercase" }}>
                Video {cit.video_id} · Chunk {cit.chunk_index ?? index}
                {cit.timestamp && ` · ${cit.timestamp}`}
              </div>
              {preview}
              <Tooltip.Arrow style={{ fill: "#1a1a1a" }} />
            </Tooltip.Content>
          </Tooltip.Portal>
        )}
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/* ─── Blinking cursor ─── */
function BlinkCursor() {
  return (
    <span
      className="blink-cursor"
      style={{
        display: "inline-block",
        width: 2,
        height: 16,
        background: "#0071e3",
        borderRadius: 1,
        marginLeft: 2,
        verticalAlign: "middle",
      }}
    />
  );
}

/* ─── Typing indicator ─── */
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "4px 0", alignItems: "center" }}>
      {[0, 0.15, 0.3].map((delay, i) => (
        <motion.span
          key={i}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay, ease: "easeInOut" }}
          style={{ width: 6, height: 6, background: "#48484a", borderRadius: "50%", display: "inline-block" }}
        />
      ))}
    </div>
  );
}

/* ─── Custom Markdown Helpers ─── */
function InlineRenderer({ text }) {
  if (!text) return null;
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index} style={{ fontWeight: 600, color: "#ffffff" }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={index} style={{ fontStyle: "italic", color: "#e5e5ea" }}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={index}
              style={{
                fontFamily: "monospace",
                background: "rgba(255,255,255,0.08)",
                padding: "2px 5px",
                borderRadius: "4px",
                fontSize: "12px",
                color: "#ff453a",
              }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}

function MarkdownRenderer({ text, showCursor }) {
  if (!text) return null;
  const lines = text.split("\n");
  const blocks = [];
  let currentList = null;

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push({ type: "h3", text: trimmed.slice(4) });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push({ type: "h2", text: trimmed.slice(3) });
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      blocks.push({ type: "h1", text: trimmed.slice(2) });
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(trimmed.slice(2));
      continue;
    }

    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    if (trimmed === "") {
      flushList();
      continue;
    }

    flushList();
    blocks.push({ type: "p", text: line });
  }
  flushList();

  const lastBlockIdx = blocks.length - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {blocks.map((block, index) => {
        const isLast = index === lastBlockIdx;
        const blockShowCursor = isLast && showCursor;

        switch (block.type) {
          case "h1":
            return (
              <h1 key={index} style={{ fontSize: "18px", fontWeight: 600, color: "#f5f5f7", margin: "12px 0 6px", lineHeight: 1.3 }}>
                <InlineRenderer text={block.text} />
                {blockShowCursor && <BlinkCursor />}
              </h1>
            );
          case "h2":
            return (
              <h2 key={index} style={{ fontSize: "16px", fontWeight: 600, color: "#f5f5f7", margin: "10px 0 4px", lineHeight: 1.3 }}>
                <InlineRenderer text={block.text} />
                {blockShowCursor && <BlinkCursor />}
              </h2>
            );
          case "h3":
            return (
              <h3 key={index} style={{ fontSize: "14px", fontWeight: 600, color: "#f5f5f7", margin: "8px 0 2px", lineHeight: 1.3 }}>
                <InlineRenderer text={block.text} />
                {blockShowCursor && <BlinkCursor />}
              </h3>
            );
          case "ul":
            return (
              <ul key={index} style={{ margin: "4px 0 8px", paddingLeft: "20px", listStyleType: "disc" }}>
                {block.items.map((item, itemIdx) => {
                  const isLastItem = itemIdx === block.items.length - 1;
                  return (
                    <li key={itemIdx} style={{ marginBottom: "4px", color: "#f5f5f7" }}>
                      <InlineRenderer text={item} />
                      {blockShowCursor && isLastItem && <BlinkCursor />}
                    </li>
                  );
                })}
              </ul>
            );
          case "ol":
            return (
              <ol key={index} style={{ margin: "4px 0 8px", paddingLeft: "20px", listStyleType: "decimal" }}>
                {block.items.map((item, itemIdx) => {
                  const isLastItem = itemIdx === block.items.length - 1;
                  return (
                    <li key={itemIdx} style={{ marginBottom: "4px", color: "#f5f5f7" }}>
                      <InlineRenderer text={item} />
                      {blockShowCursor && isLastItem && <BlinkCursor />}
                    </li>
                  );
                })}
              </ol>
            );
          case "p":
          default:
            return (
              <p key={index} style={{ margin: 0, lineHeight: 1.6 }}>
                <InlineRenderer text={block.text} />
                {blockShowCursor && <BlinkCursor />}
              </p>
            );
        }
      })}
    </div>
  );
}

/* ─── MessageBubble ─── */
export default function MessageBubble({ message }) {
  const isUser = message.sender === "user";
  const streaming = message.isStreaming;
  const hasCitations = message.citations?.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
        alignSelf: isUser ? "flex-end" : "flex-start",
        gap: 6,
      }}
    >
      {/* Sender label */}
      <span style={{ fontSize: 9, fontWeight: 600, color: "#48484a", textTransform: "uppercase", letterSpacing: "0.8px", padding: "0 4px" }}>
        {isUser ? "You" : "CreatorLens AI"}
      </span>

      {/* Bubble */}
      <div style={{
        padding: "12px 16px",
        borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
        background: isUser ? "#0071e3" : "#111111",
        color: "#f5f5f7",
        fontSize: 14,
        lineHeight: 1.65,
        wordBreak: "break-word",
      }}>
        {/* Typing dots — before first token */}
        {streaming && !message.text && <TypingDots />}

        {/* Message text rendered as beautiful markdown */}
        <MarkdownRenderer text={message.text} showCursor={streaming && !!message.text} />
      </div>

      {/* Citations */}
      {!isUser && hasCitations && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ padding: "0 4px" }}
        >
          <div style={{ fontSize: 9, fontWeight: 600, color: "#48484a", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 6 }}>
            Sources
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {message.citations.map((cit, i) => (
              <CitationPill key={i} cit={cit} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
