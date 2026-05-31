'use client';

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, TrendingUp, Quote,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import DashboardPreview from "../components/DashboardPreview";
import Logo from "../components/Logo";

/* ── Design tokens (Linear-style dark) ── */
const C = {
  bg: "#08090a",
  panel: "#0e0f11",
  panel2: "#121315",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.05)",
  text: "#f7f8f8",
  dim: "#8a8f98",
  dimmer: "#62666d",
  blue: "#5e6ad2",
  accent: "#e9ff5e",
};

const reveal = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
};

export default function Landing() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/app");
  }, [loading, user, router]);

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", overflowX: "hidden", fontFeatureSettings: '"ss01"' }}>
      <Nav />
      <Hero />
      <TechStrip />
      <SectionIntro />
      <FeatureRoadmap />
      <FeatureDirection />
      <FeatureTeams />
      <FeatureAgent />
      <FeatureProgress />
      <Changelog />
      <SocialProof />
      <AccentCTA />
      <ClosingCTA />
      <Footer />
    </div>
  );
}

/* ─────────────────────────── NAV ─────────────────────────── */
function Nav() {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(8,9,10,0.7)", backdropFilter: "saturate(180%) blur(16px)", WebkitBackdropFilter: "saturate(180%) blur(16px)",
      borderBottom: `1px solid ${C.borderSoft}`,
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <Logo size={26} withWordmark wordmarkSize={15} />
          </Link>
          <div className="nav-links" style={{ display: "flex", gap: 22 }}>
            {["Features", "How it works", "Changelog", "Pricing"].map((t) => (
              <a key={t} href="#" style={{ fontSize: 13.5, color: C.dim, textDecoration: "none" }}>{t}</a>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/login" style={{ fontSize: 13.5, color: C.dim, textDecoration: "none", padding: "7px 10px" }}>Log in</Link>
          <Link href="/register" style={{ fontSize: 13, fontWeight: 500, color: "#0b0c0e", textDecoration: "none", background: C.text, padding: "7px 14px", borderRadius: 8 }}>
            Sign up
          </Link>
        </div>
      </div>
      <style>{`@media (max-width: 760px){ .nav-links{ display:none !important; } }`}</style>
    </nav>
  );
}

/* ─────────────────────────── HERO ─────────────────────────── */
function Hero() {
  return (
    <section style={{ position: "relative", maxWidth: 1100, margin: "0 auto", padding: "100px 24px 0", textAlign: "center" }}>
      <div aria-hidden style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 760, height: 380, background: "radial-gradient(ellipse at center, rgba(94,106,210,0.18), transparent 70%)", filter: "blur(20px)", pointerEvents: "none" }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} style={{ position: "relative" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, border: `1px solid ${C.border}`, background: C.panel, fontSize: 12.5, color: C.dim, marginBottom: 26 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#30d158" }} />
          Now with multi-user accounts & Qdrant RAG
        </div>

        <h1 style={{ fontSize: "clamp(36px, 6.2vw, 62px)", fontWeight: 600, lineHeight: 1.06, letterSpacing: "-1.6px", margin: "0 auto 22px", maxWidth: 760 }}>
          The content intelligence<br />system for creators and agents
        </h1>
        <p style={{ fontSize: 17.5, color: C.dim, maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.6 }}>
          CreatorLens compares a YouTube video and an Instagram Reel, grounds every answer in their
          real transcripts, and lets you chat your way to what actually drives engagement.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14.5, fontWeight: 500, color: "#0b0c0e", textDecoration: "none", background: C.text, padding: "12px 22px", borderRadius: 10 }}>
            Start for free <ArrowRight size={15} />
          </Link>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", fontSize: 14.5, fontWeight: 500, color: C.text, textDecoration: "none", background: C.panel, border: `1px solid ${C.border}`, padding: "12px 22px", borderRadius: 10 }}>
            Sign in
          </Link>
        </div>
      </motion.div>

      {/* Product frame */}
      <motion.div
        initial={{ opacity: 0, y: 44 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginTop: 64, borderRadius: 14, border: `1px solid ${C.border}`, background: C.panel, boxShadow: "0 40px 120px rgba(0,0,0,0.6)", overflow: "hidden", textAlign: "left" }}>
        {/* window bar */}
        <div style={{ height: 36, borderBottom: `1px solid ${C.borderSoft}`, display: "flex", alignItems: "center", gap: 7, padding: "0 14px" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
          <span style={{ marginLeft: 10, fontSize: 11, color: C.dimmer }}>creatorlens.app/app</span>
        </div>
        <DashboardPreview />
      </motion.div>
    </section>
  );
}

function Bubble({ who, children }) {
  const ai = who === "ai";
  return (
    <div style={{ alignSelf: ai ? "flex-start" : "flex-end", maxWidth: "88%", background: ai ? C.panel2 : C.blue, color: ai ? C.text : "#fff", border: ai ? `1px solid ${C.border}` : "none", borderRadius: ai ? "10px 10px 10px 3px" : "10px 10px 3px 10px", padding: "8px 11px", fontSize: 12, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

/* ─────────────────────────── TECH STRIP ─────────────────────────── */
function TechStrip() {
  const items = ["FastAPI", "Qdrant", "LangChain", "Groq", "Postgres", "Next.js"];
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "70px 24px 30px" }}>
      <p style={{ textAlign: "center", fontSize: 12.5, color: C.dimmer, marginBottom: 26, letterSpacing: "0.3px" }}>
        Powered by a production-grade, low-cost stack
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 36, justifyContent: "center", alignItems: "center" }}>
        {items.map((t) => (
          <span key={t} style={{ fontSize: 16, fontWeight: 600, color: C.dimmer, letterSpacing: "-0.2px", opacity: 0.7 }}>{t}</span>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────── SECTION INTRO ─────────────────────────── */
function SectionIntro() {
  const principles = [
    { t: "Grounded in truth", d: "Every answer is retrieved from the real transcript and metadata — never invented." },
    { t: "Cited by default", d: "Each claim links to the exact source chunk, so you can trust and verify." },
    { t: "Fast and cheap", d: "Groq inference plus local embeddings keep responses instant and costs near zero." },
  ];
  return (
    <section style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 24px 20px", textAlign: "center" }}>
      <motion.div {...reveal}>
        <div className="text-label-uppercase" style={{ fontSize: 11, color: C.blue, marginBottom: 16, letterSpacing: "1px" }}>A new species of analytics</div>
        <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 600, letterSpacing: "-0.9px", lineHeight: 1.18, margin: "0 auto", maxWidth: 760, color: C.text }}>
          Built for creators who want answers, not dashboards.{" "}
          <span style={{ color: C.dim }}>Every metric is grounded in the actual transcript, every claim is cited, and the whole thing runs for cents.</span>
        </h2>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 44, textAlign: "left" }}>
        {principles.map((p, i) => (
          <motion.div key={p.t} {...reveal} transition={{ ...reveal.transition, delay: i * 0.07 }}
            style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue, marginBottom: 14 }} />
            <h3 style={{ fontSize: 15.5, fontWeight: 600, margin: "0 0 7px", color: C.text }}>{p.t}</h3>
            <p style={{ fontSize: 13.5, color: C.dim, lineHeight: 1.6, margin: 0 }}>{p.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────── FEATURE ROWS ─────────────────────────── */
function FeatureRow({ kicker, step, title, body, visual, flip }) {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
      <div className="feature-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
        <motion.div {...reveal} style={{ order: flip ? 2 : 1 }}>
          <div className="text-label-uppercase" style={{ fontSize: 11, color: C.blue, marginBottom: 14, letterSpacing: "1px" }}>{kicker}</div>
          <h3 style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 600, letterSpacing: "-0.6px", lineHeight: 1.2, margin: "0 0 14px", color: C.text }}>{title}</h3>
          <p style={{ fontSize: 16, color: C.dim, lineHeight: 1.65, margin: "0 0 18px" }}>{body}</p>
          {step && (
            <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 500, color: C.text, textDecoration: "none" }}>
              <span style={{ color: C.dimmer, fontVariantNumeric: "tabular-nums" }}>{step.n}</span> {step.label}
              <span style={{ color: C.blue }}>→</span>
            </a>
          )}
        </motion.div>
        <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.08 }} style={{ order: flip ? 1 : 2 }}>
          {visual}
        </motion.div>
      </div>
      <style>{`@media (max-width: 820px){ .feature-grid{ grid-template-columns: 1fr !important; gap: 26px !important; } .feature-grid > *{ order: initial !important; } }`}</style>
    </section>
  );
}

