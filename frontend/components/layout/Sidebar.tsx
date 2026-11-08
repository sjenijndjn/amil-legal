"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Search,
  BookOpen,
  Scale,
  FileText,
  PenTool,
  Bookmark,
  Calendar,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Juris – Legal AI", href: "/juris", icon: Sparkles },
  { label: "Legal Research", href: "/research", icon: Search },
  { label: "Bare Acts", href: "/bare-acts", icon: BookOpen },
  { label: "Case Laws", href: "/case-laws", icon: Scale },
  { label: "Documents & OCR", href: "/documents", icon: FileText },
  { label: "Drafting Studio", href: "/drafting", icon: PenTool },
  { label: "My Library", href: "/library", icon: Bookmark },
  { label: "Tasks & Reminders", href: "/tasks", icon: Calendar },
  { label: "Settings", href: "/settings", icon: Settings }
];

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { notify } = useToast();

  const handleSignOut = async () => {
    await logout();
    notify({
      title: "Signed out of workspace",
      description: "Your session token has been revoked.",
      variant: "info"
    });
    router.push("/login");
  };

  const renderLinks = (items: NavItem[], forceExpanded: boolean = false) =>
    items.map((item) => {
      const Icon = item.icon;
      const isCollapsed = collapsed && !forceExpanded;
      const isActive =
        item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onCloseMobile}
          title={isCollapsed ? item.label : undefined}
          className={cn(
            "group relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 min-h-[44px] text-sm font-medium transition-all duration-200",
            isActive
              ? "glass-nav-active text-white font-semibold"
              : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent"
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors duration-200",
              isActive ? "text-gold drop-shadow-[0_0_8px_rgba(214,182,109,0.5)]" : "text-slate-400 group-hover:text-gold"
            )}
          />
          {!isCollapsed && (
            <span className="flex-1 truncate tracking-tight">{item.label}</span>
          )}
          {!isCollapsed && item.badge && (
            <span className="rounded-full bg-gold/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-gold border border-gold/30">
              {item.badge}
            </span>
          )}
        </Link>
      );
    });

  const buildSidebarContent = (forceExpanded: boolean) => {
    const isCollapsed = collapsed && !forceExpanded;
    return (
      <div className="flex h-full flex-col bg-[#070D18]/80 backdrop-blur-2xl border-r border-white/[0.06] select-none pt-safe pb-safe shadow-2xl">
        {/* Brand Header */}
        <div className="flex h-20 shrink-0 items-center justify-between px-5 border-b border-white/[0.05]">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden"
          >
            {/* Scales Logo with Golden Ambient Glow */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent border border-gold/40 shadow-[0_0_15px_rgba(214,182,109,0.2)]">
              <Scale className="h-5 w-5 text-gold" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading text-lg font-bold tracking-tight text-white">
                    {BRAND.appName}
                  </span>
                  <span className="flex h-4 items-center rounded border border-white/10 bg-white/5 px-1 font-mono text-[9px] text-slate-400">
                    ⌘K
                  </span>
                </div>
                <p className="truncate text-[11px] text-slate-400 font-normal">
                  Legal Intelligence Platform
                </p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-slate-400 hover:border-gold/40 hover:text-gold hover:bg-white/[0.05] transition-all"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white"
            aria-label="Close navigation drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 space-y-1">
          <nav className="space-y-1" aria-label="Main navigation">
            {renderLinks(MAIN_NAV_ITEMS, forceExpanded)}
          </nav>
        </div>

        {/* Bottom Card / Badge (Indian LegalTech Powered by AI) */}
        {!isCollapsed && (
          <div className="p-3 shrink-0">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-3 text-center shadow-lg backdrop-blur-xl">
              <div className="relative mx-auto mb-2 flex h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-950/60 border border-white/5">
                {/* Supreme court graphic illustration */}
                <Image
                  src="/sidebar-sc-badge.jpg"
                  alt="Supreme Court of India"
                  width={140}
                  height={50}
                  className="object-contain opacity-90 transition-opacity hover:opacity-100"
                  unoptimized
                />
              </div>
              <p className="font-heading text-xs font-semibold text-white tracking-tight">
                Indian LegalTech
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                Powered by AI
              </p>
            </div>
          </div>
        )}

        {/* Sign Out Button */}
        <div className="shrink-0 border-t border-white/[0.05] px-3 py-2.5">
          <button
            type="button"
            onClick={handleSignOut}
            title={isCollapsed ? "Sign Out" : undefined}
            className="w-full group flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 border border-transparent transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-rose-400" />
            {!isCollapsed && <span className="truncate">Sign Out</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:block shrink-0 transition-all duration-300 z-20",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {buildSidebarContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-72 max-w-[86vw] h-[100dvh]">
            {buildSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
