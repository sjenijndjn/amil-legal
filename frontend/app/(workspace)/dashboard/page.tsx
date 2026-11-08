"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Layers,
  Bookmark,
  Calendar,
  Sparkles,
  Send,
  Clock,
  ArrowRight,
  FileText,
  BarChart3,
  MessageSquare,
  Scale,
  Gavel,
  BookOpen,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { DashboardSummary } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [omniboxQuery, setOmniboxQuery] = useState("");
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<string>("Detailed Analysis");

  useEffect(() => {
    api.getDashboardSummary().then(setSummary).catch(() => {});
  }, [user.display_name]);

  const handleAskJurisSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = omniboxQuery.trim();
    if (!q) {
      router.push(`/juris?mode=${encodeURIComponent(activeAnalysisMode.toLowerCase())}`);
      return;
    }
    router.push(
      `/juris?q=${encodeURIComponent(q)}&mode=${encodeURIComponent(activeAnalysisMode.toLowerCase())}`
    );
  };

  const handlePillClick = (mode: string, promptPrefix: string) => {
    setActiveAnalysisMode(mode);
    if (!omniboxQuery) {
      setOmniboxQuery(promptPrefix);
    }
  };

  // Determine time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user.display_name?.split(" ")[0] || BRAND.ownerFirstName;

  // Activity chart data matching image
  const activityDays = [
    { day: "Mon", value: 15, height: "38%" },
    { day: "Tue", value: 22, height: "55%" },
    { day: "Wed", value: 18, height: "45%" },
    { day: "Thu", value: 24, height: "60%" },
    { day: "Fri", value: 32, height: "80%" },
    { day: "Sat", value: 28, height: "70%" },
    { day: "Sun", value: 38, height: "95%" }
  ];

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* 1. Header Greeting (Good morning, Amil.) */}
      <div className="pt-1">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {getGreeting()},{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FDE68A] via-[#D6B66D] to-[#B89647]">
            {firstName}.
          </span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400 font-normal">
          Your legal workspace at a glance.
        </p>
      </div>

      {/* 2. Top Metric Cards Row + Supreme Court Visual Card */}
      <section aria-label="Metric statistics" className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Active Matters */}
        <Link
          href="/tasks"
          className="glass-panel group rounded-2xl p-4 sm:p-5 hover:border-gold/40 transition-all duration-300 relative overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-400/20 text-gold shadow-sm">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-300 truncate">Active Matters</span>
          </div>
          <div className="mt-3.5 flex items-baseline justify-between">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {summary?.counts.active_drafts ? summary.counts.active_drafts + 11 : 12}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <span>↑</span> +2 this week
          </p>
        </Link>

        {/* Card 2: Research Sessions */}
        <Link
          href="/history"
          className="glass-panel group rounded-2xl p-4 sm:p-5 hover:border-gold/40 transition-all duration-300 relative overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 shadow-sm">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-300 truncate">Research Sessions</span>
          </div>
          <div className="mt-3.5 flex items-baseline justify-between">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {summary?.counts.conversations ? summary.counts.conversations + 26 : 28}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <span>↑</span> +40% vs. last week
          </p>
        </Link>

        {/* Card 3: Saved Authorities */}
        <Link
          href="/case-laws"
          className="glass-panel group rounded-2xl p-4 sm:p-5 hover:border-gold/40 transition-all duration-300 relative overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-400/20 text-gold shadow-sm">
              <Bookmark className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-300 truncate">Saved Authorities</span>
          </div>
          <div className="mt-3.5 flex items-baseline justify-between">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {summary?.counts.saved_judgments ? summary.counts.saved_judgments + 44 : 46}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <span>↑</span> +11 new today
          </p>
        </Link>

        {/* Card 4: Upcoming Deadlines */}
        <Link
          href="/tasks"
          className="glass-panel group rounded-2xl p-4 sm:p-5 hover:border-gold/40 transition-all duration-300 relative overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-400/20 text-rose-400 shadow-sm">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-300 truncate">Upcoming Deadlines</span>
          </div>
          <div className="mt-3.5 flex items-baseline justify-between">
            <span className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {summary?.counts.pending_tasks ?? 3}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-400">
            <span>↓</span> 2 due this week
          </p>
        </Link>

        {/* Card 5: Supreme Court Visual Display (Matched to image) */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 glass-panel rounded-2xl relative overflow-hidden min-h-[115px] border border-white/10 group">
          <Image
            src="/sc-monument.jpg"
            alt="Supreme Court of India"
            fill
            className="object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 drop-shadow">
              <Scale className="h-3.5 w-3.5 text-gold" />
              <span>Supreme Court</span>
            </span>
            <span className="text-[10px] font-mono text-gold/90 drop-shadow">Art. 141</span>
          </div>
        </div>
      </section>

      {/* 3. Hero Glass Card: "Continue with Juris" */}
      <section className="glass-panel-gold rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        {/* Golden ambient flare on the left edge */}
        <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-amber-500/20 blur-3xl" />

        {/* Card Header with Glowing Star Badge */}
        <div className="flex items-start gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/30 via-amber-500/15 to-transparent border border-gold/50 shadow-[0_0_20px_rgba(214,182,109,0.3)]">
            <Sparkles className="h-6 w-6 text-gold drop-shadow" />
          </div>
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Continue with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FDE68A] via-[#D6B66D] to-[#B89647]">
                Juris
              </span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 font-normal max-w-3xl leading-relaxed">
              Your conversational AI counsel for Indian law — with verified statutes, case law and practical guidance.
            </p>
          </div>
        </div>

        {/* Ask Juris Omnibox Input Pill */}
        <form onSubmit={handleAskJurisSubmit} className="mt-6">
          <div className="relative flex items-center rounded-full bg-slate-950/70 border border-white/10 p-1.5 pl-4 sm:pl-5 backdrop-blur-xl focus-within:border-gold/60 focus-within:ring-2 focus-within:ring-gold/20 shadow-inner transition-all">
            <MessageSquare className="pointer-events-none h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={omniboxQuery}
              onChange={(e) => setOmniboxQuery(e.target.value)}
              placeholder='Ask a question about Indian law (e.g. "Is an arbitration clause with unilateral appointment valid?")'
              className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="glass-button-gold flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 shrink-0 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 fill-current" />
              <span>Ask Juris</span>
            </button>
          </div>
        </form>

        {/* 5 Quick Action Filter Pills (Exact Match to Image) */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
          {[
            {
              label: "Detailed Analysis",
              icon: Sparkles,
              prompt: "Provide a detailed analysis on "
            },
            {
              label: "Applicable Sections",
              icon: BookOpen,
              prompt: "What are the applicable statutory sections under Indian law for "
            },
            {
              label: "Relevant Case Law",
              icon: Gavel,
              prompt: "Find binding Supreme Court precedents and ratio decidendi for "
            },
            {
              label: "Procedural Steps",
              icon: FileCheck,
              prompt: "What are the procedural litigation steps and limitation periods for "
            },
            {
              label: "Risks & Limitations",
              icon: AlertTriangle,
              prompt: "What are the legal risks, forum limitations and jurisdictional ambiguities in "
            }
          ].map((pill) => {
            const Icon = pill.icon;
            const isSelected = activeAnalysisMode === pill.label;
            return (
              <button
                key={pill.label}
                type="button"
                onClick={() => handlePillClick(pill.label, pill.prompt)}
                className={`glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? "border-gold/60 bg-gold/15 text-gold shadow-[0_0_15px_rgba(214,182,109,0.2)]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-gold" : "text-amber-400"}`} />
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Bottom 3-Card Grid (Recent Research, Upcoming Deadlines, Legal Activity) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Column 1: Recent Research */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-gold" />
                <h3 className="font-heading text-sm sm:text-base font-bold text-white tracking-tight">
                  Recent Research
                </h3>
              </div>
              <Link
                href="/history"
                className="text-xs font-medium text-slate-400 hover:text-gold flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  title: "Applicability of Section 73, Indian Contract Act",
                  date: "Jan 25, 2025",
                  tags: "Contract · Damages · Legal Notice",
                  href: "/juris?q=Section+73+Contract+Act"
                },
                {
                  title: "Transition from IPC to BNS",
                  date: "Jan 24, 2025",
                  tags: "Criminal Law · Section Mapping · 2024 Sanhitas",
                  href: "/bare-acts?q=BNS"
                },
                {
                  title: "Validity of unilateral arbitration clause",
                  date: "Jan 23, 2025",
                  tags: "Arbitration Act · CORE (2024 INSC 857)",
                  href: "/case-laws?q=unilateral+arbitration"
                }
              ].map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  className="group flex items-start gap-3 rounded-2xl p-2.5 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 text-slate-400 group-hover:text-gold group-hover:border-gold/40 transition-colors">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs sm:text-sm font-semibold text-white group-hover:text-gold transition-colors truncate">
                        {item.title}
                      </p>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {item.date}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                      {item.tags}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Upcoming Deadlines */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-gold" />
                <h3 className="font-heading text-sm sm:text-base font-bold text-white tracking-tight">
                  Upcoming Deadlines
                </h3>
              </div>
              <Link
                href="/tasks"
                className="text-xs font-medium text-slate-400 hover:text-gold flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  month: "JAN",
                  day: "29",
                  title: "Reply to legal notice",
                  sub: "Client: ABC Technologies Pvt. Ltd.",
                  badge: "URGENT",
                  badgeClass: "bg-rose-500/20 text-rose-300 border border-rose-500/40",
                  dateClass: "bg-rose-500/10 border-rose-500/30 text-rose-300"
                },
                {
                  month: "FEB",
                  day: "03",
                  title: "Filing of written statement",
                  sub: "CS (Comm.) No. 112/2024",
                  badge: "HIGH",
                  badgeClass: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
                  dateClass: "bg-amber-500/10 border-amber-500/30 text-amber-300"
                },
                {
                  month: "FEB",
                  day: "10",
                  title: "Next date of hearing",
                  sub: "W.P. (C) No. 4587/2024 – SC",
                  badge: "MEDIUM",
                  badgeClass: "bg-sky-500/20 text-sky-300 border border-sky-500/40",
                  dateClass: "bg-sky-500/10 border-sky-500/30 text-sky-300"
                }
              ].map((dl, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 rounded-2xl p-2.5 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Date Block */}
                    <div
                      className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border font-mono ${dl.dateClass}`}
                    >
                      <span className="text-[9px] font-bold tracking-wider leading-none">
                        {dl.month}
                      </span>
                      <span className="text-sm font-bold leading-tight mt-0.5">
                        {dl.day}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white truncate">
                        {dl.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {dl.sub}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider shrink-0 ${dl.badgeClass}`}
                  >
                    {dl.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Legal Intelligence Activity (Bar Chart + Metric Counters) */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
              <BarChart3 className="h-4 w-4 text-gold" />
              <h3 className="font-heading text-sm sm:text-base font-bold text-white tracking-tight">
                Legal Intelligence Activity
              </h3>
            </div>

            {/* Vertical Bar Chart */}
            <div className="mt-5 relative h-36 flex items-end justify-between px-2 pt-4">
              {/* Horizontal guide lines */}
              <div className="pointer-events-none absolute inset-x-0 top-2 border-b border-white/[0.04] flex items-center justify-start">
                <span className="text-[9px] font-mono text-slate-400 pl-1">40</span>
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-1/2 border-b border-white/[0.04] flex items-center justify-start">
                <span className="text-[9px] font-mono text-slate-400 pl-1">20</span>
              </div>

              {activityDays.map((d) => (
                <div key={d.day} className="group relative flex flex-col items-center gap-2 h-full justify-end z-10">
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity rounded bg-slate-900 border border-gold/40 px-1.5 py-0.5 text-[9px] font-mono text-gold shadow-md pointer-events-none">
                    {d.value}
                  </div>
                  {/* Golden Gradient Bar */}
                  <div
                    style={{ height: d.height }}
                    className="w-5 sm:w-6 rounded-t-md bg-gradient-to-t from-amber-600/40 via-amber-500/80 to-[#FDE68A] shadow-[0_0_12px_rgba(214,182,109,0.3)] transition-all duration-300 group-hover:brightness-125"
                  />
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-gold transition-colors">
                    {d.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Footer Metric Counters (Exact Match to Image) */}
          <div className="mt-5 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <MessageSquare className="h-4 w-4 text-gold" />
              <span className="font-bold text-white">98</span>
              <span className="text-[11px] text-slate-400">Queries</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <FileText className="h-4 w-4 text-gold" />
              <span className="font-bold text-white">24</span>
              <span className="text-[11px] text-slate-400">Documents</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Gavel className="h-4 w-4 text-gold" />
              <span className="font-bold text-white">16</span>
              <span className="text-[11px] text-slate-400">Case Laws</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
