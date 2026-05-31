'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiLogin, apiRegister, apiLogout, apiMe } from "../lib/api";

const AuthContext = createContext(null);

const LS_KEY = "creatorlens_user";

export function AuthProvider({ children }) {
  // Hydrate instantly from localStorage via a lazy initializer (no effect needed).
  const [user, setUser] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem(LS_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // On mount: verify the session with the server via the httpOnly cookie.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiMe();
        if (cancelled) return;
        setUser(me);
        localStorage.setItem(LS_KEY, JSON.stringify(me));
      } catch {
        if (cancelled) return;
        setUser(null);
        localStorage.removeItem(LS_KEY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((u) => {
    setUser(u);
    try { localStorage.setItem(LS_KEY, JSON.stringify(u)); } catch { /* ignore */ }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiLogin(email, password);
    persist(res.user);
    return res.user;
  }, [persist]);

  const register = useCallback(async (email, password, name) => {
    const res = await apiRegister(email, password, name);
    persist(res.user);
    return res.user;
  }, [persist]);

  const logout = useCallback(async () => {
    try { await apiLogout(); } catch { /* ignore */ }
    setUser(null);
    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem("creatorlens_last_analysis");
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
