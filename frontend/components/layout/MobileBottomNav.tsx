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
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-white/[0.08] bg-[#070D18]/85 backdrop-blur-2xl pb-safe shadow-[0_-10px_25px_rgba(0,0,0,0.5)]"
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
                "flex flex-col items-center justify-center gap-1 min-h-[48px] rounded-xl transition-all",
                isActive
                  ? "text-gold font-semibold scale-105"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-transform", isActive && "text-gold drop-shadow-[0_0_8px_rgba(214,182,109,0.5)]")} />
              <span className="text-[10px] leading-none tracking-tight">
                {tab.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenAllModules}
          className="flex flex-col items-center justify-center gap-1 min-h-[48px] rounded-xl text-slate-400 hover:text-gold transition-colors"
          aria-label="Open all 10 legal modules"
        >
          <Grid className="h-5 w-5" />
          <span className="text-[10px] leading-none tracking-tight">
            All Modules
          </span>
        </button>
      </div>
    </nav>
  );
}
