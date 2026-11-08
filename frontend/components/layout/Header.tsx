"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

export function Header({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const router = useRouter();
  const { user, theme, setTheme } = useAuth();
  const [quickQuery, setQuickQuery] = useState("");

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickQuery.trim();
    if (!q) {
      router.push("/research");
      return;
    }
    router.push(`/research?q=${encodeURIComponent(q)}`);
    setQuickQuery("");
  };

  const initial = (user.display_name || BRAND.ownerFirstName || "A").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-white/[0.06] bg-[#070D18]/70 backdrop-blur-2xl pt-safe">
      <div className="flex h-16 items-center justify-between gap-3 sm:gap-6 px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Nav Toggle & Breadcrumb / Status */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="lg:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white hover:border-gold/40"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* Center / Search Pill Bar (Exact match to image) */}
        <form onSubmit={handleQuickSearch} className="relative flex-1 max-w-xl mx-auto">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Search acts, cases, sections, or ask Juris..."
              className="w-full rounded-full border border-white/10 bg-slate-950/60 pl-10 pr-12 py-2 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30 backdrop-blur-md shadow-inner transition-all"
            />
            <div className="pointer-events-none absolute right-3 flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
              ⌘K
            </div>
          </div>
        </form>

        {/* Right Action Icons: Notification Bell, Theme Toggle, User Avatar */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          {/* Ask Juris Quick Action Pill */}
          <Link
            href="/juris"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold text-gold hover:bg-gold/20 transition-all shadow-[0_0_15px_rgba(214,182,109,0.15)]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ask Juris</span>
          </Link>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-300 hover:border-gold/40 hover:text-gold hover:bg-white/[0.08] transition-all"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Notification Bell with indicator dot */}
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-300 hover:border-gold/40 hover:text-gold hover:bg-white/[0.08] transition-all"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          </button>

          {/* User Profile Avatar (Exact Gold Circle with 'A' as in image) */}
          <Link
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#E6CA85] via-[#D6B66D] to-[#B89647] text-slate-950 font-bold text-sm shadow-[0_0_15px_rgba(214,182,109,0.3)] hover:scale-105 transition-transform"
            title={`${user.display_name || BRAND.ownerName} Profile`}
          >
            {initial}
          </Link>
        </div>
      </div>
    </header>
  );
}
