'use client';

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, RefreshCw, Loader2, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import VideoCard from "../components/VideoCard";
import SkeletonVideoCard from "../components/SkeletonVideoCard";
import ChatInterface from "../components/ChatInterface";
import clsx from "clsx";

/* ─── Processing step messages ─── */
const STEPS = [
  { delay: 0,     text: "Initializing pipeline…" },
  { delay: 3000,  text: "Fetching YouTube metadata & transcript…" },
  { delay: 8000,  text: "Scraping Instagram post metadata…" },
  { delay: 14000, text: "Downloading Reel audio via yt-dlp…" },
  { delay: 20000, text: "Transcribing audio via Groq Whisper…" },
  { delay: 42000, text: "Generating semantic embeddings…" },
  { delay: 58000, text: "Indexing chunks to ChromaDB…" },
];

/* ─── SVG icons for inputs ─── */
const YoutubeInputIcon = () => (
  <svg viewBox="0 0 24 24" fill="#ff3333" width="15" height="15">
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.388.51a3.002 3.002 0 0 0-2.11 2.108C0 8.029 0 12 0 12s0 3.972.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.863.51 9.388.51 9.388.51s7.525 0 9.388-.51a3.002 3.002 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.971-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const InstagramInputIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
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

/* ─── Page ─── */
export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [videoA, setVideoA] = useState(null);
  const [videoB, setVideoB] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const stepTimers = useRef([]);

  const clearTimers = () => { stepTimers.current.forEach(clearTimeout); stepTimers.current = []; };

  const startSteps = () => {
    clearTimers();
    STEPS.forEach(({ delay, text }) => {
      const t = setTimeout(() => setProcessingStep(text), delay);
      stepTimers.current.push(t);
    });
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!youtubeUrl.trim() || !instagramUrl.trim() || isProcessing) return;

    setIsProcessing(true);
    startSteps();
    const tid = toast.loading("Analyzing videos… (30–90 seconds)");

    try {
      const res = await fetch("http://localhost:8000/api/videos/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_url: youtubeUrl.trim(), instagram_url: instagramUrl.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      setVideoA(data.video_a);
      setVideoB(data.video_b);
      const total = (data.video_a.chunks_stored || 0) + (data.video_b.chunks_stored || 0);
      toast.success(`Done! ${total} chunks indexed in ChromaDB.`, { id: tid });
    } catch (err) {
      toast.error(err.message || "Processing failed. Check backend logs.", { id: tid });
    } finally {
      clearTimers();
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await fetch("http://localhost:8000/api/chat/reset", { method: "POST" });
      setVideoA(null);
      setVideoB(null);
      setYoutubeUrl("");
      setInstagramUrl("");
      toast.success("Session reset.");
    } catch {
      toast.error("Failed to reset.");
    } finally {
      setIsResetting(false);
    }
  };

  const hasData = !!(videoA && videoB);
  const showDashboard = hasData || isProcessing;

  /* Shared input style */
  const inputBase = {
    flex: 1,
    background: "#111111",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "0 14px 0 40px",
    height: 44,
    fontSize: 14,
    color: "#f5f5f7",
    outline: "none",
    width: "100%",
    fontFamily: "inherit",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
  };

  const focusHandlers = {
    onFocus: (e) => {
      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,113,227,0.3)";
      e.currentTarget.style.borderColor = "rgba(0,113,227,0.5)";
    },
    onBlur: (e) => {
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
    },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#f5f5f7", display: "flex", flexDirection: "column" }}>

      {/* ══ TOP BAR ══ */}
      <div style={{
        background: "#0a0a0a",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky", top: 0, zIndex: 40,
      }}>

        {/* Logo row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", height: 52,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: "linear-gradient(135deg,#0071e3,#30d158)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
            }}>
              <Eye size={18} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 600, color: "#f5f5f7" }}>CreatorLens</span>
            <span style={{
              fontSize: 10, fontWeight: 500, color: "#86868b",
              background: "#111", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6, padding: "1px 7px",
            }}>RAG v1.0</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: 7, height: 7, borderRadius: "50%", background: "#30d158", display: "inline-block" }}
              />
              <span style={{ fontSize: 11, color: "#86868b" }}>System Ready</span>
            </div>

            {hasData && (
              <motion.button
                whileHover={{ color: "#f5f5f7" }}
                whileTap={{ scale: 0.97 }}
                onClick={handleReset}
                disabled={isResetting}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px",
                  background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, fontSize: 12, fontWeight: 500, color: "#86868b",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={13} />
                {isResetting ? "Resetting…" : "Reset Session"}
              </motion.button>
            )}
          </div>
        </div>

        {/* URL form row */}
        <form onSubmit={handleAnalyze} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "0 20px", height: 60,
        }}>
          {/* YouTube */}
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              display: "flex", alignItems: "center", pointerEvents: "none",
            }}>
              <YoutubeInputIcon />
            </span>
            <input
              type="url" required disabled={isProcessing}
              placeholder="https://www.youtube.com/watch?v=…"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              style={inputBase}
              {...focusHandlers}
            />
          </div>

          {/* Instagram */}
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              display: "flex", alignItems: "center", pointerEvents: "none",
            }}>
              <InstagramInputIcon />
            </span>
            <input
              type="url" required disabled={isProcessing}
              placeholder="https://www.instagram.com/reel/…"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              style={inputBase}
              {...focusHandlers}
            />
          </div>

          {/* Analyze button */}
          <motion.button
            type="submit"
            disabled={isProcessing}
            whileHover={!isProcessing ? { background: "#0077ed", scale: 1.01 } : {}}
            whileTap={!isProcessing ? { scale: 0.99 } : {}}
            style={{
              height: 44, padding: "0 20px",
              background: "#0071e3", border: "none", borderRadius: 12,
              fontSize: 14, fontWeight: 500, color: "#fff",
              cursor: isProcessing ? "not-allowed" : "pointer",
              opacity: isProcessing ? 0.7 : 1,
              display: "flex", alignItems: "center", gap: 8,
              flexShrink: 0, whiteSpace: "nowrap",
            }}
          >
            {isProcessing
              ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Analyzing…</>
              : "Analyze Videos"
            }
          </motion.button>
        </form>

        {/* Progress bar + step */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ padding: "6px 20px 10px", overflow: "hidden" }}
            >
              <div style={{
                height: 2, background: "rgba(255,255,255,0.06)",
                borderRadius: 1, overflow: "hidden", marginBottom: 6,
              }}>
                <div
                  className="indeterminate-bar"
                  style={{
                    height: "100%", width: "20%",
                    background: "linear-gradient(90deg, transparent, #0071e3, transparent)",
                  }}
                />
              </div>
              <motion.p
                key={processingStep}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ fontSize: 12, color: "#86868b", margin: 0 }}
              >
                {processingStep}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      {!showDashboard ? (
        /* Landing */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "60px 20px", textAlign: "center",
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 72, height: 72,
              background: "linear-gradient(135deg, rgba(0,113,227,0.12), rgba(48,209,88,0.12))",
              border: "1px solid rgba(0,113,227,0.2)",
              borderRadius: 22,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 24, color: "#0071e3",
            }}
          >
            <Eye size={28} />
          </motion.div>

          <h1 style={{ fontSize: 36, fontWeight: 600, color: "#f5f5f7", margin: "0 0 14px", letterSpacing: "-0.5px" }}>
            Analyze Social Growth with RAG
          </h1>
          <p style={{ fontSize: 16, color: "#86868b", maxWidth: 480, lineHeight: 1.6, margin: 0 }}>
            Enter a YouTube URL and Instagram Reel URL above to compare their transcripts,
            engagement metrics, and creator strategy using AI.
          </p>
        </motion.div>

      ) : (
        /* Dashboard — 2-column */
        <div style={{
          flex: 1, display: "grid",
          gridTemplateColumns: "1fr 480px",
          minHeight: 0,
        }}>
          {/* Left: cards */}
          <div style={{ overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 600, color: "#f5f5f7", margin: "0 0 2px" }}>Comparison</h2>
                <p style={{ fontSize: 13, color: "#86868b", margin: 0 }}>
                  {isProcessing ? processingStep || "Processing…" : "Live metrics from scraped data"}
                </p>
              </div>
              {hasData && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    fontSize: 11, color: "#30d158",
                    background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.2)",
                    borderRadius: 6, padding: "3px 10px", fontWeight: 500,
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <CheckCircle size={12} /> Indexed in ChromaDB
                </motion.span>
              )}
            </div>

            {isProcessing ? (
              <>
                <SkeletonVideoCard />
                <SkeletonVideoCard />
              </>
            ) : (
              <AnimatePresence>
                {videoA && <VideoCard key="a" video={videoA} animationDelay={0} />}
                {videoB && <VideoCard key="b" video={videoB} animationDelay={100} />}
              </AnimatePresence>
            )}
          </div>

          {/* Right: chat */}
          <div style={{ position: "sticky", top: 0, height: "calc(100vh - 114px)", overflow: "hidden" }}>
            <ChatInterface />
          </div>
        </div>
      )}

      {/* Responsive: stack on < 1024px */}
      <style>{`
        @media (max-width: 1023px) {
          [style*="grid-template-columns: 1fr 480px"] {
            grid-template-columns: 1fr !important;
          }
          [style*="position: sticky; top: 0; height: calc(100vh - 114px)"] {
            position: relative !important;
            height: 520px !important;
          }
        }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
