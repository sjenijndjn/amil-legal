"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck, Sparkles, Lock, Mail } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { notify } = useToast();

  const [email, setEmail] = useState<string>(BRAND.ownerEmail);
  const [password, setPassword] = useState<string>("AmilLegal#2025");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      notify({
        title: "Welcome back, Amil.",
        description: "Authenticated into your personal legal intelligence workspace."
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOneClickOwnerLogin = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await login(BRAND.ownerEmail, "AmilLegal#2025");
      notify({
        title: "Welcome back, Amil.",
        description: "Owner workspace session restored."
      });
      router.push("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-navy-primary px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-navy-card p-8 shadow-legal">
        {/* Brand Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/60 bg-navy-secondary font-heading text-xl font-bold text-gold shadow-gold mb-3">
            {BRAND.appName.slice(0, 1)}
          </div>
          <h1 className="font-heading text-2xl font-bold text-ivory-primary">
            {BRAND.appName} Legal Intelligence
          </h1>
          <p className="mt-1 text-xs text-ivory-secondary">
            {BRAND.assistantTitle} • {BRAND.jurisdiction}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-status-error/50 bg-status-error/15 px-3.5 py-2.5 text-xs text-status-error"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-medium text-ivory-secondary mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ivory-secondary" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-10 pr-4 py-2.5 text-sm text-ivory-primary focus:border-gold focus:outline-none"
                placeholder="amil@amillegal.in"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-ivory-secondary mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ivory-secondary" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-10 pr-10 py-2.5 text-sm text-ivory-primary focus:border-gold focus:outline-none"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ivory-secondary hover:text-ivory-primary"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-navy-primary hover:bg-gold-bright transition-colors disabled:opacity-60"
          >
            {submitting ? "Signing In..." : "Sign In to Workspace"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border-subtle" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-ivory-secondary">
            Quick Owner Access
          </span>
          <div className="h-px flex-1 bg-border-subtle" />
        </div>

        <button
          type="button"
          onClick={handleOneClickOwnerLogin}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-gold/50 bg-gold/10 px-4 py-2.5 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          <span>One-Click Sign In as {BRAND.ownerName}</span>
        </button>

        <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-ivory-secondary">
          <span>New user account?</span>
          <Link href="/register" className="font-semibold text-gold hover:underline">
            Create Workspace Account
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ivory-secondary">
          <ShieldCheck className="h-3.5 w-3.5 text-status-success" />
          <span>Argon2id + JWT Session • DPDP Act 2023 Compliant</span>
        </div>
      </div>
    </div>
  );
}
