'use client';

import React from "react";
import { motion } from "framer-motion";

/**
 * EmptyState — centered placeholder shown in the chat panel before any messages.
 * Three concentric rings ripple outward (radar effect) with staggered delays,
 * then a prompt and the clickable suggestion chips.
 */
export default function EmptyState({ suggestions = [], onPick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      {/* Radar ripple icon */}
      <div style={{ position: "relative", width: 56, height: 56 }}>
        {[0, 0.8, 1.6].map((delay, i) => (
          <span
            key={i}
            className="pulse-ring"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 56,
              height: 56,
              marginTop: -28,
              marginLeft: -28,
              borderRadius: "50%",
              border: "1px solid rgba(0,113,227,0.5)",
              animationDelay: `${delay}s`,
            }}
          />
        ))}
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 12,
            height: 12,
            marginTop: -6,
            marginLeft: -6,
            borderRadius: "50%",
            background: "#0071e3",
            opacity: 0.7,
          }}
        />
      </div>

      <p style={{ fontSize: 15, color: "#86868b", margin: 0 }}>
        Ask about the videos
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {suggestions.map((s, i) => (
          <motion.button
            key={i}
            className="scale-in"
            whileHover={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.2)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPick?.(s)}
            style={{
              animationDelay: `${i * 60}ms`,
              background: "#111111",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 12,
              color: "#cccccc",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {s}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
