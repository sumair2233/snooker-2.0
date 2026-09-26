"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, User, Shield, KeyRound, Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !pin.trim()) {
      setError("Please enter your Username / Staff ID and PIN");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        username: username.trim(),
        pin: pin.trim(),
        redirect: false,
      });

      if (res?.error) {
        setError(res.error || "Invalid username or PIN");
      } else {
        // Direct to appropriate starting page
        if (username.toLowerCase() === "admin") {
          router.push("/dashboard");
        } else {
          router.push("/live");
        }
        router.refresh();
      }
    } catch (err: unknown) {
      setError("An unexpected error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (role: "admin" | "employee") => {
    if (role === "admin") {
      setUsername("admin");
      setPin("1234");
    } else {
      setUsername("emp786");
      setPin("7860");
    }
    setError("");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040a07] via-[#08150f] to-[#040a07] p-4">
      {/* Decorative background billiard glow effects */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl border border-emerald-900/60 bg-[#0a1811]/90 p-8 shadow-2xl backdrop-blur-xl">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-[#0c2417] border border-amber-500/40 shadow-lg shadow-emerald-950">
            <span className="text-3xl">🎱</span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Green Baize
          </h1>
          <p className="text-xs uppercase tracking-widest text-amber-400 font-bold mt-0.5">
            Snooker Club Management System
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Sign in to start your shift or manage club operations
          </p>
        </div>

        {/* Demo Quick Login buttons */}
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block text-center mb-2">
            ⚡ Quick 1-Click Demo Login
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDemoAccount("admin")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/50 bg-[#162719] hover:bg-[#1f3724] px-3 py-2 text-xs font-bold text-amber-300 shadow transition-all active:scale-95"
            >
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span>Admin Demo</span>
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount("employee")}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/50 bg-[#122b1c] hover:bg-[#1a3d28] px-3 py-2 text-xs font-bold text-emerald-300 shadow transition-all active:scale-95"
            >
              <User className="h-3.5 w-3.5 text-emerald-400" />
              <span>Employee Demo</span>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Admin: <code className="text-amber-300 font-mono">admin / 1234</code> • Staff: <code className="text-emerald-300 font-mono">emp786 / 7860</code>
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-800/60 bg-rose-950/50 p-3 text-xs text-rose-300 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Staff ID / Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-emerald-500/70" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin or emp786"
                className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d2116] pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              4-Digit PIN or Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-amber-500/70" />
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d2116] pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 py-3 text-sm font-bold uppercase tracking-wider text-gray-950 shadow-xl shadow-amber-500/20 transition-all disabled:opacity-50 active:scale-98"
          >
            <span>{loading ? "Authenticating..." : "Sign In to Station"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-8 border-t border-[#163022] pt-4 text-center">
          <p className="text-[11px] text-gray-500">
            Powered by Next.js 14+ • Vercel Postgres & KV Architecture
          </p>
        </div>
      </div>
    </div>
  );
}
