"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Sparkles,
  Sun,
  Moon,
  ShieldCheck,
  UserCircle2
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

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-border-subtle bg-navy-secondary/95 backdrop-blur-md pt-safe">
      <div className="flex h-16 items-center justify-between gap-2.5 sm:gap-4 px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5 flex-1 min-w-0 max-w-xl">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-ivory-secondary hover:text-ivory-primary hover:border-gold"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <form onSubmit={handleQuickSearch} className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ivory-secondary" />
            <input
              type="search"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Search BNS/BNSS/BSA, IPC/CrPC, e-SCR..."
              className="w-full rounded-lg border border-border-subtle bg-navy-card pl-9 pr-3 py-2 text-xs sm:text-sm text-ivory-primary placeholder:text-ivory-secondary/75 focus:border-gold focus:outline-none"
            />
          </form>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden xl:flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-card px-3 py-1.5 text-xs text-ivory-secondary">
            <ShieldCheck className="h-3.5 w-3.5 text-status-success" />
            <span>Jurisdiction:</span>
            <span className="font-medium text-ivory-primary">{BRAND.jurisdiction}</span>
          </div>

          <Link
            href="/juris"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-gold/50 bg-gold/15 px-3 py-2 min-h-[38px] text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ask Juris</span>
          </Link>

          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle bg-navy-card text-ivory-secondary hover:border-gold hover:text-gold transition-colors"
            aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} theme`}
            title={`Switch to ${theme === "dark" ? "Ivory Light" : "Midnight Navy Dark"} theme`}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-lg border border-border-subtle bg-navy-card px-2.5 sm:px-3 py-1.5 min-h-[40px] hover:border-gold transition-colors"
          >
            <UserCircle2 className="h-5 w-5 text-gold shrink-0" />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-ivory-primary leading-tight">
                {user.display_name || BRAND.ownerFirstName}
              </p>
              <p className="font-mono text-[10px] text-ivory-secondary leading-tight">
                {BRAND.ownerName}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
