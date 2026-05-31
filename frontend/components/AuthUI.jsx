'use client';

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Logo from "./Logo";

/* ── 95% dark palette, white text ── */
export const A = {
  bg: "#050506",
  panel: "#0c0d0f",
  panel2: "#121316",
  field: "#0f1012",
  border: "rgba(255,255,255,0.09)",
  borderHover: "rgba(255,255,255,0.18)",
  text: "#ffffff",
  dim: "#9aa0a6",
  dimmer: "#5f636a",
  blue: "#5e6ad2",
  blueHover: "#6b77e0",
};

/**
 * AuthLayout — full-screen split: a branded left panel (hidden on mobile) and
 * a large centered form card on the right. Near-black, white text.
 */
export function AuthLayout({ children, side }) {
  return (
    <div style={{ minHeight: "100vh", background: A.bg, color: A.text, display: "grid", gridTemplateColumns: "1fr 1fr" }} className="auth-grid">
      {/* Left brand panel */}
      <div className="auth-brand" style={{
        position: "relative", overflow: "hidden",
        borderRight: `1px solid ${A.border}`,
        background: "linear-gradient(160deg, #0a0b14 0%, #050506 60%)",
        display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px 56px",
      }}>
        <div aria-hidden style={{ position: "absolute", top: -160, left: -80, width: 560, height: 420, background: "radial-gradient(ellipse at center, rgba(94,106,210,0.28), transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
        <div aria-hidden style={{ position: "absolute", bottom: -200, right: -120, width: 520, height: 460, background: "radial-gradient(ellipse at center, rgba(48,209,88,0.14), transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />

        <Link href="/" style={{ position: "relative", textDecoration: "none", zIndex: 1 }}>
          <Logo size={30} withWordmark />
        </Link>

        <div style={{ position: "relative", zIndex: 1 }}>
          {side || (
            <>
              <h2 style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1px", lineHeight: 1.15, margin: "0 0 16px" }}>
                Compare your videos.<br />Chat with the data.
              </h2>
              <p style={{ fontSize: 16, color: A.dim, lineHeight: 1.6, margin: 0, maxWidth: 420 }}>
                CreatorLens grounds every answer in real transcripts and metrics — so you know
                exactly why one video outperformed the other.
              </p>
              <div style={{ display: "flex", gap: 22, marginTop: 36 }}>
                {[["Cited", "answers"], ["Streaming", "chat"], ["Per-second", "deep links"]].map(([a, b]) => (
                  <div key={a}>
                    <div style={{ fontSize: 18, fontWeight: 700, background: "linear-gradient(90deg,#30d158,#5e6ad2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{a}</div>
                    <div style={{ fontSize: 13, color: A.dimmer }}>{b}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ position: "relative", zIndex: 1, fontSize: 12.5, color: A.dimmer }}>
          © {new Date().getFullYear()} CreatorLens
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-pane" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative" }}>
        <div aria-hidden className="auth-mobile-glow" style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 520, height: 300, background: "radial-gradient(ellipse at center, rgba(94,106,210,0.16), transparent 70%)", filter: "blur(30px)", pointerEvents: "none", display: "none" }} />
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
          {/* Mobile logo (brand panel is hidden) */}
          <Link href="/" className="auth-mobile-logo" style={{ display: "none", textDecoration: "none", marginBottom: 28, justifyContent: "center" }}>
            <Logo size={30} withWordmark />
          </Link>
          {children}
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-brand { display: none !important; }
          .auth-mobile-logo { display: flex !important; }
          .auth-mobile-glow { display: block !important; }
        }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

export function AuthHeading({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.6px", margin: "0 0 8px", color: A.text }}>{title}</h1>
      <p style={{ fontSize: 15, color: A.dim, margin: 0, lineHeight: 1.5 }}>{subtitle}</p>
    </div>
  );
}

export function Field({ icon: Icon, type = "text", placeholder, value, onChange, autoFocus, label, autoComplete }) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  const inputType = isPw ? (show ? "text" : "password") : type;
  return (
    <label style={{ display: "block" }}>
      {label && <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: A.dim, marginBottom: 7 }}>{label}</span>}
      <div style={{ position: "relative" }}>
        {Icon && (
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex", pointerEvents: "none" }}>
            <Icon size={16} color={A.dimmer} />
          </span>
        )}
        <input
          type={inputType} placeholder={placeholder} value={value} required autoFocus={autoFocus}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="auth-input"
          style={{
            width: "100%", height: 52, background: A.field,
            border: `1px solid ${A.border}`, borderRadius: 13,
            padding: `0 ${isPw ? 44 : 16}px 0 ${Icon ? 42 : 16}px`,
            fontSize: 15, color: A.text, outline: "none", fontFamily: "inherit",
            transition: "border-color 150ms ease, box-shadow 150ms ease, background 150ms ease",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(94,106,210,0.6)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(94,106,210,0.22)"; e.currentTarget.style.background = "#121316"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = A.border; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = A.field; }}
        />
        {isPw && (
          <button type="button" onClick={() => setShow((s) => !s)} tabIndex={-1}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: A.dimmer, cursor: "pointer", display: "flex", padding: 4 }}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </label>
  );
}

export function PrimaryButton({ submitting, label, disabled }) {
  return (
    <button type="submit" disabled={submitting || disabled}
      style={{
        height: 52, marginTop: 4, width: "100%",
        background: A.blue, border: "none", borderRadius: 13,
        fontSize: 15.5, fontWeight: 600, color: "#fff",
        cursor: (submitting || disabled) ? "not-allowed" : "pointer",
        opacity: (submitting || disabled) ? 0.7 : 1,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
        fontFamily: "inherit", boxShadow: "0 4px 18px rgba(94,106,210,0.4)",
        transition: "background 150ms ease",
      }}
      onMouseEnter={(e) => { if (!submitting && !disabled) e.currentTarget.style.background = A.blueHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = A.blue; }}
    >
      {submitting ? <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> : label}
    </button>
  );
}

export function Divider({ text = "or" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "22px 0" }}>
      <div style={{ flex: 1, height: 1, background: A.border }} />
      <span style={{ fontSize: 12.5, color: A.dimmer }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: A.border }} />
    </div>
  );
}

/**
 * GoogleButton — renders Google Identity Services. If NEXT_PUBLIC_GOOGLE_CLIENT_ID
 * is configured, it shows the real Google credential flow; otherwise it renders a
 * disabled, clearly-labeled button so the UI is complete either way.
 */
export function GoogleButton({ onCredential, text = "Continue with Google" }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    const id = "google-gsi-script";
    function init() {
      if (!window.google?.accounts?.id || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => onCredential?.(resp.credential),
      });
      ref.current.innerHTML = "";
      window.google.accounts.id.renderButton(ref.current, {
        theme: "filled_black", size: "large", shape: "pill",
        text: "continue_with", width: 400, logo_alignment: "center",
      });
      setReady(true);
    }
    if (document.getElementById(id)) { init(); return; }
    const s = document.createElement("script");
    s.id = id; s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.defer = true;
    s.onload = init;
    document.body.appendChild(s);
  }, [clientId, onCredential]);

  if (!clientId) {
    return (
      <button type="button" disabled title="Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable"
        style={{
          height: 52, width: "100%", background: "#0f1012", border: `1px solid ${A.border}`,
          borderRadius: 13, color: A.dim, fontSize: 14.5, fontWeight: 500, cursor: "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit",
        }}>
        <GoogleIcon /> {text}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div ref={ref} style={{ display: "flex", justifyContent: "center", minHeight: 44 }} />
      {!ready && (
        <div style={{ height: 52, width: "100%", background: "#0f1012", border: `1px solid ${A.border}`, borderRadius: 13, color: A.dim, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <GoogleIcon /> {text}
        </div>
      )}
    </div>
  );
}

export function GoogleIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
