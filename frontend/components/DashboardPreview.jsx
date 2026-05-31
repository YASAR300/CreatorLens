'use client';

import React from "react";
import { Plus, BarChart3, Inbox, Sparkles, Star, CheckCircle, ChevronRight, Send } from "lucide-react";

/* Linear-style palette (matches the real /app dashboard) */
const C = {
  bg: "#08090a", sidebar: "#0b0c0d", panel: "#0e0f11", panel2: "#121315",
  border: "rgba(255,255,255,0.08)", borderSoft: "rgba(255,255,255,0.05)",
  text: "#f7f8f8", dim: "#8a8f98", dimmer: "#62666d", blue: "#5e6ad2",
};

const YT = () => (
  <svg viewBox="0 0 24 24" fill="#ff3333" width="11" height="11"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.388.51a3.002 3.002 0 0 0-2.11 2.108C0 8.029 0 12 0 12s0 3.972.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.863.51 9.388.51 9.388.51s7.525 0 9.388-.51a3.002 3.002 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.971-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
);
const IG = () => (
  <svg viewBox="0 0 24 24" fill="none" width="11" height="11" stroke="#e1306c" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="#e1306c" /></svg>
);

function MiniCard({ platform, creator, er, views, likes, win, icon }) {
  return (
    <div style={{ background: C.panel2, border: `1px solid ${win ? "rgba(48,209,88,0.28)" : C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 70, background: platform === "youtube" ? "linear-gradient(135deg,#2a1216,#0e0f11)" : "linear-gradient(135deg,#2a1226,#0e0f11)", position: "relative" }}>
        <span style={{ position: "absolute", top: 8, left: 8, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 8.5, fontWeight: 600, color: "#fff", background: platform === "youtube" ? "rgba(255,0,0,0.85)" : "linear-gradient(135deg,rgba(131,58,180,0.92),rgba(253,29,29,0.92))", borderRadius: 6, padding: "2px 6px" }}>
          {icon} {platform === "youtube" ? "Video A" : "Video B"}
        </span>
        {win && <span style={{ position: "absolute", top: 8, right: 8, fontSize: 8, fontWeight: 600, color: "#30d158", background: "rgba(48,209,88,0.12)", border: "1px solid rgba(48,209,88,0.25)", borderRadius: 6, padding: "2px 6px" }}>Higher</span>}
      </div>
      <div style={{ padding: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 }}>{creator}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
          {[["Views", views], ["Likes", likes]].map(([l, v]) => (
            <div key={l} style={{ background: C.panel, border: `1px solid ${C.borderSoft}`, borderRadius: 7, padding: "5px 7px" }}>
              <div style={{ fontSize: 7.5, color: C.dimmer, textTransform: "uppercase", letterSpacing: "0.5px" }}>{l}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: C.text }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ background: C.panel, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "7px 9px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, background: "linear-gradient(90deg,#30d158,#5e6ad2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{er}</div>
          <div style={{ fontSize: 7.5, color: C.dimmer, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 2 }}>Engagement</div>
        </div>
      </div>
    </div>
  );
}

function ChatRow({ who, children }) {
  const ai = who === "ai";
  return (
    <div style={{ alignSelf: ai ? "flex-start" : "flex-end", maxWidth: "90%", background: ai ? C.panel2 : C.blue, color: ai ? C.text : "#fff", border: ai ? `1px solid ${C.border}` : "none", borderRadius: ai ? "9px 9px 9px 2px" : "9px 9px 2px 9px", padding: "7px 9px", fontSize: 10.5, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

/**
 * DashboardPreview — a faithful static mock of the real /app dashboard,
 * used as the landing hero frame (the "screenshot").
 */
export default function DashboardPreview() {
  const nav = [
    { icon: BarChart3, label: "Comparison", active: true },
    { icon: Inbox, label: "History" },
    { icon: Sparkles, label: "Insights" },
  ];
  const recent = ["Rick Astley vs gujarat_titans", "MrBeast vs zoe.codes", "Veritasium vs natgeo"];

  return (
    <div style={{ background: C.bg, color: C.text, display: "grid", gridTemplateColumns: "150px 1fr 220px", minHeight: 360, fontSize: 12 }}>
      {/* sidebar */}
      <div className="dp-side" style={{ background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 10px", display: "flex", alignItems: "center", gap: 7 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" style={{ width: 20, height: 20, borderRadius: 6, objectFit: "contain" }} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>CreatorLens</span>
        </div>
        <div style={{ padding: "0 8px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 11, color: C.text }}>
            <Plus size={11} /> New comparison
          </div>
        </div>
        <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map((n) => (
            <div key={n.label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 8px", borderRadius: 6, fontSize: 11, color: n.active ? C.text : C.dim, background: n.active ? "rgba(255,255,255,0.06)" : "transparent" }}>
              <n.icon size={12} color={n.active ? C.blue : C.dim} /> {n.label}
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 12px 4px", fontSize: 8.5, color: C.dimmer, textTransform: "uppercase", letterSpacing: "0.5px" }}>Recent</div>
        <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 1 }}>
          {recent.map((r) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 6, fontSize: 10.5, color: C.dim, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              <Star size={10} color={C.dimmer} /> {r}
            </div>
          ))}
        </div>
        <div style={{ marginTop: "auto", borderTop: `1px solid ${C.border}`, padding: 9, display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#5e6ad2,#30d158)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600 }}>A</span>
          <span style={{ fontSize: 10.5, color: C.dim }}>Creator</span>
        </div>
      </div>

      {/* center */}
      <div className="dp-center" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ height: 38, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 7, padding: "0 14px" }}>
          <BarChart3 size={12} color={C.dim} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>Comparison</span>
          <ChevronRight size={11} color={C.dimmer} />
          <span style={{ fontSize: 11, color: C.dim }}>Rick Astley vs gujarat_titans</span>
          <span style={{ marginLeft: "auto", fontSize: 8.5, color: "#30d158", background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.2)", borderRadius: 6, padding: "2px 7px", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <CheckCircle size={9} /> Indexed
          </span>
        </div>
        <div style={{ display: "flex", gap: 7, padding: "10px 14px", borderBottom: `1px solid ${C.borderSoft}` }}>
          <div style={{ flex: 1, height: 30, borderRadius: 7, background: C.panel2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6, padding: "0 9px", fontSize: 10.5, color: C.dimmer }}><YT /> YouTube URL…</div>
          <div style={{ flex: 1, height: 30, borderRadius: 7, background: C.panel2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6, padding: "0 9px", fontSize: 10.5, color: C.dimmer }}><IG /> Reel URL…</div>
          <div style={{ height: 30, padding: "0 14px", borderRadius: 7, background: C.blue, color: "#fff", fontSize: 11, fontWeight: 500, display: "flex", alignItems: "center" }}>Analyze</div>
        </div>
        <div style={{ flex: 1, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "start" }}>
          <MiniCard platform="youtube" creator="Rick Astley" er="1.21%" views="1.7M" likes="377K" icon={<YT />} />
          <MiniCard platform="instagram" creator="gujarat_titans" er="3.84%" views="612K" likes="38K" win icon={<IG />} />
        </div>
      </div>

      {/* chat */}
      <div className="dp-chat" style={{ borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: "#060708" }}>
        <div style={{ height: 38, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 7, padding: "0 12px" }}>
          <span style={{ width: 18, height: 18, borderRadius: 6, background: "rgba(94,106,210,0.15)", border: "1px solid rgba(94,106,210,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={10} color={C.blue} /></span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Creator Chat</span>
          <span style={{ marginLeft: "auto", fontSize: 9, color: C.dimmer }}>Groq · Llama 3.3</span>
        </div>
        <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <ChatRow who="you">Why did the Reel win?</ChatRow>
          <ChatRow who="ai">Video B&rsquo;s 3.84% beats Video A&rsquo;s 1.21% — a stronger first-5s hook and higher comment ratio <span style={{ color: C.blue }}>[Video B, Chunk 0]</span>.</ChatRow>
          <ChatRow who="you">Suggest a fix for A.</ChatRow>
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 10, display: "flex", gap: 7, alignItems: "center" }}>
          <div style={{ flex: 1, height: 28, borderRadius: 8, background: C.panel2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 9px", fontSize: 10, color: C.dimmer }}>Ask anything…</div>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center" }}><Send size={12} color="#fff" /></div>
        </div>
      </div>

      <style>{`@media (max-width: 720px){ .dp-side{ display:none !important; } .dp-chat{ display:none !important; } [style*="grid-template-columns: 150px 1fr 220px"]{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
