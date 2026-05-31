'use client';

import React, { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, RefreshCw, Loader2, CheckCircle, BarChart3, LogOut, Clock3, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import VideoCard from "../../components/VideoCard";
import SkeletonVideoCard from "../../components/SkeletonVideoCard";
import ChatInterface from "../../components/ChatInterface";
import ProcessingBar from "../../components/ProcessingBar";
import { useVideoProcessor } from "../../hooks/useVideoProcessor";
import { useAuth } from "../../hooks/useAuth";
import { resetChat, fetchHistory } from "../../lib/api";

const LAST_KEY = "creatorlens_last_analysis";

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

export default function Dashboard() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const {
    youtubeUrl, setYoutubeUrl,
    instagramUrl, setInstagramUrl,
    isProcessing, processingStep,
    videoA, videoB, videosLoaded,
    analyze, reset,
  } = useVideoProcessor();

  const [isResetting, setIsResetting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState([]);
  // Last analysis snapshot from localStorage (lazy init — no effect needed).
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

  // Route guard: bounce unauthenticated visitors to /login.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Load server-side history once authenticated.
  useEffect(() => {
    if (user) {
      fetchHistory().then(setHistory).catch(() => {});
    }
  }, [user]);

  // Persist the latest analysis snapshot whenever it changes.
  useEffect(() => {
    if (videoA && videoB) {
      try {
        localStorage.setItem(LAST_KEY, JSON.stringify({ videoA, videoB, ts: Date.now() }));
      } catch { /* ignore */ }
    }
  }, [videoA, videoB]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    chatRef.current?.clearChat();
    try { await resetChat(); } catch { /* non-fatal */ }
    analyze(() => {
      // refresh history after a successful run
      fetchHistory().then(setHistory).catch(() => {});
    });
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetChat();
      chatRef.current?.clearChat();
      reset();
      try { localStorage.removeItem(LAST_KEY); } catch { /* ignore */ }
      toast.success("Session reset.");
    } catch {
      toast.error("Failed to reset.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const hasData = !!(videoA && videoB);
  const showDashboard = hasData || isProcessing;

  const winner =
    hasData && videoA.engagement_rate !== videoB.engagement_rate
      ? (videoA.engagement_rate > videoB.engagement_rate ? "A" : "B")
      : null;

  const inputBase = {
    flex: 1,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "0 14px 0 40px",
    height: 42,
    fontSize: 14,
    color: "#f5f5f7",
    outline: "none",
    width: "100%",
    fontFamily: "inherit",
    transition: "border-color 150ms ease, box-shadow 150ms ease, background 150ms ease",
  };

  const focusHandlers = {
    onFocus: (e) => {
      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,113,227,0.3)";
      e.currentTarget.style.borderColor = "rgba(0,113,227,0.5)";
      e.currentTarget.style.background = "rgba(255,255,255,0.07)";
    },
    onBlur: (e) => {
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
    },
  };

  // While auth is resolving (or redirecting), show a minimal loader.
  if (loading || !user) {
    return (
      <div style={{ height: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={22} color="#0071e3" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  const initials = (user.name || user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="app-shell" style={{ height: "100vh", background: "#000", color: "#f5f5f7", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div aria-hidden="true" style={{
        position: "fixed", top: -180, left: "50%", transform: "translateX(-50%)",
        width: 900, height: 360, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse at center, rgba(0,113,227,0.10), transparent 70%)",
        filter: "blur(20px)",
      }} />

      {/* ══ TOP BAR ══ */}
      <div style={{
        background: "rgba(10,10,10,0.72)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky", top: 0, zIndex: 40, flexShrink: 0,
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 22px", height: 54,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg,#0071e3,#30d158)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
              boxShadow: "0 2px 12px rgba(0,113,227,0.35)",
            }}>
              <Eye size={17} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 600, color: "#f5f5f7", letterSpacing: "-0.2px" }}>CreatorLens</span>
            <span className="text-label-uppercase" style={{
              fontSize: 9.5, color: "#86868b",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6, padding: "2px 7px",
            }}>RAG v2.0</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {hasData && (
              <motion.button
                whileHover={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}
                whileTap={{ scale: 0.97 }}
                onClick={handleReset}
                disabled={isResetting}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 9, fontSize: 12, fontWeight: 500, color: "#86868b",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <RefreshCw size={13} />
                {isResetting ? "Resetting…" : "Reset Session"}
              </motion.button>
            )}

            {/* User menu */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 9, padding: "5px 10px 5px 6px", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <span style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: "linear-gradient(135deg,#0071e3,#30d158)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 600,
                }}>{initials}</span>
                <span style={{ fontSize: 12, color: "#f5f5f7", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.name || user.email}
                </span>
                <ChevronDown size={13} color="#86868b" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: "absolute", right: 0, top: 42, width: 280, zIndex: 50,
                      background: "#141414", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12, boxShadow: "0 12px 48px rgba(0,0,0,0.7)", overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f5f5f7" }}>{user.name || "Creator"}</div>
                      <div style={{ fontSize: 12, color: "#86868b", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
                    </div>

                    <div style={{ maxHeight: 220, overflowY: "auto" }}>
                      <div className="text-label-uppercase" style={{ fontSize: 9.5, color: "#48484a", padding: "10px 14px 4px", display: "flex", alignItems: "center", gap: 5 }}>
                        <Clock3 size={11} /> Recent analyses
                      </div>
                      {history.length === 0 ? (
                        <div style={{ fontSize: 12, color: "#86868b", padding: "4px 14px 10px" }}>No saved analyses yet.</div>
                      ) : (
                        history.slice(0, 6).map((h) => (
                          <div key={h.id} style={{ padding: "7px 14px", fontSize: 12, color: "#cccccc", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                            <span style={{ color: "#f5f5f7", fontWeight: 500 }}>{h.video_a?.creator || "?"}</span>
                            <span style={{ color: "#48484a" }}> vs </span>
                            <span style={{ color: "#f5f5f7", fontWeight: 500 }}>{h.video_b?.creator || "?"}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={handleLogout}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8,
                        padding: "11px 14px", background: "transparent", border: "none",
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        color: "#ff453a", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      <LogOut size={14} /> Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* URL form row */}
        <form onSubmit={handleAnalyze} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
              <YoutubeInputIcon />
            </span>
            <input type="url" required disabled={isProcessing} placeholder="https://www.youtube.com/watch?v=…"
              value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} style={inputBase} {...focusHandlers} />
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
              <InstagramInputIcon />
            </span>
            <input type="url" required disabled={isProcessing} placeholder="https://www.instagram.com/reel/…"
              value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} style={inputBase} {...focusHandlers} />
          </div>
          <motion.button type="submit" disabled={isProcessing}
            whileHover={!isProcessing ? { background: "#0077ed", scale: 1.01 } : {}}
            whileTap={!isProcessing ? { scale: 0.99 } : {}}
            style={{
              height: 42, padding: "0 20px", background: "#0071e3", border: "none", borderRadius: 12,
              fontSize: 14, fontWeight: 500, color: "#fff", cursor: isProcessing ? "not-allowed" : "pointer",
              opacity: isProcessing ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8,
              flexShrink: 0, whiteSpace: "nowrap", fontFamily: "inherit", boxShadow: "0 2px 14px rgba(0,113,227,0.3)",
            }}>
            {isProcessing ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Analyzing…</> : "Analyze Videos"}
          </motion.button>
        </form>

        <ProcessingBar isProcessing={isProcessing} />
        <AnimatePresence>
          {isProcessing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              style={{ padding: "6px 22px 10px", overflow: "hidden" }}>
              <motion.p key={processingStep} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                style={{ fontSize: 12, color: "#86868b", margin: 0 }}>{processingStep}</motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══ MAIN ══ */}
      {!showDashboard ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", position: "relative", zIndex: 1 }}>
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: 76, height: 76, background: "linear-gradient(135deg, rgba(0,113,227,0.14), rgba(48,209,88,0.14))", border: "1px solid rgba(0,113,227,0.22)", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 26, color: "#0071e3", boxShadow: "0 8px 40px rgba(0,113,227,0.18)" }}>
            <Eye size={30} />
          </motion.div>
          <h1 style={{ fontSize: 38, fontWeight: 600, color: "#f5f5f7", margin: "0 0 14px", letterSpacing: "-0.8px" }}>
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p style={{ fontSize: 16, color: "#86868b", maxWidth: 480, lineHeight: 1.6, margin: 0 }}>
            Paste a YouTube URL and an Instagram Reel URL above to compare their transcripts,
            engagement metrics, and creator strategy using AI.
          </p>
          {restored && (
            <button
              onClick={() => { setYoutubeUrl(restored.videoA?.source_url || youtubeUrl); }}
              style={{ marginTop: 22, fontSize: 12, color: "#0071e3", background: "transparent", border: "none", cursor: "pointer" }}
            >
              Last compared: {restored.videoA?.creator} vs {restored.videoB?.creator}
            </button>
          )}
        </motion.div>
      ) : (
        <div className="dashboard-grid" style={{
          flex: "1 1 0", minHeight: 0, display: "grid",
          gridTemplateColumns: "minmax(560px, 640px) 1fr",
          gridTemplateRows: "minmax(0, 1fr)", overflow: "hidden", position: "relative", zIndex: 1,
        }}>
          <div className="meta-col scroll-visible" style={{
            minHeight: 0, height: "100%", overflowY: "scroll",
            padding: "0 18px 24px", display: "flex", flexDirection: "column", gap: 16,
            borderRight: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 5, padding: "16px 0 12px", background: "linear-gradient(#000 70%, transparent)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <BarChart3 size={15} color="#86868b" />
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#f5f5f7", margin: 0, letterSpacing: "-0.2px" }}>Comparison</h2>
              </div>
              {hasData && (
                <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ fontSize: 10, color: "#30d158", background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.2)", borderRadius: 7, padding: "3px 9px", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                  <CheckCircle size={11} /> Indexed
                </motion.span>
              )}
            </div>

            {isProcessing ? (
              <><SkeletonVideoCard /><SkeletonVideoCard /></>
            ) : (
              videosLoaded && (
                <>
                  {videoA && <VideoCard key="a" video={videoA} animationDelay={0} isWinner={winner === "A"} />}
                  {videoB && <VideoCard key="b" video={videoB} animationDelay={100} isWinner={winner === "B"} />}
                </>
              )
            )}
          </div>

          <div className="chat-col" style={{ height: "100%", overflow: "hidden" }}>
            <ChatInterface ref={chatRef} />
          </div>
        </div>
      )}

      <style>{`
        .scroll-visible::-webkit-scrollbar { width: 10px; }
        .scroll-visible::-webkit-scrollbar-thumb { background-color: #3a3a3a; border-radius: 9999px; border: 2px solid #000; }
        .scroll-visible::-webkit-scrollbar-thumb:hover { background-color: #555; }
        .scroll-visible > * { flex-shrink: 0; }
        @media (max-width: 1023px) {
          .app-shell { height: auto !important; min-height: 100vh; overflow: visible !important; }
          .dashboard-grid { display: block !important; overflow: visible !important; }
          .meta-col { height: auto !important; overflow: visible !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.08); }
          .chat-col { height: 600px !important; }
        }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
