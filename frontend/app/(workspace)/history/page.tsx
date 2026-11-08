"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Trash2,
  ArrowRight,
  Clock
} from "lucide-react";
import { api } from "@/lib/api";
import { AuditHistoryEntry } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils";

export default function ResearchHistoryPage() {
  const { notify } = useToast();
  const [entries, setEntries] = useState<AuditHistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  const loadHistory = async () => {
    const list = await api.getResearchHistory();
    setEntries(list);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    await api.clearResearchHistory();
    setEntries([]);
    notify({
      title: "Cleared research history log",
      variant: "info"
    });
  };

  const q = searchQuery.trim().toLowerCase();
  const filtered = entries.filter((item) => {
    if (actionFilter !== "ALL" && item.action !== actionFilter) return false;
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.query_or_reference.toLowerCase().includes(q) ||
      item.metadata_label.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 shadow-legal flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ivory-primary flex items-center gap-2">
            <History className="h-6 w-6 text-gold" />
            <span>Research History & Audit Trail</span>
          </h1>
          <p className="text-xs text-ivory-secondary mt-0.5">
            Chronological log of your legal search queries, Juris AI consultations, analyzed documents, and inspected authorities.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClearHistory}
          disabled={entries.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-status-error/50 bg-status-error/15 px-3.5 py-2 text-xs font-semibold text-status-error hover:bg-status-error hover:text-white transition-colors disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-border-subtle bg-navy-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter history by query, statute, citation, or document..."
            className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-10 pr-4 py-2 text-xs sm:text-sm text-ivory-primary focus:border-gold focus:outline-none"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          aria-label="Filter history by action type"
          className="rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2 text-xs font-medium text-ivory-primary"
        >
          <option value="ALL">All Activity Types</option>
          <option value="JURIS_CONSULTATION">Juris AI Consultations</option>
          <option value="SEARCH_QUERY">Legal Research Queries</option>
          <option value="VIEW_STATUTE">Bare Act Inspections</option>
          <option value="VIEW_JUDGMENT">Case Law Inspections</option>
          <option value="ANALYZE_DOCUMENT">Document Analyses</option>
          <option value="GENERATE_DRAFT">Drafting Studio</option>
        </select>
      </div>

      {/* Timeline */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border-subtle bg-navy-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gold/50 transition-all"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="gold" className="text-[10px]">
                    {item.action.replace(/_/g, " ")}
                  </Badge>
                  <span className="font-mono text-xs text-gold">
                    {item.metadata_label}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ivory-secondary">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(item.created_at)}
                  </span>
                </div>
                <h3 className="font-heading text-sm sm:text-base font-bold text-ivory-primary">
                  {item.title}
                </h3>
                <p className="font-mono text-xs text-ivory-secondary">
                  Reference: {item.query_or_reference}
                </p>
              </div>

              <Link
                href={item.module_path}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/15 px-3.5 py-2 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary transition-colors shrink-0"
              >
                <span>Resume in Module</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle bg-navy-card p-8 text-center text-xs text-ivory-secondary">
          No research history entries match your current filter.
        </div>
      )}
    </div>
  );
}