function Panel({ children, pad = 18, h }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: pad, height: h, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
      {children}
    </div>
  );
}

function FeatureRoadmap() {
  return (
    <FeatureRow
      kicker="Side-by-side metrics"
      step={{ n: "1.0", label: "Compare" }}
      title="See exactly which video wins, and by how much"
      body="Views, likes, comments, follower counts and a computed engagement rate for both videos — laid out side by side with the stronger performer highlighted. No more eyeballing two tabs."
      visual={
        <Panel>
          {[["YouTube · Video A", 1.21, "#ff3b30"], ["Instagram · Video B", 3.84, "#30d158"]].map(([t, er, col]) => (
            <div key={t} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, color: C.dim }}>{t}</span>
                <span style={{ fontSize: 12.5, color: C.text, fontWeight: 600 }}>{er}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: C.panel2, overflow: "hidden" }}>
                <div style={{ width: `${(er / 4) * 100}%`, height: "100%", background: col, borderRadius: 99 }} />
              </div>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16 }}>
            {[["Views", "1.7M"], ["Likes", "377K"], ["Comments", "2.1K"]].map(([l, v]) => (
              <div key={l} style={{ background: C.panel2, border: `1px solid ${C.borderSoft}`, borderRadius: 9, padding: "9px 10px" }}>
                <div className="text-label-uppercase" style={{ fontSize: 8.5, color: C.dimmer }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{v}</div>
              </div>
            ))}
          </div>
        </Panel>
      }
    />
  );
}

