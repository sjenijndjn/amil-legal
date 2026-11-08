"use client";

import React, { useEffect, useState } from "react";
import {
  Scale,
  Search,
  BookmarkPlus,
  StickyNote,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Download,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Info
} from "lucide-react";
import { api } from "@/lib/api";
import { BharatCourtJudgment, Judgment, PrecedentStatus } from "@/lib/types";
import { Badge, PrecedentBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

const INDIAN_COURTS = [
  { code: "ALL", name: "All Indian Courts (SC & 25+ High Courts)" },
  { code: "sci", name: "Supreme Court of India (e-SCR & Digital Archive)" },
  { code: "allahabad", name: "Allahabad High Court" },
  { code: "bombay", name: "Bombay High Court" },
  { code: "calcutta", name: "Calcutta High Court" },
  { code: "delhi", name: "Delhi High Court" },
  { code: "madras", name: "Madras High Court" },
  { code: "karnataka", name: "Karnataka High Court" },
  { code: "kerala", name: "Kerala High Court" },
  { code: "punjab", name: "Punjab & Haryana High Court" },
  { code: "gujarat", name: "Gujarat High Court" },
  { code: "rajasthan", name: "Rajasthan High Court" },
  { code: "telangana", name: "Telangana High Court" },
  { code: "andhra", name: "Andhra Pradesh High Court" },
  { code: "madhya pradesh", name: "Madhya Pradesh High Court" },
  { code: "patna", name: "Patna High Court" }
];

interface UnifiedJudgmentCard {
  id: string;
  external_case_id: string;
  case_title: string;
  neutral_citation: string;
  court: string;
  bench_type: string;
  judges: string[];
  decision_date: string;
  precedent_status: PrecedentStatus;
  ratio_decidendi: string;
  headnote_summary: string;
  source_type: "archive" | "live" | "curated";
  official_source_url: string;
  document_url?: string | null;
  cnr?: string;
  petitioner?: string;
  respondent?: string;
  authority_notes?: string;
  key_paragraphs?: { para_no: string; text: string }[];
  attribution?: any;
}

export default function CaseLawsPage() {
  const { notify } = useToast();

  // Mode: "all_india" (Bharat Courts) vs "curated" (e-SCR landmark cases)
  const [activeTab, setActiveTab] = useState<"all_india" | "curated">("all_india");

  // Search & Filter inputs
  const [searchQuery, setSearchQuery] = useState("");
  const [courtFilter, setCourtFilter] = useState("ALL");
  const [judgeFilter, setJudgeFilter] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [citationFilter, setCitationFilter] = useState("");
  const [cnrFilter, setCnrFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [yearFromFilter, setYearFromFilter] = useState("");
  const [yearToFilter, setYearToFilter] = useState("");
  const [sourceBackend, setSourceBackend] = useState<"archive" | "live">("archive");
  const [statusFilter, setStatusFilter] = useState<PrecedentStatus | "ALL">("ALL");

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Results & Selection
  const [judgments, setJudgments] = useState<UnifiedJudgmentCard[]>([]);
  const [selectedJudgment, setSelectedJudgment] = useState<UnifiedJudgmentCard | null>(null);

  // Note Modal
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  // Search execution
  const executeSearch = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      if (activeTab === "all_india") {
        // Query Bharat Courts service via backend API
        const res = await api.searchBharatCourts({
          q: searchQuery.trim() || undefined,
          court: courtFilter !== "ALL" ? courtFilter : undefined,
          judge: judgeFilter.trim() || undefined,
          party: partyFilter.trim() || undefined,
          citation: citationFilter.trim() || undefined,
          cnr: cnrFilter.trim() || undefined,
          year: yearFilter ? parseInt(yearFilter, 10) : undefined,
          year_from: yearFromFilter ? parseInt(yearFromFilter, 10) : undefined,
          year_to: yearToFilter ? parseInt(yearToFilter, 10) : undefined,
          source: sourceBackend,
          limit: 25
        });

        if (res.error) {
          setErrorMessage(res.error);
        }

        let mapped: UnifiedJudgmentCard[] = (res.results || []).map((bj: BharatCourtJudgment) => ({
          id: bj.case_id,
          external_case_id: bj.case_id,
          case_title: bj.title,
          neutral_citation: bj.citation || bj.case_id,
          court: bj.court,
          bench_type: bj.bench_type || "Court Bench",
          judges: bj.judges || [],
          decision_date: bj.decision_date || "Date Unspecified",
          precedent_status: bj.authority_status,
          ratio_decidendi: bj.authority_notes || `Judicial precedent rendered by ${bj.court}.`,
          headnote_summary: `Disposal: ${bj.disposal_nature || "Decided"}. Parties: ${
            [bj.petitioner, bj.respondent].filter(Boolean).join(" vs ") || "Record on file"
          }.`,
          source_type: (bj.source_type as any) || "archive",
          official_source_url: bj.document_url || api.getBharatCourtPdfUrl(bj.case_id),
          document_url: bj.document_url,
          cnr: bj.cnr,
          petitioner: bj.petitioner || undefined,
          respondent: bj.respondent || undefined,
          authority_notes: bj.authority_notes || undefined,
          attribution: bj.attribution
        }));

        if (statusFilter !== "ALL") {
          mapped = mapped.filter((j) => j.precedent_status === statusFilter);
        }

        setJudgments(mapped);
        if (mapped.length > 0) {
          setSelectedJudgment(mapped[0]);
        } else {
          setSelectedJudgment(null);
        }
      } else {
        // Query curated local database
        const list = await api.getJudgments({
          q: searchQuery.trim() || undefined,
          court: courtFilter !== "ALL" ? courtFilter : undefined,
          judge: judgeFilter.trim() || undefined,
          precedent_status: statusFilter !== "ALL" ? statusFilter : undefined
        });

        const mapped: UnifiedJudgmentCard[] = list.map((j: Judgment) => ({
          id: j.id,
          external_case_id: j.id,
          case_title: j.case_title,
          neutral_citation: j.neutral_citation,
          court: j.court,
          bench_type: j.bench_type,
          judges: j.judges,
          decision_date: j.decision_date,
          precedent_status: j.precedent_status,
          ratio_decidendi: j.ratio_decidendi,
          headnote_summary: j.headnote_summary,
          source_type: "curated",
          official_source_url: j.official_source_url,
          key_paragraphs: j.key_paragraphs
        }));

        setJudgments(mapped);
        if (mapped.length > 0) {
          setSelectedJudgment(mapped[0]);
        } else {
          setSelectedJudgment(null);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to load judgments from legal research engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, courtFilter, statusFilter, sourceBackend]);

  const handleSaveJudgment = async (jud: UnifiedJudgmentCard) => {
    await api.createBookmark({
      item_type: "JUDGMENT",
      target_id: jud.id,
      title: jud.case_title,
      citation: `${jud.neutral_citation} (${jud.court})`,
      excerpt: jud.ratio_decidendi,
      tags: [jud.neutral_citation, jud.precedent_status, jud.court]
    });
    notify({
      title: "Judgment saved to My Legal Library",
      description: `${jud.case_title} (${jud.neutral_citation})`
    });
  };

  const handleSaveCaseNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJudgment || !noteContent.trim()) return;
    await api.createNote({
      title: `Case Note: ${selectedJudgment.case_title} (${selectedJudgment.neutral_citation})`,
      content: noteContent.trim(),
      linked_entity_type: "JUDGMENT",
      linked_entity_id: selectedJudgment.id,
      linked_entity_label: `${selectedJudgment.case_title} (${selectedJudgment.neutral_citation})`,
      tags: [selectedJudgment.neutral_citation, "Case Law Note", selectedJudgment.court],
      is_pinned: true
    });
    setNoteContent("");
    setNoteModalOpen(false);
    notify({
      title: "Private case note attached",
      description: selectedJudgment.case_title
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 shadow-legal">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scale className="h-5 w-5 text-gold" />
              <h1 className="font-heading text-2xl font-bold text-ivory-primary">
                Case Law & Precedent Intelligence
              </h1>
            </div>
            <p className="text-xs text-ivory-secondary">
              Powered by Bharat Courts & Supreme Court e-SCR — Search across Supreme Court and 25+ High Courts with constitutional precedent standing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="gold">Bharat Courts + e-SCR</Badge>
            <Badge variant="default" className="text-[11px]">CC-BY-4.0 Attribution</Badge>
          </div>
        </div>

        {/* Source Mode Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-border-subtle pb-3 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("all_india")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "all_india"
                ? "bg-gold text-navy-primary shadow-sm"
                : "text-ivory-secondary hover:text-ivory-primary hover:bg-navy-secondary"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Bharat Courts All-India Search</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("curated")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "curated"
                ? "bg-gold text-navy-primary shadow-sm"
                : "text-ivory-secondary hover:text-ivory-primary hover:bg-navy-secondary"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Curated Landmark Precedents (e-SCR)</span>
          </button>
        </div>

        {/* Main Search Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch();
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-8 relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search judgments by case name, citation (e.g. 2023 INSC 964), CNR, judge, or legal issue..."
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-10 pr-4 py-2.5 text-sm text-ivory-primary placeholder:text-ivory-secondary/75 focus:border-gold focus:outline-none"
              />
            </div>

            <div className="lg:col-span-4 flex items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-gold px-4 py-2.5 text-xs font-bold text-navy-primary hover:bg-gold-bright transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                <span>Search Judgments</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                  showAdvancedFilters
                    ? "border-gold text-gold bg-gold/10"
                    : "border-border-subtle text-ivory-secondary hover:border-gold hover:text-ivory-primary"
                }`}
                title="Toggle Advanced Judicial Filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Advanced Filter Drawer */}
          {showAdvancedFilters && (
            <div className="rounded-xl border border-border-subtle bg-navy-secondary/60 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-3 mt-2 animate-fadeIn">
              {/* Court filter */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-ivory-secondary mb-1">
                  Court Jurisdiction
                </label>
                <select
                  value={courtFilter}
                  onChange={(e) => setCourtFilter(e.target.value)}
                  className="w-full rounded-lg border border-border-subtle bg-navy-primary px-3 py-2 text-xs text-ivory-primary focus:border-gold focus:outline-none"
                >
                  {INDIAN_COURTS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Precedent Status */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-ivory-secondary mb-1">
                  Precedent Standing
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full rounded-lg border border-border-subtle bg-navy-primary px-3 py-2 text-xs text-ivory-primary focus:border-gold focus:outline-none"
                >
                  <option value="ALL">All Precedent Standings</option>
                  <option value="BINDING">BINDING Precedents (Art. 141)</option>
                  <option value="PERSUASIVE">PERSUASIVE Authorities</option>
                  <option value="DISTINGUISHED">DISTINGUISHED</option>
                  <option value="OVERRULED">OVERRULED (Caution List)</option>
                  <option value="PENDING_VERIFICATION">PENDING VERIFICATION</option>
                </select>
              </div>

              {/* Judge Filter */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-ivory-secondary mb-1">
                  Hon&apos;ble Judge / Coram
                </label>
                <input
                  type="text"
                  value={judgeFilter}
                  onChange={(e) => setJudgeFilter(e.target.value)}
                  placeholder="e.g. Chandrachud, Nariman, Nagarathna"
                  className="w-full rounded-lg border border-border-subtle bg-navy-primary px-3 py-2 text-xs text-ivory-primary placeholder:text-ivory-secondary/50 focus:border-gold focus:outline-none"
                />
              </div>

              {/* Party Name Filter */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-ivory-secondary mb-1">
                  Party Name (Petitioner / Respondent)
                </label>
                <input
                  type="text"
                  value={partyFilter}
                  onChange={(e) => setPartyFilter(e.target.value)}
                  placeholder="e.g. Union of India, Tata, CBI"
                  className="w-full rounded-lg border border-border-subtle bg-navy-primary px-3 py-2 text-xs text-ivory-primary placeholder:text-ivory-secondary/50 focus:border-gold focus:outline-none"
                />
              </div>

              {/* Citation Filter */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-ivory-secondary mb-1">
                  Neutral / Law Report Citation
                </label>
                <input
                  type="text"
                  value={citationFilter}
                  onChange={(e) => setCitationFilter(e.target.value)}
                  placeholder="e.g. 2023 INSC 964 or [2023] 14 S.C.R. 153"
                  className="w-full rounded-lg border border-border-subtle bg-navy-primary px-3 py-2 text-xs text-ivory-primary placeholder:text-ivory-secondary/50 focus:border-gold focus:outline-none"
                />
              </div>

              {/* CNR Number */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-ivory-secondary mb-1">
                  CNR Number (eCourts 16-char)
                </label>
                <input
                  type="text"
                  value={cnrFilter}
                  onChange={(e) => setCnrFilter(e.target.value)}
                  placeholder="e.g. ESCR010007002023"
                  className="w-full rounded-lg border border-border-subtle bg-navy-primary px-3 py-2 text-xs text-ivory-primary font-mono placeholder:text-ivory-secondary/50 focus:border-gold focus:outline-none"
                />
              </div>

              {/* Year Range */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-ivory-secondary mb-1">
                  Decision Year Range
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1950"
                    max="2030"
                    value={yearFromFilter}
                    onChange={(e) => setYearFromFilter(e.target.value)}
                    placeholder="From"
                    className="w-1/2 rounded-lg border border-border-subtle bg-navy-primary px-2 py-2 text-xs text-ivory-primary font-mono focus:border-gold focus:outline-none"
                  />
                  <span className="text-ivory-secondary">-</span>
                  <input
                    type="number"
                    min="1950"
                    max="2030"
                    value={yearToFilter}
                    onChange={(e) => setYearToFilter(e.target.value)}
                    placeholder="To"
                    className="w-1/2 rounded-lg border border-border-subtle bg-navy-primary px-2 py-2 text-xs text-ivory-primary font-mono focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              {/* Bharat Courts Backend Source */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-ivory-secondary mb-1">
                  Source Engine
                </label>
                <select
                  value={sourceBackend}
                  onChange={(e) => setSourceBackend(e.target.value as any)}
                  className="w-full rounded-lg border border-border-subtle bg-navy-primary px-3 py-2 text-xs text-ivory-primary focus:border-gold focus:outline-none"
                >
                  <option value="archive">AWS Open Data Historical Archive (Fast)</option>
                  <option value="live">Live eCourts Portal (Recent Full-Text)</option>
                </select>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-status-error/40 bg-status-error/15 p-4 text-xs text-status-error">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => executeSearch()}
            className="rounded border border-status-error/40 px-2.5 py-1 text-[11px] font-semibold hover:bg-status-error hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of Judgments (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-ivory-secondary">
            <span>
              Showing <strong className="text-ivory-primary">{judgments.length}</strong> judicial authorities
            </span>
            {activeTab === "all_india" && (
              <span className="font-mono text-[11px] text-gold">Source: {sourceBackend.toUpperCase()}</span>
            )}
          </div>

          {loading ? (
            <div className="rounded-xl border border-border-subtle bg-navy-card p-12 text-center text-ivory-secondary space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-gold mx-auto" />
              <p className="text-sm font-medium text-ivory-primary">
                Querying Bharat Courts Indian Case Law Archive...
              </p>
              <p className="text-xs text-ivory-secondary">
                Verifying precedent standing, neutral citations, and jurisdiction.
              </p>
            </div>
          ) : judgments.length === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-navy-card p-10 text-center text-ivory-secondary space-y-3">
              <Scale className="h-10 w-10 text-gold/60 mx-auto" />
              <h3 className="font-heading text-base font-bold text-ivory-primary">
                No Judgments Found
              </h3>
              <p className="text-xs text-ivory-secondary max-w-sm mx-auto">
                No matching decisions found for your search criteria. Try broadening your keywords, selecting &quot;All Courts&quot;, or removing year limits.
              </p>
            </div>
          ) : (
            judgments.map((jud) => {
              const isSelected = selectedJudgment?.id === jud.id;
              return (
                <button
                  key={jud.id}
                  type="button"
                  onClick={() => setSelectedJudgment(jud)}
                  className={`w-full text-left rounded-xl border p-4 transition-all relative ${
                    isSelected
                      ? "border-gold bg-gold/15 shadow-gold ring-1 ring-gold/50"
                      : "border-border-subtle bg-navy-card hover:border-gold/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-gold">
                      {jud.neutral_citation}
                    </span>
                    <PrecedentBadge status={jud.precedent_status} />
                  </div>
                  <h3 className="font-heading text-sm font-bold text-ivory-primary leading-snug">
                    {jud.case_title}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ivory-secondary">
                    <span>{jud.court}</span>
                    <span>•</span>
                    <span>{jud.decision_date}</span>
                    {jud.source_type && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-gold text-[10px] uppercase">
                          {jud.source_type}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-ivory-secondary line-clamp-2">
                    {jud.ratio_decidendi}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Right Judgment Reader (7 cols) */}
        <div className="lg:col-span-7">
          {selectedJudgment ? (
            <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 space-y-5 shadow-legal sticky top-6">
              {/* Overruled Precedent Warning */}
              {selectedJudgment.precedent_status === "OVERRULED" && (
                <div className="flex items-start gap-2.5 rounded-xl border border-status-error bg-status-error/15 p-3.5 text-xs text-status-error">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <strong>OVERRULED PRECEDENT ALERT:</strong> This decision has been marked OVERRULED by subsequent judicial authority. Do not cite as binding law.
                  </div>
                </div>
              )}

              {/* Title, Citation & Action Buttons */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="mono">{selectedJudgment.neutral_citation}</Badge>
                    <PrecedentBadge status={selectedJudgment.precedent_status} />
                    {selectedJudgment.cnr && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        CNR: {selectedJudgment.cnr}
                      </Badge>
                    )}
                  </div>
                  <h2 className="font-heading text-xl font-bold text-ivory-primary">
                    {selectedJudgment.case_title}
                  </h2>
                  <p className="text-xs text-ivory-secondary">
                    <strong className="text-ivory-primary">{selectedJudgment.court}</strong> • {selectedJudgment.bench_type} • Decided:{" "}
                    <span className="font-mono text-ivory-primary">{selectedJudgment.decision_date}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveJudgment(selectedJudgment)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary transition-colors"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-secondary px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold transition-colors"
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                    <span>Note</span>
                  </button>
                  <a
                    href={api.getBharatCourtPdfUrl(selectedJudgment.external_case_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-navy-primary hover:bg-gold-bright transition-colors"
                    title="Retrieve verified PDF document"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Retrieve PDF</span>
                  </a>
                </div>
              </div>

              {/* Bench Strength & Coram */}
              <div>
                <h4 className="font-mono text-[11px] uppercase tracking-wider text-ivory-secondary mb-1.5 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gold" />
                  <span>Hon&apos;ble Bench & Coram</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJudgment.judges.length > 0 ? (
                    selectedJudgment.judges.map((judge, idx) => (
                      <Badge key={idx} variant="default">
                        {judge}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-ivory-secondary/70">
                      Coram details recorded in primary case record.
                    </span>
                  )}
                </div>
              </div>

              {/* Constitutional Precedent Standing & Limitation Disclosure */}
              <div className="rounded-xl border border-border-subtle bg-navy-secondary/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Legal Authority & Binding Nature</span>
                  </h4>
                  <PrecedentBadge status={selectedJudgment.precedent_status} />
                </div>
                <p className="text-xs text-ivory-secondary leading-relaxed">
                  {selectedJudgment.court.toLowerCase().includes("supreme") || selectedJudgment.court === "sci"
                    ? "Article 141 of the Constitution makes Supreme Court ratio decidendi binding on all courts in India, subject to verified subsequent larger bench treatment."
                    : `Binding on all subordinate courts within territorial state jurisdiction; persuasive authority across other High Courts and tribunals.`}
                </p>
                {selectedJudgment.authority_notes && (
                  <p className="text-xs text-amber-300/90 pt-1 border-t border-border-subtle/50 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gold" />
                    <span>{selectedJudgment.authority_notes}</span>
                  </p>
                )}
              </div>

              {/* Ratio Decidendi (Binding Holding) */}
              <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-gold mb-1.5 flex items-center gap-1.5">
                  <Scale className="h-4 w-4" />
                  <span>Ratio Decidendi / Legal Analysis</span>
                </h4>
                <p className="text-sm text-ivory-primary leading-relaxed">
                  {selectedJudgment.ratio_decidendi}
                </p>
              </div>

              {/* Headnote / Case Overview */}
              <div>
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-ivory-secondary mb-1.5">
                  Judgment Summary & Overview
                </h4>
                <p className="text-xs sm:text-sm text-ivory-primary leading-relaxed">
                  {selectedJudgment.headnote_summary}
                </p>
              </div>

              {/* Key Paragraphs if available */}
              {selectedJudgment.key_paragraphs && selectedJudgment.key_paragraphs.length > 0 && (
                <div>
                  <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-ivory-secondary mb-2">
                    Extracted Operative Paragraphs
                  </h4>
                  <div className="space-y-2.5">
                    {selectedJudgment.key_paragraphs.map((kp, i) => (
                      <blockquote
                        key={i}
                        className="rounded-lg border-l-2 border-gold bg-navy-secondary p-3.5 text-xs text-ivory-primary leading-relaxed"
                      >
                        <span className="font-mono font-bold text-gold block mb-1">
                          [{kp.para_no}]
                        </span>
                        {kp.text}
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}

              {/* Source Attribution & CC-BY-4.0 Provenance Card */}
              <div className="pt-4 border-t border-border-subtle text-xs text-ivory-secondary space-y-1.5 bg-navy-secondary/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ivory-primary">
                    Data Source & Legal Provenance
                  </span>
                  <Badge variant="default" className="text-[10px]">CC-BY-4.0 License</Badge>
                </div>
                <p className="text-[11px] text-ivory-secondary">
                  Source: <strong>{selectedJudgment.attribution?.dataset || "AWS Open Data Indian Courts Archive & eCourts"}</strong>. Attribution to{" "}
                  <strong>Dattam Labs</strong> and the <strong>eCourts Platform</strong>.
                </p>
                <p className="text-[11px] text-ivory-secondary/70">
                  {selectedJudgment.attribution?.freshness_policy ||
                    "Historical archive updated approximately every two months for SC and quarterly for High Courts."}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border-subtle bg-navy-card/50 p-12 text-center text-ivory-secondary">
              <FileText className="h-10 w-10 text-gold/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-ivory-primary">
                Select a judgment from the list to view full metadata, ratio decidendi, authority status, and PDF document.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Case Note Modal */}
      <Modal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Attach Private Case Law Note"
        subtitle={selectedJudgment?.case_title}
      >
        <form onSubmit={handleSaveCaseNote} className="space-y-4">
          <textarea
            rows={4}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            required
            placeholder="Write your private legal analysis or strategy notes regarding this precedent..."
            className="w-full rounded-lg border border-border-subtle bg-navy-secondary p-3 text-sm text-ivory-primary focus:border-gold focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNoteModalOpen(false)}
              className="rounded-lg border border-border-subtle px-4 py-2 text-xs text-ivory-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-navy-primary"
            >
              Save Case Note
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
