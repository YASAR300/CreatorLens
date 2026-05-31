import React from "react";

const BLOCK_STYLE = {
  background: "#161616",
  borderRadius: "8px",
};

function SkeletonBlock({ width, height, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{
        ...BLOCK_STYLE,
        width,
        height,
        borderRadius: "8px",
        ...style,
      }}
    />
  );
}

export default function SkeletonVideoCard() {
  return (
    <div
      style={{
        background: "#0c0c0c",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      {/* Thumbnail */}
      <div
        className="skeleton"
        style={{ width: "100%", aspectRatio: "16/9", background: "#161616" }}
      />

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "13px" }}>
        {/* Creator name + date */}
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          <SkeletonBlock width="52%" height="16px" />
          <SkeletonBlock width="34%" height="12px" />
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "1px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ background: "#0c0c0c", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "5px" }}>
              <SkeletonBlock width="32px" height="9px" />
              <SkeletonBlock width="46px" height="14px" />
            </div>
          ))}
        </div>

        {/* Engagement rate */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "12px", padding: "12px 14px",
          display: "flex", flexDirection: "column", gap: "6px",
        }}>
          <SkeletonBlock width="72px" height="26px" style={{ borderRadius: "8px" }} />
          <SkeletonBlock width="96px" height="10px" />
        </div>

        {/* Hashtag pills */}
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {[44, 64, 50, 72].map((w, i) => (
            <SkeletonBlock key={i} width={`${w}px`} height="22px" style={{ borderRadius: "8px" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
