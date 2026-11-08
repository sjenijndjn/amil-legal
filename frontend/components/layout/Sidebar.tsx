"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Search,
  BookOpen,
  Scale,
  FileSearch,
  PenTool,
  Library,
  History,
  CheckSquare,
  User,
  Settings,
  HelpCircle,
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
  { label: "Ask Juris", href: "/juris", icon: Sparkles, badge: "AI" },
  { label: "Legal Research", href: "/research", icon: Search },
  { label: "Bare Acts", href: "/bare-acts", icon: BookOpen },
  { label: "Case Laws", href: "/case-laws", icon: Scale },
  { label: "Document Analyzer", href: "/documents", icon: FileSearch },
  { label: "Drafting Studio", href: "/drafting", icon: PenTool },
  { label: "My Legal Library", href: "/library", icon: Library },
  { label: "Research History", href: "/history", icon: History },
  { label: "Tasks and Reminders", href: "/tasks", icon: CheckSquare }
];

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help and Support", href: "/help", icon: HelpCircle }
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
      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onCloseMobile}
          title={isCollapsed ? item.label : undefined}
          className={cn(
            "group flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-[42px] text-sm font-medium transition-all",
            isActive
              ? "bg-gold/15 text-gold border border-gold/40 shadow-sm"
              : "text-ivory-secondary hover:bg-navy-card hover:text-ivory-primary border border-transparent"
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              isActive ? "text-gold" : "text-ivory-secondary group-hover:text-gold"
            )}
          />
          {!isCollapsed && (
            <span className="flex-1 truncate">{item.label}</span>
          )}
          {!isCollapsed && item.badge && (
            <span className="rounded bg-gold/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gold">
              {item.badge}
            </span>
          )}
        </Link>
      );
    });

  const buildSidebarContent = (forceExpanded: boolean) => {
    const isCollapsed = collapsed && !forceExpanded;
    return (
      <div className="flex h-full flex-col bg-navy-secondary border-r border-border-subtle select-none pt-safe pb-safe">
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-border-subtle">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/50 bg-navy-card font-heading text-base font-bold text-gold shadow-gold">
              {BRAND.appName.slice(0, 1)}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-base font-bold tracking-tight text-ivory-primary">
                    {BRAND.appName}
                  </span>
                  <span className="rounded border border-gold/40 bg-gold/10 px-1.5 py-0.2 font-mono text-[10px] text-gold">
                    INDIA
                  </span>
                </div>
                <p className="truncate text-[11px] text-ivory-secondary">
                  {BRAND.assistantTitle}
                </p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-ivory-secondary hover:border-gold hover:text-gold transition-colors"
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
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle text-ivory-secondary hover:text-ivory-primary"
            aria-label="Close navigation drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Middle Navigation (10 Modules) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4">
          {!isCollapsed && (
            <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-wider text-ivory-secondary">
              Legal Workspace (10 Modules)
            </p>
          )}
          <nav className="space-y-1" aria-label="Main navigation">
            {renderLinks(MAIN_NAV_ITEMS, forceExpanded)}
          </nav>
        </div>

        {/* Bottom Navigation (4 Items) */}
        <div className="shrink-0 border-t border-border-subtle px-3 py-3">
          {!isCollapsed && (
            <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-wider text-ivory-secondary">
              Account & System
            </p>
          )}
          <nav className="space-y-1" aria-label="Secondary navigation">
            {renderLinks(BOTTOM_NAV_ITEMS, forceExpanded)}
            <button
              type="button"
              onClick={handleSignOut}
              title={isCollapsed ? "Sign Out" : undefined}
              className="w-full group flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-[42px] text-sm font-medium text-ivory-secondary hover:bg-status-error/15 hover:text-status-error border border-transparent transition-all"
            >
              <LogOut className="h-4 w-4 shrink-0 text-ivory-secondary group-hover:text-status-error" />
              {!isCollapsed && <span className="truncate">Sign Out</span>}
            </button>
          </nav>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:block shrink-0 transition-all duration-200",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {buildSidebarContent(false)}
      </aside>

      {/* Mobile Drawer (Always expanded on iPhone / Android) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
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
