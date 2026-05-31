'use client';

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * ProcessingBar — a 2px full-width indeterminate progress bar shown beneath the
 * URL inputs while processing. A gradient sweeps left→right on a 3s loop.
 * Communicates "something is happening" without occupying real layout space —
 * the same pattern Safari uses in its URL bar during page loads.
 */
export default function ProcessingBar({ isProcessing }) {
  return (
    <AnimatePresence>
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-hidden="true"
          style={{
            position: "relative",
            height: 2,
            width: "100%",
            overflow: "hidden",
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: "40%",
              background:
                "linear-gradient(90deg, transparent, #0071e3, transparent)",
              animation: "bar-sweep 3s ease-in-out infinite",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
