"use client";

import React from "react";
import { ShieldCheck, ExternalLink, Copy, BookmarkPlus, X } from "lucide-react";
import { CitedSource } from "@/lib/types";
import { Badge, PrecedentBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

export function SourcePanel({
  source,
  onClose
}: {
  source: CitedSource | null;
  onClose: () => void;
}) {
  const { notify } = useToast();

  if (!source) return null;

  const handleCopyCitation = async () => {
    const formatted = `${source.title} (${source.citation}) — ${source.repository}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(formatted);
    }
    notify({
      title: "Citation copied to clipboard",
      description: formatted
    });
  };

  const handleSaveToLibrary = async () => {
    await api.createBookmark({
      item_type: source.source_type === "STATUTE" ? "SECTION" : "JUDGMENT",
      target_id: source.id,
      title: source.title,
      citation: source.citation,
      excerpt: source.excerpt,
      tags: [source.source_type, source.repository]
    });
    notify({
      title: "Saved authority to My Legal Library",
      description: source.title
    });
  };

  return (
    <div className="rounded-xl border border-gold/40 bg-navy-card p-5 shadow-legal">
      <div className="flex items-start justify-between gap-3 border-b border-border-subtle pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="mono">{source.source_type}</Badge>
            {source.is_verified && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-status-success">
                <ShieldCheck className="h-4 w-4" />
                Verified Authority
              </span>
            )}
          </div>
          <h4 className="mt-2 font-heading text-base font-bold text-ivory-primary">
            {source.title}
          </h4>
          <p className="mt-0.5 font-mono text-xs text-gold">{source.citation}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border-subtle p-1.5 text-ivory-secondary hover:text-ivory-primary"
          aria-label="Close source inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-lg border border-border-subtle bg-navy-secondary p-3">
          <div>
            <span className="text-ivory-secondary block">Official Repository</span>
            <span className="font-medium text-ivory-primary">{source.repository}</span>
          </div>
          {source.section_or_para && (
            <div>
              <span className="text-ivory-secondary block">Pinpoint Reference</span>
              <span className="font-mono text-gold">{source.section_or_para}</span>
            </div>
          )}
          {source.effective_date && (
            <div>
              <span className="text-ivory-secondary block">Effective Date</span>
              <span className="font-mono text-ivory-primary">{source.effective_date}</span>
            </div>
          )}
          {source.precedent_status && (
            <div>
              <span className="text-ivory-secondary block mb-1">Precedent Status</span>
              <PrecedentBadge status={source.precedent_status} />
            </div>
          )}
        </div>

        <div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-ivory-secondary block mb-1.5">
            Verified Excerpt / Ratio
          </span>
          <blockquote className="rounded-lg border-l-2 border-gold bg-navy-secondary p-3.5 text-xs sm:text-sm text-ivory-primary leading-relaxed">
            {source.excerpt}
          </blockquote>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCitation}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-secondary px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Citation
            </button>
            <button
              type="button"
              onClick={handleSaveToLibrary}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-secondary px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold transition-colors"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              Save to Library
            </button>
          </div>

          <a
            href={source.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold/15 border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary transition-colors"
          >
            <span>Open Official Portal</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
