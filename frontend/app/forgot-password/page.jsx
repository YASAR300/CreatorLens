'use client';

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiForgotPassword } from "../../lib/api";
import { AuthLayout, AuthHeading, Field, PrimaryButton, A } from "../../components/AuthUI";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await apiForgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      toast.error(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      side={
        <>
          <h2 style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1px", lineHeight: 1.15, margin: "0 0 16px" }}>
            Forgot your<br />password?
          </h2>
          <p style={{ fontSize: 16, color: A.dim, lineHeight: 1.6, margin: 0, maxWidth: 420 }}>
            No problem. Enter your email and we'll send you a secure link to set a new one.
          </p>
        </>
      }
    >
      {sent ? (
        <div>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(48,209,88,0.12)", border: "1px solid rgba(48,209,88,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <CheckCircle2 size={26} color="#30d158" />
          </div>
          <AuthHeading title="Check your email" subtitle={`If an account exists for ${email}, a reset link is on its way. The link expires in 30 minutes.`} />
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14, color: A.blue, textDecoration: "none" }}>
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <AuthHeading title="Reset password" subtitle="Enter the email tied to your account." />
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field icon={Mail} type="email" label="Email" placeholder="you@example.com" value={email} onChange={setEmail} autoFocus autoComplete="email" />
            <PrimaryButton submitting={submitting} label="Send reset link" />
          </form>
          <p style={{ fontSize: 14, color: A.dim, textAlign: "center", marginTop: 24 }}>
            <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: A.text, fontWeight: 500, textDecoration: "none" }}>
              <ArrowLeft size={14} /> Back to sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
