'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { AuthShell, Field, SubmitButton } from "../login/page";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, register } = useAuth();
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

  return (
    <AuthShell title="Create account" subtitle="Start comparing videos in seconds">
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field icon={User} type="text" placeholder="Name (optional)" value={name} onChange={setName} autoFocus />
        <Field icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} />
        <Field icon={Lock} type="password" placeholder="Password (min 6 chars)" value={password} onChange={setPassword} />
        <SubmitButton submitting={submitting} label="Create account" />
      </form>
      <p style={{ fontSize: 13, color: "#86868b", textAlign: "center", marginTop: 18 }}>
        Already have an account? <Link href="/login" style={{ color: "#0071e3", textDecoration: "none" }}>Sign in</Link>
      </p>
    </AuthShell>
  );
}
