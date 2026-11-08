"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Search,
  BookOpen,
  Grid
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_MOBILE_TABS = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Ask Juris", href: "/juris", icon: Sparkles },
  { label: "Research", href: "/research", icon: Search },
  { label: "Bare Acts", href: "/bare-acts", icon: BookOpen }
];

export function MobileBottomNav({
  onOpenAllModules
}: {
  onOpenAllModules: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-border-subtle bg-navy-secondary/95 backdrop-blur-md pb-safe"
    >
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {PRIMARY_MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-h-[48px] rounded-lg transition-colors",
                isActive
                  ? "text-gold font-semibold"
                  : "text-ivory-secondary hover:text-ivory-primary"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-gold")} />
              <span className="text-[11px] leading-none tracking-tight">
                {tab.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenAllModules}
          className="flex flex-col items-center justify-center gap-1 min-h-[48px] rounded-lg text-ivory-secondary hover:text-gold transition-colors"
          aria-label="Open all 10 legal modules"
        >
          <Grid className="h-5 w-5" />
          <span className="text-[11px] leading-none tracking-tight">
            All Modules
          </span>
        </button>
      </div>
    </nav>
  );
}