function FeatureDirection() {
  return (
    <FeatureRow
      flip
      kicker="Cited, streaming answers"
      step={{ n: "2.0", label: "Chat" }}
      title="Chat your way to the insight"
      body="Ask why one video outperformed the other, compare the hooks in the first five seconds, or request improvements. Answers stream token-by-token and cite the exact transcript chunk they came from."
      visual={
        <Panel>
          <Bubble who="you">Compare the hooks in the first 5 seconds.</Bubble>
          <div style={{ height: 8 }} />
          <Bubble who="ai">Video A opens with a slow logo intro; Video B leads with a question on-screen, which lifts retention and comments <span style={{ color: C.blue }}>[Video B, Chunk 1]</span>.</Bubble>
          <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["[Video A, 00:00]", "[Video B, 00:03]"].map((c) => (
              <span key={c} style={{ fontSize: 10.5, color: C.blue, background: "rgba(94,106,210,0.12)", border: "1px solid rgba(94,106,210,0.25)", borderRadius: 7, padding: "3px 8px" }}>{c}</span>
            ))}
          </div>
        </Panel>
      }
    />
  );
}

function FeatureTeams() {
  return (
    <FeatureRow
      kicker="Private to every account"
      step={{ n: "3.0", label: "Isolate" }}
      title="Your analyses, isolated and saved"
      body="Sign in and every comparison is scoped to you and stored to your history. Vectors are partitioned per user in Qdrant, so no account ever sees another's data — multi-tenant by design."
      visual={
        <Panel>
          <div className="text-label-uppercase" style={{ fontSize: 9.5, color: C.dimmer, marginBottom: 10 }}>Your recent analyses</div>
          {[["Rick Astley", "gujarat_titans"], ["MrBeast", "zoe.codes"], ["Veritasium", "natgeo"]].map(([a, b], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: i ? `1px solid ${C.borderSoft}` : "none" }}>
              <span style={{ fontSize: 13, color: C.text }}>
                {a} <span style={{ color: C.dimmer }}>vs</span> {b}
              </span>
              <span style={{ fontSize: 11, color: C.dimmer }}>indexed</span>
            </div>
          ))}
        </Panel>
      }
    />
  );
}

