'use client';

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye, ArrowRight, MessageSquareText, BarChart3, Database,
  Zap, ShieldCheck, Quote,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const FEATURES = [
  { icon: BarChart3, title: "Side-by-side metrics", body: "Views, likes, comments, follower counts and engagement rate for a YouTube video and an Instagram Reel — computed live." },
  { icon: MessageSquareText, title: "Chat with transcripts", body: "Ask why one video outperformed the other. Answers stream in real time with inline citations to the exact source chunk." },
  { icon: Database, title: "Vector-grounded RAG", body: "Transcripts are chunked, embedded and stored in Qdrant, so every answer is grounded in real content — not guesses." },
  { icon: Zap, title: "Fast + low cost", body: "Groq Llama 3.3 70B for inference and local embeddings keep latency low and cost near zero at scale." },
  { icon: ShieldCheck, title: "Private to you", body: "Every account's data is isolated. Your analyses and chats are scoped to your user and never shared." },
  { icon: Eye, title: "Creator-first insights", body: "Compare hooks, pacing and strategy. Get concrete, numbered suggestions to improve the weaker video." },
];

const STEPS = [
  { n: "01", t: "Paste two URLs", d: "A YouTube video and an Instagram Reel." },
  { n: "02", t: "We ingest both", d: "Scrape metadata, transcribe audio, embed and index." },
  { n: "03", t: "Ask anything", d: "Chat with the data and get cited, streaming answers." },
];

export default function Landing() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // If already signed in, send straight to the app.
  useEffect(() => {
    if (!loading && user) router.replace("/app");
  }, [loading, user, router]);

  const fadeUp = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  };

  return (
    <div style={{ background: "#000", color: "#f5f5f7", minHeight: "100vh", overflowX: "hidden" }}>
      {/* Ambient glows */}
      <div aria-hidden style={{ position: "fixed", top: -220, left: "50%", transform: "translateX(-50%)", width: 1100, height: 500, background: "radial-gradient(ellipse at center, rgba(0,113,227,0.16), transparent 70%)", filter: "blur(30px)", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden style={{ position: "fixed", bottom: -260, right: -120, width: 700, height: 600, background: "radial-gradient(ellipse at center, rgba(48,209,88,0.10), transparent 70%)", filter: "blur(30px)", pointerEvents: "none", zIndex: 0 }} />

      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(0,0,0,0.55)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#0071e3,#30d158)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,113,227,0.35)" }}>
              <Eye size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.2px" }}>CreatorLens</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/login" style={{ fontSize: 13.5, color: "#cccccc", textDecoration: "none", padding: "8px 12px" }}>Sign in</Link>
            <Link href="/register" style={{ fontSize: 13.5, fontWeight: 500, color: "#fff", textDecoration: "none", background: "#0071e3", padding: "8px 16px", borderRadius: 980, boxShadow: "0 2px 12px rgba(0,113,227,0.35)" }}>
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: 920, margin: "0 auto", padding: "96px 24px 72px", textAlign: "center" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 980, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", fontSize: 12, color: "#86868b", marginBottom: 26 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#30d158" }} />
          RAG-powered creator analytics
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{ fontSize: "clamp(40px, 7vw, 68px)", fontWeight: 600, lineHeight: 1.05, letterSpacing: "-1.5px", margin: "0 0 22px" }}>
          Compare your videos.<br />
          <span style={{ background: "linear-gradient(90deg,#0071e3,#30d158)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Chat with the data.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          style={{ fontSize: 18, color: "#86868b", maxWidth: 600, margin: "0 auto 34px", lineHeight: 1.6 }}>
          Drop in a YouTube video and an Instagram Reel. CreatorLens pulls the metrics,
          transcribes the audio, and lets you ask why one wins — with cited, streaming answers.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 500, color: "#fff", textDecoration: "none", background: "#0071e3", padding: "13px 26px", borderRadius: 980, boxShadow: "0 4px 20px rgba(0,113,227,0.4)" }}>
            Start free <ArrowRight size={16} />
          </Link>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", fontSize: 15, fontWeight: 500, color: "#f5f5f7", textDecoration: "none", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", padding: "13px 26px", borderRadius: 980 }}>
            Sign in
          </Link>
        </motion.div>

        {/* Mock product frame */}
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginTop: 60, borderRadius: 18, border: "1px solid rgba(255,255,255,0.1)", background: "linear-gradient(180deg,#0c0c0c,#070707)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", overflow: "hidden", textAlign: "left" }}>
          <div style={{ height: 38, borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 7, padding: "0 14px" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: 18 }}>
            {[["YouTube", "1.21%", "#ff3b30"], ["Instagram", "3.84%", "#c13584"]].map(([p, er, col]) => (
              <div key={p} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16 }}>
                <div style={{ height: 88, borderRadius: 10, background: `linear-gradient(135deg, ${col}33, transparent)`, marginBottom: 12 }} />
                <div className="text-label-uppercase" style={{ fontSize: 10, color: "#86868b" }}>{p} · Engagement</div>
                <div style={{ fontSize: 26, fontWeight: 700, background: "linear-gradient(90deg,#30d158,#0071e3)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{er}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: 1120, margin: "0 auto", padding: "40px 24px 20px" }}>
        <motion.h2 {...fadeUp} style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 600, letterSpacing: "-0.8px", textAlign: "center", margin: "0 0 12px" }}>
          Everything a creator needs to compare and improve
        </motion.h2>
        <motion.p {...fadeUp} style={{ color: "#86868b", textAlign: "center", maxWidth: 560, margin: "0 auto 48px", fontSize: 16 }}>
          Built on a real RAG pipeline — not canned responses.
        </motion.p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.06, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 22 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(0,113,227,0.12)", border: "1px solid rgba(0,113,227,0.22)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <f.icon size={18} color="#0071e3" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 7px", letterSpacing: "-0.2px" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "#86868b", lineHeight: 1.6, margin: 0 }}>{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: 1120, margin: "0 auto", padding: "64px 24px" }}>
        <motion.h2 {...fadeUp} style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 600, letterSpacing: "-0.8px", textAlign: "center", margin: "0 0 48px" }}>
          Three steps to insight
        </motion.h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {STEPS.map((s, i) => (
            <motion.div key={s.n}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0071e3", marginBottom: 12 }}>{s.n}</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 7px" }}>{s.t}</h3>
              <p style={{ fontSize: 14, color: "#86868b", lineHeight: 1.6, margin: 0 }}>{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", padding: "40px 24px 100px", textAlign: "center" }}>
        <motion.div {...fadeUp} style={{ borderRadius: 24, border: "1px solid rgba(255,255,255,0.1)", background: "linear-gradient(135deg, rgba(0,113,227,0.12), rgba(48,209,88,0.08))", padding: "56px 28px" }}>
          <Quote size={26} color="#0071e3" style={{ marginBottom: 14 }} />
          <h2 style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 600, letterSpacing: "-0.6px", margin: "0 0 14px" }}>
            Stop guessing why content works.
          </h2>
          <p style={{ color: "#86868b", fontSize: 16, margin: "0 0 28px" }}>
            Create a free account and run your first comparison in under a minute.
          </p>
          <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 500, color: "#fff", textDecoration: "none", background: "#0071e3", padding: "13px 28px", borderRadius: 980, boxShadow: "0 4px 20px rgba(0,113,227,0.4)" }}>
            Get started free <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.07)", padding: "24px", textAlign: "center", color: "#48484a", fontSize: 12.5 }}>
        CreatorLens · Built with FastAPI, Qdrant, LangChain & Groq
      </footer>
    </div>
  );
}
