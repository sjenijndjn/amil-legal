import React from "react";
import { cn } from "@/lib/utils";
import { LegislationStatus, PrecedentStatus } from "@/lib/types";

export function Badge({
  children,
  variant = "default",
  className
}: {
  children: React.ReactNode;
  variant?: "default" | "gold" | "success" | "error" | "warning" | "outline" | "mono";
  className?: string;
}) {
  const styles: Record<string, string> = {
    default: "bg-white/[0.04] text-slate-300 border-white/10 backdrop-blur-md",
    gold: "bg-gold/15 text-gold border-gold/40 backdrop-blur-md shadow-[0_0_12px_rgba(214,182,109,0.15)]",
    success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 backdrop-blur-md shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    error: "bg-rose-500/15 text-rose-300 border-rose-500/30 backdrop-blur-md shadow-[0_0_12px_rgba(244,63,94,0.15)]",
    warning: "bg-amber-500/15 text-amber-300 border-amber-500/30 backdrop-blur-md shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    outline: "bg-transparent text-slate-300 border-white/10 backdrop-blur-md",
    mono: "bg-slate-950/60 text-gold border-gold/30 font-mono backdrop-blur-md"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function PrecedentBadge({ status }: { status: PrecedentStatus }) {
  switch (status) {
    case "BINDING":
      return <Badge variant="success">● BINDING PRECEDENT</Badge>;
    case "PERSUASIVE":
      return <Badge variant="gold">● PERSUASIVE AUTHORITY</Badge>;
    case "DISTINGUISHED":
      return <Badge variant="warning">▲ DISTINGUISHED</Badge>;
    case "OVERRULED":
      return <Badge variant="error">✕ OVERRULED — DO NOT CITE</Badge>;
    case "REVERSED":
      return <Badge variant="error">✕ REVERSED ON APPEAL</Badge>;
    case "STAYED":
      return <Badge variant="warning">⏸ OPERATION STAYED</Badge>;
    case "PENDING_VERIFICATION":
    default:
      return <Badge variant="default">⏳ PENDING VERIFICATION</Badge>;
  }
}

export function StatuteStatusBadge({ status }: { status: LegislationStatus }) {
  if (status === "CURRENT") {
    return <Badge variant="success">CURRENT ENACTED LAW</Badge>;
  }
  return <Badge variant="warning">HISTORICAL / REPEALED (SAVINGS CLAUSE)</Badge>;
}
