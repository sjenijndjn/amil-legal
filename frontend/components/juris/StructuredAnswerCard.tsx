"use client";

import React from "react";
import {
  CheckCircle2,
  BookOpen,
  Scale,
  FileText,
  AlertTriangle,
  CalendarCheck,
  Copy,
  BookmarkPlus,
  ShieldCheck
} from "lucide-react";
import { ChatMessage, CitedSource } from "@/lib/types";
import { Badge, PrecedentBadge, StatuteStatusBadge } from "@/components/ui/Badge";
import { CitationCard } from "./CitationCard";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

export function StructuredAnswerCard({
  message,
  onInspectSource
}: {
  message: ChatMessage;
  onInspectSource: (source: CitedSource) => void;
}) {
  const { notify } = useToast();
  const s = message.structured_sections;

  if (!s) {
    return (
      <div className="rounded-xl border border-border-subtle bg-navy-card p-5 text-sm text-ivory-primary leading-relaxed">
        {message.content}
      </div>
    );
  }

  const formatPlainTextForCopy = () => {
    return [
      `1. DIRECT ANSWER\n${s.direct_answer}`,
      `\n2. APPLICABLE LEGAL PROVISIONS\n${s.applicable_provisions
        .map(
          (p) =>
            `- ${p.act_title} | ${p.section} [${p.status}]${
              p.corresponding_historical ? ` (Historical: ${p.corresponding_historical})` : ""
            }: ${p.summary}`
        )
        .join("\n")}`,
      `\n3. RELEVANT JUDGMENTS\n${s.relevant_judgments
        .map(
          (j) =>
            `- ${j.case_title}, ${j.neutral_citation} (${j.court}, ${j.decision_date}) [${j.precedent_status}]: ${j.holding}`
        )
        .join("\n")}`,
      `\n4. LEGAL REASONING\n${s.legal_reasoning}`,
      `\n5. SOURCE REFERENCES\n${s.source_references
        .map((r) => `- ${r.title} (${r.citation}) — ${r.repository} [${r.official_url}]`)
        .join("\n")}`,
      `\n6. IMPORTANT LIMITATIONS\n${s.important_limitations}`,
      `\n7. VERIFICATION DATE\n${s.verification_date}`
    ].join("\n");
  };

  const handleCopyAnswer = async () => {
    const text = formatPlainTextForCopy();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
    notify({
      title: "Structured 7-part legal answer copied",
      description: "Ready to paste into your research notes or brief."
    });
  };

  const handleSaveAnswerToLibrary = async () => {
    await api.createBookmark({
      item_type: "AI_ANSWER",
      target_id: message.conversation_id,
      title: `Juris Legal Analysis (${s.applicable_provisions[0]?.section || "Verified Response"})`,
      citation: s.verification_date,
      excerpt: s.direct_answer,
      tags: ["Juris Answer", "7-Part Verified", message.response_mode || "detailed"]
    });
    notify({
      title: "Saved Juris answer to My Legal Library",
      description: "Accessible under the Saved AI Answers tab in My Legal Library."
    });
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-navy-card shadow-legal overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-navy-secondary px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-heading text-xs font-bold uppercase tracking-wider text-gold">
            <ShieldCheck className="h-4 w-4 text-status-success" />
            Juris — 7-Part Grounded Legal Analysis
          </span>
          {message.response_mode && (
            <Badge variant="gold" className="uppercase text-[10px]">
              {message.response_mode} Mode
            </Badge>
          )}
          {message.confidence_score && (
            <Badge variant="mono" className="text-[10px]">
              Citation Confidence: {Math.round(message.confidence_score * 100)}%
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAnswer}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-card px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Answer
          </button>
          <button
            type="button"
            onClick={handleSaveAnswerToLibrary}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary transition-colors"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            Save Answer
          </button>
        </div>
      </div>

      {/* 7-Part Body */}
      <div className="divide-y divide-border-subtle p-5 space-y-5">
        {/* 1. Direct Answer */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-gold/20 font-mono text-xs font-bold text-gold">
              1
            </span>
            <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-gold">
              Direct Answer
            </h4>
          </div>
          <p className="text-sm sm:text-base text-ivory-primary leading-relaxed">
            {s.direct_answer}
          </p>
        </section>

        {/* 2. Applicable Legal Provisions */}
        <section className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-gold/20 font-mono text-xs font-bold text-gold">
              2
            </span>
            <BookOpen className="h-4 w-4 text-gold" />
            <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-gold">
              Applicable Legal Provisions
            </h4>
          </div>
          <div className="space-y-2.5">
            {s.applicable_provisions.map((prov, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border-subtle bg-navy-secondary p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-ivory-primary">
                      {prov.act_title}
                    </span>
                    <span className="mx-2 text-ivory-secondary">•</span>
                    <span className="font-mono text-xs font-semibold text-gold">
                      {prov.section}
                    </span>
                  </div>
                  <StatuteStatusBadge status={prov.status} />
                </div>
                {prov.corresponding_historical && (
                  <p className="mt-1 font-mono text-[11px] text-amber-300">
                    Historical / Transition Mapping: {prov.corresponding_historical}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-ivory-secondary leading-relaxed">
                  {prov.summary}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Relevant Judgments */}
        <section className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-gold/20 font-mono text-xs font-bold text-gold">
              3
            </span>
            <Scale className="h-4 w-4 text-gold" />
            <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-gold">
              Relevant Judgments
            </h4>
          </div>
          <div className="space-y-2.5">
            {s.relevant_judgments.map((jud, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border-subtle bg-navy-secondary p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="text-sm font-semibold text-ivory-primary">
                    {jud.case_title}
                  </h5>
                  <PrecedentBadge status={jud.precedent_status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-xs text-gold">
                  <span>{jud.neutral_citation}</span>
                  <span className="text-ivory-secondary">|</span>
                  <span className="text-ivory-secondary">{jud.court}</span>
                  <span className="text-ivory-secondary">|</span>
                  <span className="text-ivory-secondary">Decided: {jud.decision_date}</span>
                </div>
                <p className="mt-2 text-xs text-ivory-primary leading-relaxed">
                  <strong className="text-gold">Holding / Ratio: </strong>
                  {jud.holding}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Legal Reasoning */}
        <section className="pt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-gold/20 font-mono text-xs font-bold text-gold">
              4
            </span>
            <FileText className="h-4 w-4 text-gold" />
            <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-gold">
              Legal Reasoning
            </h4>
          </div>
          <div className="whitespace-pre-line text-xs sm:text-sm text-ivory-primary leading-relaxed">
            {s.legal_reasoning}
          </div>
        </section>

        {/* 5. Source References */}
        <section className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-gold/20 font-mono text-xs font-bold text-gold">
              5
            </span>
            <CheckCircle2 className="h-4 w-4 text-status-success" />
            <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-gold">
              Source References ({s.source_references.length} Verified Authorities)
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {s.source_references.map((src) => (
              <CitationCard
                key={src.id}
                source={src}
                onInspect={onInspectSource}
              />
            ))}
          </div>
        </section>

        {/* 6. Important Limitations */}
        <section className="pt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/20 font-mono text-xs font-bold text-amber-400">
              6
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-amber-400">
              Important Limitations & Temporal Caveats
            </h4>
          </div>
          <p className="text-xs text-ivory-secondary leading-relaxed">
            {s.important_limitations}
          </p>
        </section>

        {/* 7. Verification Date */}
        <section className="pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ivory-secondary">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-status-success/20 font-mono text-xs font-bold text-status-success">
              7
            </span>
            <CalendarCheck className="h-4 w-4 text-status-success" />
            <span className="font-semibold text-ivory-primary">Verification Date:</span>
            <span className="font-mono text-gold">{s.verification_date}</span>
          </div>
          <span className="text-[11px] italic text-ivory-secondary">
            Research output — verify primary gazette & certified copy before filing.
          </span>
        </section>
      </div>
    </div>
  );
}
