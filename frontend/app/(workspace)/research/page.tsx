"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  BookOpen,
  Scale,
  BookmarkPlus,
  ExternalLink,
  ShieldCheck,
  Filter,
  Sparkles,
  Database
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Judgment, LegalAct, LegalSection, LegalSource } from "@/lib/types";
import { Badge, PrecedentBadge, StatuteStatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

function ResearchEngineInner() {
  const searchParams = useSearchParams();
  const { notify } = useToast();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [typeFilter, setTypeFilter] = useState<"all" | "act" | "section" | "judgment">("all");
  const [repositoryFilter, setRepositoryFilter] = useState("ALL");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [acts, setActs] = useState<LegalAct[]>([]);
  const [sections, setSections] = useState<LegalSection[]>([]);
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [sources, setSources] = useState<LegalSource[]>([]);

  const [selectedModalItem, setSelectedModalItem] = useState<{
    title: string;
    subtitle: string;
    body: string;
    notes?: string;
    officialUrl: string;
  } | null>(null);

  const executeSearch = async (overrideQ?: string) => {
    const res = await api.searchLegalCorpus({
      q: overrideQ ?? query,
      type: typeFilter,
      repository: repositoryFilter,
      subject: subjectFilter,
      status: statusFilter
    });
    setActs(res.acts);
    setSections(res.sections);
    setJudgments(res.judgments);
    setSources(res.sources);
  };

  useEffect(() => {
    const paramQ = searchParams.get("q") || "";
    setQuery(paramQ);
    executeSearch(paramQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, typeFilter, repositoryFilter, subjectFilter, statusFilter]);

  const handleBookmark = async (item: {
    item_type: "ACT" | "SECTION" | "JUDGMENT";
    target_id: string;
    title: string;
    citation: string;
    excerpt: string;
  }) => {
    await api.createBookmark({
      ...item,
      tags: [item.item_type, "Legal Research"]
    });
    notify({
      title: "Saved authority to My Legal Library",
      description: item.title
    });
  };

  const totalResults = acts.length + sections.length + judgments.length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Search Bar */}
      <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 shadow-legal">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ivory-primary">
              Unified Legal Research Engine
            </h1>
            <p className="text-xs text-ivory-secondary mt-0.5">
              Hybrid lexical + semantic search across verified Indian legislation, statutory provisions, and Supreme Court e-SCR judgments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">
              <ShieldCheck className="h-3.5 w-3.5" />
              Official Repositories Only
            </Badge>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Act name, BNS/BNSS/BSA section, IPC/CrPC/IEA mapping, case title, neutral citation (e.g. 2024 INSC 857), or legal phrase..."
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-10 pr-4 py-3 text-sm text-ivory-primary placeholder:text-ivory-secondary/75 focus:border-gold focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-navy-primary hover:bg-gold-bright transition-colors shrink-0"
          >
            Search Authorities
          </button>
        </form>

        {/* Filter Bar */}
        <div className="mt-4 pt-4 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-mono uppercase text-ivory-secondary mb-1">
              <Filter className="inline h-3 w-3 mr-1 text-gold" />
              Authority Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary focus:border-gold focus:outline-none"
            >
              <option value="all">All Authorities ({totalResults})</option>
              <option value="act">Bare Acts Only ({acts.length})</option>
              <option value="section">Statutory Sections Only ({sections.length})</option>
              <option value="judgment">Case Laws / Judgments Only ({judgments.length})</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-ivory-secondary mb-1">
              Official Source Repository
            </label>
            <select
              value={repositoryFilter}
              onChange={(e) => setRepositoryFilter(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary focus:border-gold focus:outline-none"
            >
              <option value="ALL">All Verified Repositories</option>
              <option value="India Code">India Code (Ministry of Law & Justice)</option>
              <option value="Supreme Court eSCR">Supreme Court of India (e-SCR)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-ivory-secondary mb-1">
              Legal Subject / Domain
            </label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary focus:border-gold focus:outline-none"
            >
              <option value="ALL">All Subjects</option>
              <option value="Criminal">Criminal Law (BNS / BNSS / IPC / CrPC)</option>
              <option value="Evidence">Law of Evidence (BSA / IEA)</option>
              <option value="Constitutional">Constitutional Law</option>
              <option value="Commercial">Commercial, Contract & Arbitration</option>
              <option value="Data">Data Privacy & Cyber Law (DPDP / IT Act)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-ivory-secondary mb-1">
              Legislative Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary focus:border-gold focus:outline-none"
            >
              <option value="ALL">Current + Historical Legislation</option>
              <option value="CURRENT">Current Enacted Legislation Only</option>
              <option value="HISTORICAL">Historical Legislation (IPC/CrPC/IEA)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Connected Official Repositories Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sources.map((src) => (
          <a
            key={src.id}
            href={src.official_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start justify-between gap-2 rounded-xl border border-border-subtle bg-navy-secondary p-3.5 hover:border-gold/50 transition-colors"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-gold" />
                <span className="font-mono text-[11px] font-semibold text-gold">
                  {src.code}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-ivory-primary line-clamp-2">
                {src.name}
              </p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-ivory-secondary shrink-0 mt-0.5" />
          </a>
        ))}
      </div>

      {/* Search Results */}
      <div className="space-y-6">
        {/* Statutory Sections Results */}
        {sections.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-heading text-base font-bold text-ivory-primary flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gold" />
              <span>Statutory Provisions ({sections.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections.map((sec) => (
                <div
                  key={sec.id}
                  className="flex flex-col justify-between rounded-xl border border-border-subtle bg-navy-card p-5 hover:border-gold/50 transition-all"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <Badge variant="mono">
                        {sec.act_short_title} • Section {sec.section_number}
                      </Badge>
                      <span className="font-mono text-[11px] text-ivory-secondary">
                        Effective: {sec.effective_date}
                      </span>
                    </div>
                    <h3 className="font-heading text-base font-bold text-ivory-primary">
                      {sec.section_title}
                    </h3>
                    {sec.corresponding_historical_section && (
                      <p className="mt-1 font-mono text-xs text-amber-300">
                        Historical Mapping: {sec.corresponding_historical_section}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-ivory-secondary line-clamp-3 leading-relaxed">
                      {sec.statutory_text}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedModalItem({
                          title: `${sec.act_short_title} — Section ${sec.section_number}: ${sec.section_title}`,
                          subtitle: `${sec.chapter_title} • Effective Date: ${sec.effective_date}`,
                          body: sec.statutory_text,
                          notes: sec.amendment_notes,
                          officialUrl: "https://www.indiacode.nic.in"
                        })
                      }
                      className="text-xs font-semibold text-gold hover:underline"
                    >
                      Read Full Statutory Text →
                    </button>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/juris?q=${encodeURIComponent(
                          `Explain ${sec.act_short_title} Section ${sec.section_number} (${sec.section_title}) and relevant case law`
                        )}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-navy-secondary px-2.5 py-1 text-xs text-ivory-primary hover:border-gold hover:text-gold"
                      >
                        <Sparkles className="h-3 w-3 text-gold" />
                        Ask Juris
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          handleBookmark({
                            item_type: "SECTION",
                            target_id: sec.id,
                            title: `${sec.act_short_title} — Section ${sec.section_number} (${sec.section_title})`,
                            citation: `${sec.act_short_title}, s. ${sec.section_number}`,
                            excerpt: sec.statutory_text.slice(0, 220)
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-navy-secondary px-2.5 py-1 text-xs text-ivory-primary hover:border-gold hover:text-gold"
                      >
                        <BookmarkPlus className="h-3.5 w-3.5" />
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Judgments Results */}
        {judgments.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-heading text-base font-bold text-ivory-primary flex items-center gap-2">
              <Scale className="h-4 w-4 text-gold" />
              <span>Supreme Court & High Court Judgments ({judgments.length})</span>
            </h2>
            <div className="space-y-3">
              {judgments.map((jud) => (
                <div
                  key={jud.id}
                  className="rounded-xl border border-border-subtle bg-navy-card p-5 hover:border-gold/50 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="mono">{jud.neutral_citation}</Badge>
                      <span className="text-xs text-ivory-secondary">
                        {jud.court} • {jud.bench_type} • {jud.decision_date}
                      </span>
                    </div>
                    <PrecedentBadge status={jud.precedent_status} />
                  </div>

                  <h3 className="font-heading text-base font-bold text-ivory-primary">
                    {jud.case_title}
                  </h3>
                  <p className="mt-1.5 text-xs text-ivory-secondary leading-relaxed">
                    <strong className="text-gold">Ratio Decidendi: </strong>
                    {jud.ratio_decidendi}
                  </p>

                  <div className="mt-4 pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedModalItem({
                          title: jud.case_title,
                          subtitle: `${jud.neutral_citation} | ${jud.equivalent_citations.join(", ")} | ${jud.court}`,
                          body: `HEADNOTE SUMMARY:\n${jud.headnote_summary}\n\nRATIO DECIDENDI:\n${jud.ratio_decidendi}\n\nKEY PARAGRAPHS:\n${jud.key_paragraphs
                            .map((p) => `[${p.para_no}] ${p.text}`)
                            .join("\n\n")}`,
                          notes: jud.verification_notes,
                          officialUrl: jud.official_source_url
                        })
                      }
                      className="text-xs font-semibold text-gold hover:underline"
                    >
                      Inspect Full Ratio & Key Paragraphs →
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleBookmark({
                            item_type: "JUDGMENT",
                            target_id: jud.id,
                            title: jud.case_title,
                            citation: `${jud.neutral_citation} | ${jud.equivalent_citations[0] || ""}`,
                            excerpt: jud.ratio_decidendi
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-navy-secondary px-3 py-1 text-xs text-ivory-primary hover:border-gold hover:text-gold"
                      >
                        <BookmarkPlus className="h-3.5 w-3.5" />
                        Save Judgment
                      </button>
                      <a
                        href={jud.official_source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary"
                      >
                        <span>{jud.official_source_url.includes("legal-research") ? "Bharat Courts" : "e-SCR Portal"}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Enacted & Historical Acts Results */}
        {acts.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-heading text-base font-bold text-ivory-primary flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gold" />
              <span>Legislation & Bare Acts ({acts.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {acts.map((act) => (
                <div
                  key={act.id}
                  className="flex flex-col justify-between rounded-xl border border-border-subtle bg-navy-card p-4 hover:border-gold/50"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-semibold text-gold">
                        {act.act_number}
                      </span>
                      <StatuteStatusBadge status={act.status} />
                    </div>
                    <h3 className="font-heading text-sm font-bold text-ivory-primary">
                      {act.title}
                    </h3>
                    <p className="mt-1 text-xs text-ivory-secondary line-clamp-2">
                      {act.preamble}
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-ivory-secondary">
                      Effective: {act.effective_date}
                    </span>
                    <Link
                      href="/bare-acts"
                      className="font-semibold text-gold hover:underline"
                    >
                      Open in Bare Acts →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Authority Inspector Modal */}
      <Modal
        isOpen={Boolean(selectedModalItem)}
        onClose={() => setSelectedModalItem(null)}
        title={selectedModalItem?.title || ""}
        subtitle={selectedModalItem?.subtitle}
      >
        {selectedModalItem && (
          <div className="space-y-4">
            <div className="whitespace-pre-line rounded-lg border border-border-subtle bg-navy-secondary p-4 text-xs sm:text-sm text-ivory-primary leading-relaxed">
              {selectedModalItem.body}
            </div>
            {selectedModalItem.notes && (
              <div className="rounded-lg border border-gold/40 bg-gold/10 p-3.5 text-xs text-ivory-primary">
                <strong className="text-gold block mb-1">
                  Legislative / Verification Note:
                </strong>
                {selectedModalItem.notes}
              </div>
            )}
            <div className="flex justify-end">
              <a
                href={selectedModalItem.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-navy-primary hover:bg-gold-bright"
              >
                <span>Verify on Official Government Repository</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function ResearchPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border-subtle bg-navy-card p-8 text-sm text-ivory-secondary">
          Loading Unified Legal Research Engine...
        </div>
      }
    >
      <ResearchEngineInner />
    </Suspense>
  );
}
