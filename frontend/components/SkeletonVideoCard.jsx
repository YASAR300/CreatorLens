import React from "react";

const BLOCK_STYLE = {
  background: "#111111",
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
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      {/* Thumbnail */}
      <div
        className="skeleton"
        style={{ width: "100%", aspectRatio: "16/9", background: "#111111" }}
      />

      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Creator name + date */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <SkeletonBlock width="52%" height="18px" />
          <SkeletonBlock width="32%" height="13px" />
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
            <div key={i} style={{ background: "#0a0a0a", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <SkeletonBlock width="36px" height="10px" />
              <SkeletonBlock width="52px" height="16px" />
            </div>
          ))}
        </div>

        {/* Engagement rate */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <SkeletonBlock width="80px" height="32px" style={{ borderRadius: "10px" }} />
          <SkeletonBlock width="110px" height="11px" />
        </div>

        {/* Hashtag pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[50, 72, 58, 84, 48].map((w, i) => (
            <SkeletonBlock key={i} width={`${w}px`} height="26px" style={{ borderRadius: "13px" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
