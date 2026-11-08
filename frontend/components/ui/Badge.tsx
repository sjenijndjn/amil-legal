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
    default: "bg-navy-secondary text-ivory-secondary border-border-subtle",
    gold: "bg-gold/15 text-gold border-gold/40",
    success: "bg-status-success/15 text-status-success border-status-success/40",
    error: "bg-status-error/15 text-status-error border-status-error/40",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/40",
    outline: "bg-transparent text-ivory-secondary border-border-subtle",
    mono: "bg-navy-primary text-gold border-border-subtle font-mono"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium",
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
      return <Badge variant="success">BINDING PRECEDENT</Badge>;
    case "PERSUASIVE":
      return <Badge variant="gold">PERSUASIVE AUTHORITY</Badge>;
    case "DISTINGUISHED":
      return <Badge variant="warning">DISTINGUISHED</Badge>;
    case "OVERRULED":
      return <Badge variant="error">OVERRULED — DO NOT CITE AS GOOD LAW</Badge>;
    default:
      return <Badge variant="default">PENDING VERIFICATION</Badge>;
  }
}

export function StatuteStatusBadge({ status }: { status: LegislationStatus }) {
  if (status === "CURRENT") {
    return <Badge variant="success">CURRENT ENACTED LAW</Badge>;
  }
  return <Badge variant="warning">HISTORICAL / REPEALED (SAVINGS CLAUSE)</Badge>;
}
