"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, User, Mail, Lock, ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { notify } = useToast();

  const [displayName, setDisplayName] = useState("Amil");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dpdpConsent, setDpdpConsent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!dpdpConsent) {
      setError("Please acknowledge the DPDP Act 2023 data processing notice.");
      return;
    }

    setSubmitting(true);
    try {
      await register(email.trim(), password, displayName.trim());
      notify({
        title: `Workspace created for ${displayName.trim()}`,
        description: "Welcome to AMIL Legal Intelligence Platform."
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-navy-primary px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-navy-card p-8 shadow-legal">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/60 bg-navy-secondary font-heading text-xl font-bold text-gold shadow-gold mb-3">
            {BRAND.appName.slice(0, 1)}
          </div>
          <h1 className="font-heading text-2xl font-bold text-ivory-primary">
            Create {BRAND.appName} Account
          </h1>
          <p className="mt-1 text-xs text-ivory-secondary">
            Multi-tenant isolated workspace for Indian legal research
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
              htmlFor="reg-name"
              className="block text-xs font-medium text-ivory-secondary mb-1.5"
            >
              Display Name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ivory-secondary" />
              <input
                id="reg-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-10 pr-4 py-2.5 text-sm text-ivory-primary focus:border-gold focus:outline-none"
                placeholder="Amil"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-email"
              className="block text-xs font-medium text-ivory-secondary mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ivory-secondary" />
              <input
                id="reg-email"
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
              htmlFor="reg-password"
              className="block text-xs font-medium text-ivory-secondary mb-1.5"
            >
              Password (minimum 8 characters)
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ivory-secondary" />
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-10 pr-10 py-2.5 text-sm text-ivory-primary focus:border-gold focus:outline-none"
                placeholder="Create a strong password"
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

          <label className="flex items-start gap-2.5 text-xs text-ivory-secondary cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={dpdpConsent}
              onChange={(e) => setDpdpConsent(e.target.checked)}
              className="mt-0.5 rounded border-border-subtle accent-gold"
            />
            <span>
              I consent to workspace data processing under Section 6 of the Digital Personal Data Protection Act, 2023 (with full right to erasure at any time).
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-navy-primary hover:bg-gold-bright transition-colors disabled:opacity-60"
          >
            {submitting ? "Creating Workspace..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-ivory-secondary">
          <span>Already have a workspace?</span>
          <Link href="/login" className="font-semibold text-gold hover:underline">
            Sign In
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ivory-secondary">
          <ShieldCheck className="h-3.5 w-3.5 text-status-success" />
          <span>Tenant-isolated by user_id • Zero Cross-Account Leakage</span>
        </div>
      </div>
    </div>
  );
}
