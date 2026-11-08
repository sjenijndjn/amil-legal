"use client";

import React from "react";
import { BookOpen, Scale, ExternalLink, ShieldCheck } from "lucide-react";
import { CitedSource } from "@/lib/types";
import { Badge, PrecedentBadge } from "@/components/ui/Badge";

export function CitationCard({
  source,
  onInspect
}: {
  source: CitedSource;
  onInspect?: (source: CitedSource) => void;
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-border-subtle bg-navy-secondary p-3.5 hover:border-gold/50 transition-all">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            {source.source_type === "STATUTE" ? (
              <BookOpen className="h-3.5 w-3.5 text-gold shrink-0" />
            ) : (
              <Scale className="h-3.5 w-3.5 text-gold shrink-0" />
            )}
            <span className="font-mono text-xs font-semibold text-gold">
              {source.citation}
            </span>
          </div>
          {source.is_verified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-success">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Source
            </span>
          )}
        </div>

        <h5 className="text-sm font-semibold text-ivory-primary leading-snug">
          {source.title}
        </h5>

        <p className="mt-1.5 text-xs text-ivory-secondary line-clamp-2 leading-relaxed">
          {source.excerpt}
        </p>
      </div>

      <div className="mt-3 pt-2.5 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {source.repository}
          </Badge>
          {source.precedent_status && (
            <PrecedentBadge status={source.precedent_status} />
          )}
        </div>

        <div className="flex items-center gap-2">
          {onInspect && (
            <button
              type="button"
              onClick={() => onInspect(source)}
              className="text-xs font-medium text-gold hover:underline"
            >
              Inspect Excerpt
            </button>
          )}
          <a
            href={source.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-ivory-secondary hover:text-gold"
          >
            <span>Repository</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
