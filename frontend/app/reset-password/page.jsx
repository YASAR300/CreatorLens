'use client';

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { AuthLayout, AuthHeading, Field, PrimaryButton, A } from "../../components/AuthUI";

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (password !== confirm) { toast.error("Passwords don't match."); return; }
    if (!token) { toast.error("Missing or invalid reset link."); return; }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      toast.success("Password updated — you're signed in.");
      router.replace("/app");
    } catch (err) {
      toast.error(err?.message || "Could not reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      side={
        <>
          <h2 style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1px", lineHeight: 1.15, margin: "0 0 16px" }}>
            Set a new<br />password.
          </h2>
          <p style={{ fontSize: 16, color: A.dim, lineHeight: 1.6, margin: 0, maxWidth: 420 }}>
            Choose a strong password. You'll be signed in automatically once it's saved.
          </p>
        </>
      }
    >
      <AuthHeading title="New password" subtitle="Enter and confirm your new password." />
      {!token ? (
        <div style={{ fontSize: 14, color: A.dim }}>
          This reset link is invalid. <Link href="/forgot-password" style={{ color: A.blue, textDecoration: "none" }}>Request a new one</Link>.
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field icon={Lock} type="password" label="New password" placeholder="At least 6 characters" value={password} onChange={setPassword} autoFocus autoComplete="new-password" />
          <Field icon={Lock} type="password" label="Confirm password" placeholder="Re-enter password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          <PrimaryButton submitting={submitting} label="Update password" />
        </form>
      )}
      <p style={{ fontSize: 14, color: A.dim, textAlign: "center", marginTop: 24 }}>
        <Link href="/login" style={{ color: A.text, fontWeight: 500, textDecoration: "none" }}>Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
