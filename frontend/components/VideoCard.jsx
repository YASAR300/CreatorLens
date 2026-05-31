'use client';

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Clock, TrendingUp } from "lucide-react";
import { API_BASE } from "../lib/api";

/* ─── Platform SVG icons ─── */
const YoutubeIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.388.51a3.002 3.002 0 0 0-2.11 2.108C0 8.029 0 12 0 12s0 3.972.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.863.51 9.388.51 9.388.51s7.525 0 9.388-.51a3.002 3.002 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.971-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const InstagramIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

/* ─── Stat column ─── */
function StatColumn({ label, value }) {
  return (
    <div style={{ background: "#0a0a0a", padding: "12px 14px" }}>
      <div className="text-label-uppercase" style={{ fontSize: 10, color: "#86868b", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#f5f5f7", letterSpacing: "-0.2px" }}>{value}</div>
    </div>
  );
}

/* ─── Formatters ─── */
function fmt(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

/* ─── VideoCard ─── */
export default function VideoCard({ video, animationDelay = 0, isWinner = false }) {
  const [thumbError, setThumbError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (!video) return null;

  const isYoutube = video.platform === "youtube";
  const tags = video.hashtags || [];
  const VISIBLE = 10;
  const hidden = tags.length - VISIBLE;
  const rawThumb = video.thumbnail_url || video.thumbnail || null;
  const thumb = (video.platform === "instagram" && rawThumb)
    ? `${API_BASE}/api/videos/thumbnail-proxy?url=${encodeURIComponent(rawThumb)}`
    : rawThumb;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: animationDelay / 1000 }}
      whileHover={{ y: -2, boxShadow: "0 10px 44px rgba(0,0,0,0.6)" }}
      style={{
        background: "#0c0c0c",
        // Winner gets a subtle green-tinted border to answer "which performed better?"
        border: isWinner
          ? "1px solid rgba(48,209,88,0.28)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: isWinner
          ? "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(48,209,88,0.06)"
          : "0 4px 24px rgba(0,0,0,0.5)",
        transition: "box-shadow 200ms ease",
      }}
    >
      {/* ── Thumbnail ── */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#000" }}>
        {thumb && !thumbError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={video.title || "thumbnail"}
            onError={() => setThumbError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(135deg,#0a0a0a,#111111)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ color: "#2a2a2a", transform: "scale(3)" }}>
              {isYoutube ? <YoutubeIcon size={16} /> : <InstagramIcon size={16} />}
            </div>
          </div>
        )}

        {/* Platform badge */}
        <div className="text-label-uppercase" style={{
          position: "absolute", top: 10, left: 10,
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 9px", borderRadius: 8,
          fontSize: 10, fontWeight: 600, color: "#fff", letterSpacing: "0.4px",
          backdropFilter: "blur(12px)",
          background: isYoutube
            ? "rgba(255,0,0,0.85)"
            : "linear-gradient(135deg,rgba(131,58,180,0.92),rgba(253,29,29,0.92),rgba(252,176,69,0.92))",
        }}>
          {isYoutube ? <YoutubeIcon size={12} /> : <InstagramIcon size={12} />}
          {isYoutube ? "Video A · YouTube" : "Video B · Instagram"}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Creator + meta */}
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: "#f5f5f7", margin: "0 0 3px", letterSpacing: "-0.2px", wordBreak: "break-word" }}>
            {video.creator || "Unknown Creator"}
          </h3>
          {video.title && (
            <p style={{
              fontSize: 13, color: "#a1a1a6", margin: "0 0 6px", lineHeight: 1.45,
              wordBreak: "break-word",
            }}>
              {video.title}
            </p>
          )}
          <p style={{ fontSize: 12.5, color: "#86868b", margin: 0, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span>{video.upload_date || "—"}</span>
            {video.upload_time ? <span style={{ color: "#48484a" }}>·</span> : null}
            {video.upload_time ? <span>{video.upload_time}</span> : null}
            {video.duration && video.duration !== "0:00" ? <span style={{ color: "#48484a" }}>·</span> : null}
            {video.duration && video.duration !== "0:00" ? (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 7, padding: "1px 7px", fontSize: 11.5,
              }}>
                <Clock size={11} /> {video.duration}
              </span>
            ) : null}
          </p>
        </div>

        {/* Stats row */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 1, background: "rgba(255,255,255,0.06)",
          borderRadius: 12, overflow: "hidden",
        }}>
          <StatColumn label="Views" value={fmt(video.views)} />
          <StatColumn label="Likes" value={fmt(video.likes)} />
          <StatColumn label="Comments" value={fmt(video.comments)} />
        </div>

        {/* Engagement rate */}
        <div style={{
          position: "relative",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14, padding: "14px 16px",
        }}>
          <div className="engagement-gradient" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.5px" }}>
            {video.engagement_rate != null ? `${video.engagement_rate}%` : "—"}
          </div>
          <div className="text-label-uppercase" style={{ fontSize: 10.5, color: "#86868b", marginTop: 4 }}>
            Engagement Rate
          </div>
          {isWinner && (
            <motion.div
              className="scale-in"
              style={{
                position: "absolute", top: 14, right: 14,
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 10, fontWeight: 600, color: "#30d158",
                background: "rgba(48,209,88,0.12)",
                border: "1px solid rgba(48,209,88,0.25)",
                borderRadius: 8, padding: "3px 8px",
              }}
            >
              <TrendingUp size={11} /> Higher
            </motion.div>
          )}
        </div>

        {/* Hashtags */}
        {tags.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {tags.slice(0, VISIBLE).map((tag, i) => (
                <motion.span
                  key={i}
                  whileHover={{ borderColor: "rgba(255,255,255,0.22)", color: "#cccccc" }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8, padding: "3px 8px",
                    fontSize: 10.5, color: "#86868b", cursor: "default",
                  }}
                >
                  #{tag}
                </motion.span>
              ))}
            </div>

            {/* Overflow tags animate open/closed with a smooth height transition
                (height:auto is impossible with CSS alone — Framer handles it). */}
            <AnimatePresence initial={false}>
              {showAll && hidden > 0 && (
                <motion.div
                  key="overflow"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {tags.slice(VISIBLE).map((tag, i) => (
                      <span
                        key={i}
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 8, padding: "3px 8px",
                          fontSize: 10.5, color: "#86868b",
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {hidden > 0 && (
              <motion.button
                whileHover={{ color: "#86868b" }}
                onClick={() => setShowAll((v) => !v)}
                style={{
                  alignSelf: "flex-start",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, padding: "3px 8px",
                  fontSize: 10.5, color: "#48484a", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 3, fontFamily: "inherit",
                }}
              >
                {showAll ? <>Show less <ChevronUp size={10} /></> : <>+{hidden} more <ChevronDown size={10} /></>}
              </motion.button>
            )}
          </div>
        )}

        {/* Footer: followers + chunks */}
        {(video.follower_count > 0 || video.chunks_stored > 0) && (
          <div style={{
            paddingTop: 11, borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: 12, color: "#86868b",
          }}>
            {video.follower_count > 0 && (
              <span><span style={{ color: "#f5f5f7", fontWeight: 600 }}>{fmt(video.follower_count)}</span> followers · </span>
            )}
            <span><span style={{ color: "#f5f5f7", fontWeight: 600 }}>{video.chunks_stored || 0}</span> chunks indexed</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
