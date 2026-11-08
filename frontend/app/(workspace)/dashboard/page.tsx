"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Search,
  BookOpen,
  Scale,
  FileSearch,
  PenTool,
  CheckSquare,
  ArrowRight,
  Clock,
  ShieldCheck,
  FolderKanban,
  FileText
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { DashboardSummary, ResponseMode } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [omniboxQuery, setOmniboxQuery] = useState("");
  const [responseMode, setResponseMode] = useState<ResponseMode>("detailed");

  useEffect(() => {
    api.getDashboardSummary().then(setSummary);
  }, [user.display_name]);

  const handleAskJurisSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = omniboxQuery.trim();
    if (!q) {
      router.push(`/juris?mode=${responseMode}`);
      return;
    }
    router.push(
      `/juris?q=${encodeURIComponent(q)}&mode=${encodeURIComponent(responseMode)}`
    );
  };

  const firstName = user.display_name?.split(" ")[0] || BRAND.ownerFirstName;
  const greetingText = summary?.greeting || `Welcome back, ${firstName}.`;

  return (
    <div className="space-y-8 pb-10">
      {/* Hero Greeting & Juris Omnibox */}
      <section className="relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-navy-card via-navy-secondary to-navy-primary p-6 sm:p-8 shadow-legal">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold mb-3">
              <ShieldCheck className="h-3.5 w-3.5 text-status-success" />
              <span>{BRAND.fullTitle} • {BRAND.jurisdiction}</span>
            </div>
            <h1
              data-testid="dashboard-greeting"
              className="font-heading text-2xl sm:text-3xl font-bold text-ivory-primary"
            >
              {greetingText}
            </h1>
            <p className="mt-1 text-sm text-ivory-secondary max-w-2xl">
              {BRAND.corePrinciple}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/bare-acts"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-card px-3.5 py-2 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5 text-gold" />
              <span>BNS / BNSS / BSA 2023</span>
            </Link>
            <Link
              href="/documents"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-card px-3.5 py-2 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold transition-colors"
            >
              <FileSearch className="h-3.5 w-3.5 text-gold" />
              <span>Analyze Document</span>
            </Link>
            <Link
              href="/drafting"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold/50 bg-gold/15 px-3.5 py-2 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary transition-colors"
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>New Legal Draft</span>
            </Link>
          </div>
        </div>

        {/* Ask Juris Omnibox */}
        <form
          onSubmit={handleAskJurisSubmit}
          className="rounded-xl border border-border-subtle bg-navy-primary/90 p-3 sm:p-4 shadow-inner"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
              <input
                type="text"
                value={omniboxQuery}
                onChange={(e) => setOmniboxQuery(e.target.value)}
                placeholder="Ask Juris a legal question (e.g., 'Section 63 BSA 2023 electronic evidence certificate vs Section 65B IEA')..."
                className="w-full rounded-lg border border-border-subtle bg-navy-card pl-10 pr-4 py-3 text-sm text-ivory-primary placeholder:text-ivory-secondary/75 focus:border-gold focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-navy-primary hover:bg-gold-bright transition-colors shrink-0"
            >
              <span>Consult Juris</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-ivory-secondary mr-1">Response Depth:</span>
              {(["short", "standard", "detailed", "research"] as ResponseMode[]).map(
                (m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setResponseMode(m)}
                    className={`rounded-md px-2.5 py-1 font-mono text-[11px] uppercase transition-colors ${
                      responseMode === m
                        ? "bg-gold text-navy-primary font-semibold"
                        : "bg-navy-card text-ivory-secondary hover:text-ivory-primary border border-border-subtle"
                    }`}
                  >
                    {m === "research" ? "Research Mode" : m}
                  </button>
                )
              )}
            </div>
            <span className="font-mono text-[11px] text-ivory-secondary">
              7-Part Grounded Format • India Code & Supreme Court e-SCR
            </span>
          </div>
        </form>
      </section>

      {/* Live Database Metrics Grid */}
      <section aria-label="Workspace statistics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          {
            label: "Juris Consultations",
            value: summary?.counts.conversations ?? 2,
            href: "/juris",
            icon: Sparkles
          },
          {
            label: "Saved Judgments",
            value: summary?.counts.saved_judgments ?? 2,
            href: "/case-laws",
            icon: Scale
          },
          {
            label: "Saved Provisions",
            value: summary?.counts.saved_provisions ?? 2,
            href: "/bare-acts",
            icon: BookOpen
          },
          {
            label: "Analyzed Documents",
            value: summary?.counts.uploaded_documents ?? 2,
            href: "/documents",
            icon: FileSearch
          },
          {
            label: "Active Legal Drafts",
            value: summary?.counts.active_drafts ?? 1,
            href: "/drafting",
            icon: PenTool
          },
          {
            label: "Pending Tasks",
            value: summary?.counts.pending_tasks ?? 3,
            href: "/tasks",
            icon: CheckSquare
          }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-xl border border-border-subtle bg-navy-card p-4 hover:border-gold/60 transition-all"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-gold" />
                <span className="font-mono text-xs text-ivory-secondary group-hover:text-gold">
                  View →
                </span>
              </div>
              <p className="mt-3 font-heading text-2xl font-bold text-ivory-primary">
                {stat.value}
              </p>
              <p className="mt-0.5 text-xs text-ivory-secondary">{stat.label}</p>
            </Link>
          );
        })}
      </section>

      {/* Quick Action Shortcuts */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            title: "BNS / BNSS / BSA Comparator",
            desc: "Compare 2023 Criminal & Evidence Sanhitas with IPC 1860, CrPC 1973 & IEA 1872.",
            href: "/bare-acts",
            badge: "July 1, 2024 Transition"
          },
          {
            title: "Supreme Court e-SCR Precedents",
            desc: "Search binding Constitution Bench and Division Bench holdings with ratio decidendi.",
            href: "/case-laws",
            badge: "Verified Citations"
          },
          {
            title: "Contract & Brief Risk Analyzer",
            desc: "Extract clauses, deadlines, obligations, and redline diffs with DPDP consent.",
            href: "/documents",
            badge: "Page-Cited RAG"
          },
          {
            title: "Structured Legal Drafting Studio",
            desc: "Generate Legal Notices, Applications, Affidavits, and Research Memoranda.",
            href: "/drafting",
            badge: "DOCX / PDF Export"
          }
        ].map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="flex flex-col justify-between rounded-xl border border-border-subtle bg-navy-secondary p-4 hover:border-gold/50 transition-all"
          >
            <div>
              <Badge variant="gold" className="mb-2 text-[10px]">
                {card.badge}
              </Badge>
              <h3 className="font-heading text-sm font-bold text-ivory-primary">
                {card.title}
              </h3>
              <p className="mt-1 text-xs text-ivory-secondary leading-relaxed">
                {card.desc}
              </p>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold">
              Open Module <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </section>

      {/* Main 2-Column Workspace Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Recent Conversations, Saved Judgments & Provisions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Juris Consultations */}
          <div className="rounded-xl border border-border-subtle bg-navy-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold" />
                <h2 className="font-heading text-base font-bold text-ivory-primary">
                  Recent Juris AI Consultations
                </h2>
              </div>
              <Link href="/juris" className="text-xs font-medium text-gold hover:underline">
                Open Ask Juris →
              </Link>
            </div>

            {summary?.recent_conversations && summary.recent_conversations.length > 0 ? (
              <div className="space-y-2.5">
                {summary.recent_conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/juris?conv=${conv.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border-subtle bg-navy-secondary p-3.5 hover:border-gold/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ivory-primary truncate">
                        {conv.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ivory-secondary">
                        Updated {formatDateTime(conv.updated_at)} • {conv.message_count} messages
                      </p>
                    </div>
                    <Badge variant="gold" className="uppercase text-[10px] shrink-0">
                      {conv.response_mode}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ivory-secondary py-4">
                No consultations yet. Use the Juris omnibox above to start your first grounded legal inquiry.
              </p>
            )}
          </div>

          {/* Saved Judgments & Statutory Provisions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border-subtle bg-navy-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-gold" />
                  <h2 className="font-heading text-sm font-bold text-ivory-primary">
                    Saved Judgments
                  </h2>
                </div>
                <Link href="/library" className="text-xs text-gold hover:underline">
                  Library →
                </Link>
              </div>
              {summary?.saved_judgments && summary.saved_judgments.length > 0 ? (
                <div className="space-y-2.5">
                  {summary.saved_judgments.map((j) => (
                    <Link
                      key={j.id}
                      href="/case-laws"
                      className="block rounded-lg border border-border-subtle bg-navy-secondary p-3 hover:border-gold/50"
                    >
                      <p className="font-mono text-[11px] text-gold">{j.citation}</p>
                      <p className="text-xs font-semibold text-ivory-primary mt-0.5 line-clamp-1">
                        {j.title}
                      </p>
                      <p className="text-[11px] text-ivory-secondary mt-1 line-clamp-2">
                        {j.excerpt}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ivory-secondary">No bookmarked judgments yet.</p>
              )}
            </div>

            <div className="rounded-xl border border-border-subtle bg-navy-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-gold" />
                  <h2 className="font-heading text-sm font-bold text-ivory-primary">
                    Saved Statutory Provisions
                  </h2>
                </div>
                <Link href="/bare-acts" className="text-xs text-gold hover:underline">
                  Bare Acts →
                </Link>
              </div>
              {summary?.saved_provisions && summary.saved_provisions.length > 0 ? (
                <div className="space-y-2.5">
                  {summary.saved_provisions.map((p) => (
                    <Link
                      key={p.id}
                      href="/bare-acts"
                      className="block rounded-lg border border-border-subtle bg-navy-secondary p-3 hover:border-gold/50"
                    >
                      <p className="font-mono text-[11px] text-gold">{p.citation}</p>
                      <p className="text-xs font-semibold text-ivory-primary mt-0.5 line-clamp-1">
                        {p.title}
                      </p>
                      <p className="text-[11px] text-ivory-secondary mt-1 line-clamp-2">
                        {p.excerpt}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ivory-secondary">No bookmarked provisions yet.</p>
              )}
            </div>
          </div>

          {/* Uploaded Documents & Active Drafts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border-subtle bg-navy-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-gold" />
                  <h2 className="font-heading text-sm font-bold text-ivory-primary">
                    Uploaded Documents
                  </h2>
                </div>
                <Link href="/documents" className="text-xs text-gold hover:underline">
                  Analyzer →
                </Link>
              </div>
              {summary?.recent_documents && summary.recent_documents.length > 0 ? (
                <div className="space-y-2.5">
                  {summary.recent_documents.map((doc) => (
                    <Link
                      key={doc.id}
                      href="/documents"
                      className="block rounded-lg border border-border-subtle bg-navy-secondary p-3 hover:border-gold/50"
                    >
                      <p className="text-xs font-semibold text-ivory-primary line-clamp-1">
                        {doc.title}
                      </p>
                      <p className="font-mono text-[11px] text-ivory-secondary mt-0.5">
                        {doc.page_count} pages • {doc.analysis_result.risk_flags.length} risk flags
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ivory-secondary">No uploaded documents yet.</p>
              )}
            </div>

            <div className="rounded-xl border border-border-subtle bg-navy-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gold" />
                  <h2 className="font-heading text-sm font-bold text-ivory-primary">
                    Draft Documents
                  </h2>
                </div>
                <Link href="/drafting" className="text-xs text-gold hover:underline">
                  Drafting Studio →
                </Link>
              </div>
              {summary?.recent_drafts && summary.recent_drafts.length > 0 ? (
                <div className="space-y-2.5">
                  {summary.recent_drafts.map((dr) => (
                    <Link
                      key={dr.id}
                      href="/drafting"
                      className="block rounded-lg border border-border-subtle bg-navy-secondary p-3 hover:border-gold/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="gold" className="text-[10px]">
                          {dr.draft_type}
                        </Badge>
                        <span className="font-mono text-[10px] text-ivory-secondary">
                          v{dr.version}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-ivory-primary mt-1.5 line-clamp-1">
                        {dr.title}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ivory-secondary">No legal drafts created yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Reminders & Recent Legal Research */}
        <div className="space-y-6">
          {/* Upcoming Tasks & Reminders */}
          <div className="rounded-xl border border-border-subtle bg-navy-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-gold" />
                <h2 className="font-heading text-base font-bold text-ivory-primary">
                  Upcoming Reminders
                </h2>
              </div>
              <Link href="/tasks" className="text-xs font-medium text-gold hover:underline">
                Manage Tasks →
              </Link>
            </div>

            {summary?.upcoming_tasks && summary.upcoming_tasks.length > 0 ? (
              <div className="space-y-2.5">
                {summary.upcoming_tasks.map((tsk) => (
                  <Link
                    key={tsk.id}
                    href="/tasks"
                    className="block rounded-lg border border-border-subtle bg-navy-secondary p-3 hover:border-gold/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={
                          tsk.priority === "URGENT"
                            ? "error"
                            : tsk.priority === "HIGH"
                              ? "warning"
                              : "default"
                        }
                        className="text-[10px]"
                      >
                        {tsk.priority}
                      </Badge>
                      <span className="font-mono text-[11px] text-ivory-secondary">
                        Due {formatDate(tsk.due_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-ivory-primary">
                      {tsk.title}
                    </p>
                    {tsk.linked_entity_label && (
                      <p className="mt-0.5 font-mono text-[10px] text-gold truncate">
                        Ref: {tsk.linked_entity_label}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ivory-secondary py-3">
                All research tasks and reminders are complete.
              </p>
            )}
          </div>

          {/* Recent Legal Research Activity */}
          <div className="rounded-xl border border-border-subtle bg-navy-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gold" />
                <h2 className="font-heading text-base font-bold text-ivory-primary">
                  Recent Legal Research
                </h2>
              </div>
              <Link href="/history" className="text-xs font-medium text-gold hover:underline">
                Full History →
              </Link>
            </div>

            {summary?.recent_research && summary.recent_research.length > 0 ? (
              <div className="space-y-2.5">
                {summary.recent_research.map((item) => (
                  <Link
                    key={item.id}
                    href={item.module_path}
                    className="block rounded-lg border border-border-subtle bg-navy-secondary p-3 hover:border-gold/50"
                  >
                    <p className="text-xs font-semibold text-ivory-primary line-clamp-1">
                      {item.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-gold">
                      {item.metadata_label}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ivory-secondary">No recent research activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
