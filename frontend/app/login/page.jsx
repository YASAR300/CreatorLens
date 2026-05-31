'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Loader2, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/app");
  }, [loading, user, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back!");
      router.replace("/app");
    } catch (err) {
      toast.error(err?.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return <AuthShell title="Sign in" subtitle="Welcome back to CreatorLens">
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} autoFocus />
      <Field icon={Lock} type="password" placeholder="Password" value={password} onChange={setPassword} />
      <SubmitButton submitting={submitting} label="Sign in" />
    </form>
    <p style={{ fontSize: 13, color: "#86868b", textAlign: "center", marginTop: 18 }}>
      New here? <Link href="/register" style={{ color: "#0071e3", textDecoration: "none" }}>Create an account</Link>
    </p>
  </AuthShell>;
}

/* Shared bits (kept local to avoid extra files) */
export function AuthShell({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#f5f5f7", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)", width: 900, height: 420, background: "radial-gradient(ellipse at center, rgba(0,113,227,0.16), transparent 70%)", filter: "blur(30px)", pointerEvents: "none" }} />
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380, background: "rgba(12,12,12,0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 30, boxShadow: "0 24px 70px rgba(0,0,0,0.6)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", marginBottom: 22 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#0071e3,#30d158)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,113,227,0.35)" }}>
            <Eye size={17} color="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#f5f5f7" }}>CreatorLens</span>
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.4px" }}>{title}</h1>
        <p style={{ fontSize: 14, color: "#86868b", margin: "0 0 22px" }}>{subtitle}</p>
        {children}
      </motion.div>
    </div>
  );
}

export function Field({ icon: Icon, type, placeholder, value, onChange, autoFocus }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", display: "flex", pointerEvents: "none" }}>
        <Icon size={15} color="#86868b" />
      </span>
      <input
        type={type} placeholder={placeholder} value={value} required autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="apple-focus"
        style={{
          width: "100%", height: 46, background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
          padding: "0 14px 0 40px", fontSize: 14, color: "#f5f5f7", outline: "none", fontFamily: "inherit",
        }}
      />
    </div>
  );
}

export function SubmitButton({ submitting, label }) {
  return (
    <button type="submit" disabled={submitting}
      style={{
        height: 46, marginTop: 4, background: "#0071e3", border: "none", borderRadius: 12,
        fontSize: 15, fontWeight: 500, color: "#fff", cursor: submitting ? "not-allowed" : "pointer",
        opacity: submitting ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        fontFamily: "inherit", boxShadow: "0 2px 14px rgba(0,113,227,0.35)",
      }}>
      {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : label}
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </button>
  );
}
