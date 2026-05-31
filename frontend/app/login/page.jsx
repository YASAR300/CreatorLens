'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { AuthLayout, AuthHeading, Field, PrimaryButton, Divider, GoogleButton, A } from "../../components/AuthUI";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, googleSignIn } = useAuth();
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

  const onGoogle = async (credential) => {
    try {
      await googleSignIn(credential);
      toast.success("Signed in with Google.");
      router.replace("/app");
    } catch (err) {
      toast.error(err?.message || "Google sign-in failed.");
    }
  };

  return (
    <AuthLayout>
      <AuthHeading title="Sign in" subtitle="Welcome back to CreatorLens." />

      <GoogleButton onCredential={onGoogle} text="Sign in with Google" />
      <Divider />

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field icon={Mail} type="email" label="Email" placeholder="you@example.com" value={email} onChange={setEmail} autoFocus autoComplete="email" />
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: A.dim }}>Password</span>
            <Link href="/forgot-password" style={{ fontSize: 12.5, color: A.blue, textDecoration: "none" }}>Forgot password?</Link>
          </div>
          <Field icon={Lock} type="password" placeholder="••••••••" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        <PrimaryButton submitting={submitting} label="Sign in" />
      </form>

      <p style={{ fontSize: 14, color: A.dim, textAlign: "center", marginTop: 24 }}>
        New to CreatorLens? <Link href="/register" style={{ color: A.text, fontWeight: 500, textDecoration: "none" }}>Create an account</Link>
      </p>
    </AuthLayout>
  );
}
