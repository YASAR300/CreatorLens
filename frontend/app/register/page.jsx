'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { AuthLayout, AuthHeading, Field, PrimaryButton, Divider, GoogleButton, A } from "../../components/AuthUI";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, register, googleSignIn } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/app");
  }, [loading, user, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await register(email.trim(), password, name.trim());
      toast.success("Account created — welcome!");
      router.replace("/app");
    } catch (err) {
      toast.error(err?.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async (credential) => {
    try {
      await googleSignIn(credential);
      toast.success("Welcome to CreatorLens!");
      router.replace("/app");
    } catch (err) {
      toast.error(err?.message || "Google sign-up failed.");
    }
  };

  return (
    <AuthLayout
      side={
        <>
          <h2 style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1px", lineHeight: 1.15, margin: "0 0 16px" }}>
            Create your<br />CreatorLens account.
          </h2>
          <p style={{ fontSize: 16, color: A.dim, lineHeight: 1.6, margin: 0, maxWidth: 420 }}>
            Free to start. Compare a YouTube video and an Instagram Reel, then chat with their
            transcripts and metrics — answers cited to the exact second.
          </p>
        </>
      }
    >
      <AuthHeading title="Create account" subtitle="Start comparing videos in seconds." />

      <GoogleButton onCredential={onGoogle} text="Sign up with Google" />
      <Divider />

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field icon={User} type="text" label="Name" placeholder="Your name (optional)" value={name} onChange={setName} autoFocus autoComplete="name" />
        <Field icon={Mail} type="email" label="Email" placeholder="you@example.com" value={email} onChange={setEmail} autoComplete="email" />
        <Field icon={Lock} type="password" label="Password" placeholder="At least 6 characters" value={password} onChange={setPassword} autoComplete="new-password" />
        <PrimaryButton submitting={submitting} label="Create account" />
      </form>

      <p style={{ fontSize: 14, color: A.dim, textAlign: "center", marginTop: 24 }}>
        Already have an account? <Link href="/login" style={{ color: A.text, fontWeight: 500, textDecoration: "none" }}>Sign in</Link>
      </p>
    </AuthLayout>
  );
}