function FeatureAgent() {
  const code = [
    ['POST', ' /api/videos/process'],
    ['', '{ youtube_url, instagram_url }'],
    ['', ''],
    ['→', ' scrape · transcribe · embed'],
    ['→', ' upsert to Qdrant (user-scoped)'],
    ['✓', ' 8 chunks indexed'],
  ];
  return (
    <FeatureRow
      flip
      kicker="Real RAG pipeline"
      step={{ n: "4.0", label: "Build" }}
      title="An agent-ready API underneath"
      body="Behind the UI is a clean FastAPI surface: ingest two URLs, transcribe with Groq Whisper, embed locally, and store user-scoped vectors. The same endpoints power the chat agent."
      visual={
        <Panel pad={0}>
          <div style={{ height: 32, borderBottom: `1px solid ${C.borderSoft}`, display: "flex", alignItems: "center", padding: "0 12px", gap: 6 }}>
            <span style={{ fontSize: 10.5, color: C.dimmer, fontFamily: "monospace" }}>pipeline.py</span>
          </div>
          <pre style={{ margin: 0, padding: "14px 16px", fontSize: 12, lineHeight: 1.7, fontFamily: "monospace", color: C.dim, overflowX: "auto" }}>
            {code.map(([k, v], i) => (
              <div key={i}>
                <span style={{ color: k === "✓" ? "#30d158" : k === "→" ? C.blue : "#c98aff" }}>{k}</span>
                <span style={{ color: C.text }}>{v}</span>
              </div>
            ))}
          </pre>
        </Panel>
      }
    />
  );
}

function FeatureProgress() {
  const bars = [38, 52, 44, 70, 61, 83, 76, 92];
  return (
    <FeatureRow
      kicker="Understand performance in seconds"
      step={{ n: "5.0", label: "Monitor" }}
      title="Turn raw metrics into a clear verdict"
      body="CreatorLens computes engagement rate as (likes + comments) / views × 100 and frames the comparison so the takeaway is obvious — then suggests concrete, numbered improvements for the weaker video."
      visual={
        <Panel>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 130 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 6, background: `linear-gradient(180deg, #5e6ad2, ${i === bars.length - 1 ? "#30d158" : "rgba(94,106,210,0.35)"})` }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <span style={{ fontSize: 11.5, color: C.dimmer }}>Engagement trend</span>
            <span style={{ fontSize: 11.5, color: "#30d158", display: "flex", alignItems: "center", gap: 4 }}><TrendingUp size={12} /> +217%</span>
          </div>
        </Panel>
      }
    />
  );
}

/* ─────────────────────────── CHANGELOG ─────────────────────────── */
function Changelog() {
  const items = [
    { tag: "v2.0", date: "This week", title: "Accounts + Qdrant", body: "Multi-user auth, per-account isolation, and a migration from ChromaDB to Qdrant Cloud." },
    { tag: "v1.4", date: "Recent", title: "Caption-grounded answers", body: "Every video now stores a title/caption overview chunk, so the bot can describe any post." },
    { tag: "v1.2", date: "Earlier", title: "Streaming + citations", body: "Token-by-token responses with inline source citations to the exact transcript chunk." },
  ];
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "70px 24px" }}>
      <motion.div {...reveal} style={{ marginBottom: 36 }}>
        <div className="text-label-uppercase" style={{ fontSize: 11, color: C.blue, marginBottom: 12, letterSpacing: "1px" }}>Changelog</div>
        <h2 style={{ fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 600, letterSpacing: "-0.7px", margin: 0 }}>Shipping every week</h2>
      </motion.div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {items.map((it, i) => (
          <motion.div key={it.tag} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }}
            style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: "rgba(94,106,210,0.12)", border: "1px solid rgba(94,106,210,0.25)", borderRadius: 6, padding: "2px 8px" }}>{it.tag}</span>
              <span style={{ fontSize: 11.5, color: C.dimmer }}>{it.date}</span>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 7px" }}>{it.title}</h3>
            <p style={{ fontSize: 13.5, color: C.dim, lineHeight: 1.6, margin: 0 }}>{it.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────── SOCIAL PROOF ─────────────────────────── */
function SocialProof() {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "50px 24px", textAlign: "center" }}>
      <motion.div {...reveal}>
        <p style={{ fontSize: "clamp(20px, 2.6vw, 26px)", fontWeight: 500, color: C.text, letterSpacing: "-0.4px", maxWidth: 680, margin: "0 auto 8px", lineHeight: 1.4 }}>
          Grounded answers for every creator who&rsquo;s tired of guessing.
        </p>
        <p style={{ fontSize: 15, color: C.dim, margin: 0 }}>
          From solo creators to social teams comparing dozens of posts a day.
        </p>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────── ACCENT CTA ─────────────────────────── */
