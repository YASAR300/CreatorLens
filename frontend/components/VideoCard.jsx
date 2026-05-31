'use client';

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import clsx from "clsx";

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
    <div style={{ background: "#0a0a0a", padding: "14px 16px" }}>
      <div style={{ fontSize: "11px", fontWeight: 500, color: "#86868b", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{ fontSize: "16px", fontWeight: 500, color: "#f5f5f7" }}>{value}</div>
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
export default function VideoCard({ video, animationDelay = 0 }) {
  const [thumbError, setThumbError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (!video) return null;

  const isYoutube = video.platform === "youtube";
  const tags = video.hashtags || [];
  const visibleTags = showAll ? tags : tags.slice(0, 8);
  const hidden = tags.length - 8;
  const rawThumb = video.thumbnail_url || video.thumbnail || null;
  const thumb = (video.platform === "instagram" && rawThumb)
    ? `http://localhost:8000/api/videos/thumbnail-proxy?url=${encodeURIComponent(rawThumb)}`
    : rawThumb;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: animationDelay / 1000 }}
      whileHover={{ y: -2, boxShadow: "0 8px 40px rgba(0,0,0,0.7)" }}
      style={{
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        transition: "box-shadow 200ms ease",
      }}
    >
      {/* ── Thumbnail ── */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/9" }}>
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
        <div style={{
          position: "absolute", top: 12, left: 12,
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 20,
          fontSize: 11, fontWeight: 500, color: "#fff",
          backdropFilter: "blur(12px)",
          background: isYoutube
            ? "rgba(255,0,0,0.85)"
            : "linear-gradient(135deg,rgba(131,58,180,0.9),rgba(253,29,29,0.9),rgba(252,176,69,0.9))",
        }}>
          {isYoutube ? <YoutubeIcon /> : <InstagramIcon />}
          {isYoutube ? "Video A · YouTube" : "Video B · Instagram"}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Creator + meta */}
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: "#f5f5f7", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {video.creator || "Unknown Creator"}
          </h3>
          {video.title && (
            <p style={{ fontSize: 13, color: "#86868b", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {video.title}
            </p>
          )}
          <p style={{ fontSize: 13, color: "#86868b", margin: 0, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span>{video.upload_date || "—"}</span>
            {video.upload_time ? <span style={{ color: "#48484a" }}>·</span> : null}
            {video.upload_time ? <span>{video.upload_time}</span> : null}
            {video.duration && video.duration !== "0:00" ? <span style={{ color: "#48484a" }}>·</span> : null}
            {video.duration && video.duration !== "0:00" ? (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, padding: "1px 7px", fontSize: 12,
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
        <div>
          <div className="engagement-gradient" style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.1 }}>
            {video.engagement_rate != null ? `${video.engagement_rate}%` : "—"}
          </div>
          <div style={{ fontSize: 11, color: "#86868b", letterSpacing: "0.8px", textTransform: "uppercase", marginTop: 4 }}>
            Engagement Rate
          </div>
        </div>

        {/* Hashtags */}
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {visibleTags.map((tag, i) => (
              <motion.span
                key={i}
                whileHover={{ borderColor: "rgba(255,255,255,0.22)", color: "#cccccc" }}
                style={{
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, padding: "5px 10px",
                  fontSize: 11, color: "#86868b", cursor: "default",
                }}
              >
                #{tag}
              </motion.span>
            ))}

            {!showAll && hidden > 0 && (
              <motion.button
                whileHover={{ color: "#86868b" }}
                onClick={() => setShowAll(true)}
                style={{
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, padding: "5px 10px",
                  fontSize: 11, color: "#48484a", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 3,
                }}
              >
                +{hidden} more <ChevronDown size={11} />
              </motion.button>
            )}

            {showAll && hidden > 0 && (
              <motion.button
                whileHover={{ color: "#86868b" }}
                onClick={() => setShowAll(false)}
                style={{
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, padding: "5px 10px",
                  fontSize: 11, color: "#48484a", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 3,
                }}
              >
                Show less <ChevronUp size={11} />
              </motion.button>
            )}
          </div>
        )}

        {/* Footer: followers + chunks */}
        {(video.follower_count > 0 || video.chunks_stored > 0) && (
          <div style={{
            paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: 13, color: "#86868b",
          }}>
            {video.follower_count > 0 && (
              <span><span style={{ color: "#f5f5f7", fontWeight: 500 }}>{fmt(video.follower_count)}</span> followers · </span>
            )}
            <span><span style={{ color: "#f5f5f7", fontWeight: 500 }}>{video.chunks_stored || 0}</span> chunks indexed</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