function AccentCTA() {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "30px 24px" }}>
      <motion.div {...reveal} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="accent-grid">
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <Quote size={22} color={C.blue} />
          <div>
            <p style={{ fontSize: 17, color: C.text, lineHeight: 1.5, margin: "18px 0 14px", fontWeight: 500 }}>
              &ldquo;It told me my Reel won on engagement and exactly why — the hook. I rewrote my next video&rsquo;s opener and it worked.&rdquo;
            </p>
            <span style={{ fontSize: 13, color: C.dim }}>— A creator using CreatorLens</span>
          </div>
        </div>
        <div style={{ background: C.accent, borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#0b0c0e" }}>
          <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>Free to start</span>
          <div>
            <h3 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.6px", margin: "16px 0 16px", lineHeight: 1.15 }}>
              Run your first comparison in under a minute.
            </h3>
            <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14.5, fontWeight: 600, color: "#fff", textDecoration: "none", background: "#0b0c0e", padding: "11px 20px", borderRadius: 10 }}>
              Create account <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </motion.div>
      <style>{`@media (max-width: 760px){ .accent-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

/* ─────────────────────────── CLOSING ─────────────────────────── */
function ClosingCTA() {
  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "90px 24px 70px", textAlign: "center", position: "relative" }}>
      <div aria-hidden style={{ position: "absolute", bottom: -40, left: "50%", transform: "translateX(-50%)", width: 700, height: 300, background: "radial-gradient(ellipse at center, rgba(94,106,210,0.16), transparent 70%)", filter: "blur(24px)", pointerEvents: "none" }} />
      <motion.div {...reveal} style={{ position: "relative" }}>
        <h2 style={{ fontSize: "clamp(34px, 6vw, 60px)", fontWeight: 600, letterSpacing: "-1.4px", lineHeight: 1.05, margin: "0 0 10px" }}>
          Built for the future.
        </h2>
        <h2 style={{ fontSize: "clamp(34px, 6vw, 60px)", fontWeight: 600, letterSpacing: "-1.4px", lineHeight: 1.05, margin: "0 0 30px", color: C.dim }}>
          Available today.
        </h2>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14.5, fontWeight: 500, color: "#0b0c0e", textDecoration: "none", background: C.text, padding: "12px 24px", borderRadius: 10 }}>
            Start for free <ArrowRight size={15} />
          </Link>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", fontSize: 14.5, fontWeight: 500, color: C.text, textDecoration: "none", background: C.panel, border: `1px solid ${C.border}`, padding: "12px 24px", borderRadius: 10 }}>
            Sign in
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────── FOOTER ─────────────────────────── */
function Footer() {
  const cols = [
    { h: "Product", links: ["Features", "How it works", "Changelog", "Pricing"] },
    { h: "Resources", links: ["Docs", "API", "Status", "Guides"] },
    { h: "Company", links: ["About", "Blog", "Careers", "Contact"] },
    { h: "Legal", links: ["Privacy", "Terms", "Security"] },
  ];
  return (
    <footer style={{ borderTop: `1px solid ${C.borderSoft}`, background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 40px" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(4, 1fr)", gap: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
              <Logo size={26} withWordmark wordmarkSize={15} />
            </div>
            <p style={{ fontSize: 12.5, color: C.dimmer, lineHeight: 1.6, margin: 0, maxWidth: 220 }}>
              Content intelligence for creators. Compare, chat, and improve.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div className="text-label-uppercase" style={{ fontSize: 10.5, color: C.dimmer, marginBottom: 14, letterSpacing: "0.6px" }}>{c.h}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {c.links.map((l) => <a key={l} href="#" style={{ fontSize: 13, color: C.dim, textDecoration: "none" }}>{l}</a>)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 40, paddingTop: 22, borderTop: `1px solid ${C.borderSoft}`, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 12, color: C.dimmer }}>© {new Date().getFullYear()} CreatorLens. All rights reserved.</span>
          <span style={{ fontSize: 12, color: C.dimmer }}>FastAPI · Qdrant · LangChain · Groq · Next.js</span>
        </div>
      </div>
      <style>{`@media (max-width: 760px){ .footer-grid{ grid-template-columns: 1fr 1fr !important; gap: 28px 20px !important; } }`}</style>
    </footer>
  );
}
