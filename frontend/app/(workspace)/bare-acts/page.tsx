"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Search,
  GitCompare,
  BookmarkPlus,
  StickyNote,
  ExternalLink,
  Calendar,
  AlertCircle,
  Sparkles,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight
} from "lucide-react";
import { api } from "@/lib/api";
import { LegalAct, LegalSection, LegislationStatus } from "@/lib/types";
import { Badge, StatuteStatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

const QUICK_DISCOVERY_PROVISIONS = [
  "Section 138 NI Act",
  "Order 39 Rule 1 CPC",
  "Section 9 Arbitration Act",
  "Section 6 Specific Relief Act",
  "Section 52 Transfer of Property Act",
  "Section 5 Limitation Act",
  "Section 7 IBC",
  "Section 69 BNS",
  "Section 528 BNSS",
  "Section 63 BSA"
];

export default function BareActsPage() {
  const { notify } = useToast();

  const [statusTab, setStatusTab] = useState<LegislationStatus>("CURRENT");
  const [actSearch, setActSearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");

  // Universal Search Across ALL Indian Acts & Sections
  const [universalQuery, setUniversalQuery] = useState("");
  const [isSearchingUniversal, setIsSearchingUniversal] = useState(false);
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);

  const [acts, setActs] = useState<LegalAct[]>([]);
  const [selectedAct, setSelectedAct] = useState<LegalAct | null>(null);
  const [sections, setSections] = useState<LegalSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<LegalSection | null>(null);

  const [comparisonSection, setComparisonSection] = useState<LegalSection | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  // Load Acts based on Status and Local Filter
  useEffect(() => {
    async function loadActs() {
      const list = await api.getActs(statusTab, actSearch);
      setActs(list);
      if (list.length > 0) {
        // Keep current selected act if it matches new list, otherwise pick first
        setSelectedAct((prev) => {
          if (prev && list.some((a) => a.id === prev.id)) {
            return list.find((a) => a.id === prev.id) || list[0];
          }
          return list[0];
        });
      } else {
        setSelectedAct(null);
      }
    }
    loadActs();
  }, [statusTab, actSearch]);

  // Load Sections for Selected Act
  useEffect(() => {
    async function loadSections() {
      if (!selectedAct) {
        setSections([]);
        setSelectedSection(null);
        return;
      }
      const list = await api.getActSections(selectedAct.id, sectionSearch);
      setSections(list);
      setSelectedSection((prev) => {
        if (prev && list.some((s) => s.id === prev.id)) {
          return list.find((s) => s.id === prev.id) || list[0] || null;
        }
        return list[0] || null;
      });
    }
    loadSections();
  }, [selectedAct, sectionSearch]);

  // Handle Universal Search Across ALL Indian Bare Acts & Sections
  const handleUniversalSearch = async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) {
      notify({
        title: "Please enter a statute or provision",
        description: "e.g., 'Section 138 NI Act', 'Order 39 Rule 1 CPC', 'Arbitration Section 9'",
        variant: "info"
      });
      return;
    }

    setIsSearchingUniversal(true);
    try {
      const res = await api.lookupUniversalAct(q);
      if (res && res.act) {
        // Ensure the correct tab is active
        if (res.act.status !== statusTab) {
          setStatusTab(res.act.status);
        }

        // Add or move act to top of list
        setActs((prev) => {
          const filtered = prev.filter((a) => a.id !== res.act.id && a.short_title !== res.act.short_title);
          return [res.act, ...filtered];
        });
        setSelectedAct(res.act);

        if (res.all_matched_sections && res.all_matched_sections.length > 0) {
          setSections(res.all_matched_sections);
        }

        if (res.matched_section) {
          setSelectedSection(res.matched_section);
        } else if (res.all_matched_sections && res.all_matched_sections.length > 0) {
          setSelectedSection(res.all_matched_sections[0]);
        }

        notify({
          title: res.is_newly_discovered ? "Discovered & Verified from India Code" : "Statute Provision Retrieved",
          description: `${res.act.short_title} ${res.matched_section ? `— Section ${res.matched_section.section_number}` : ""}`,
          variant: "success"
        });
      } else {
        notify({
          title: "No statutory match found",
          description: `Could not discover statutory text for "${q}". Please check the spelling or provision number.`,
          variant: "error"
        });
      }
    } catch {
      notify({
        title: "Search failed",
        description: "Error reaching statutory repository. Please retry.",
        variant: "error"
      });
    } finally {
      setIsSearchingUniversal(false);
    }
  };

  const handleCopySection = (sec: LegalSection) => {
    const textToCopy = `${sec.act_short_title} — Section ${sec.section_number}: ${sec.section_title}\n\n${sec.statutory_text}\n\n[Source: AMIL Indian Legal Intelligence Platform | India Code Verified]`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedSectionId(sec.id);
      setTimeout(() => setCopiedSectionId(null), 2500);
      notify({
        title: "Statutory text copied to clipboard",
        description: `${sec.act_short_title} Section ${sec.section_number}`,
        variant: "success"
      });
    }
  };

  const handleBookmarkSection = async (sec: LegalSection) => {
    await api.createBookmark({
      item_type: "SECTION",
      target_id: sec.id,
      title: `${sec.act_short_title} — Section ${sec.section_number} (${sec.section_title})`,
      citation: `${sec.act_short_title}, s. ${sec.section_number}`,
      excerpt: sec.statutory_text.slice(0, 240),
      tags: [sec.act_short_title, `Section ${sec.section_number}`, statusTab]
    });
    notify({
      title: "Bookmarked statutory provision",
      description: `${sec.act_short_title} Section ${sec.section_number}`
    });
  };

  const handleSaveSectionNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !noteContent.trim()) return;
    await api.createNote({
      title:
        noteTitle.trim() ||
        `Annotation on ${selectedSection.act_short_title} Section ${selectedSection.section_number}`,
      content: noteContent.trim(),
      linked_entity_type: "SECTION",
      linked_entity_id: selectedSection.id,
      linked_entity_label: `${selectedSection.act_short_title} — Section ${selectedSection.section_number}`,
      tags: [selectedSection.act_short_title, "Statutory Annotation"],
      is_pinned: true
    });
    setNoteModalOpen(false);
    setNoteTitle("");
    setNoteContent("");
    notify({
      title: "Saved personal annotation to My Legal Library",
      description: `${selectedSection.act_short_title} Section ${selectedSection.section_number}`
    });
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Universal Statutory Discovery Hero Search */}
      <div className="rounded-2xl border border-gold/40 bg-gradient-to-r from-navy-card via-navy-secondary to-navy-card p-6 shadow-legal space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-status-success animate-pulse" />
              <span className="font-mono text-[11px] font-bold tracking-wider text-gold uppercase">
                India Code Universal Statutory Search & AI Grounding Engine
              </span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-ivory-primary">
              Bare Act Library & Statutory Provisions
            </h1>
            <p className="text-xs text-ivory-secondary mt-0.5 max-w-2xl">
              Search, verify, and read ANY Indian Central or State Statute, Section, Order, or Rule.
              Queries automatically ground against official India Code and Gazette of India.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-primary px-3 py-1.5 text-xs font-mono text-ivory-secondary">
              <ShieldCheck className="h-4 w-4 text-status-success" />
              <span>Verbatim Statutory Text</span>
            </span>
          </div>
        </div>

        {/* Global Universal Search Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUniversalSearch(universalQuery);
          }}
          className="relative flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
            <input
              type="text"
              value={universalQuery}
              onChange={(e) => setUniversalQuery(e.target.value)}
              placeholder="Search ANY Indian Act, Section, or Order (e.g., 'Section 138 NI Act', 'Order 39 Rule 1 CPC', 'Arbitration Section 9', 'Specific Relief Act Section 6')..."
              className="w-full rounded-xl border border-gold/40 bg-navy-primary pl-10 pr-4 py-3 text-sm text-ivory-primary placeholder:text-ivory-secondary/70 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={isSearchingUniversal || !universalQuery.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-bold text-navy-primary hover:bg-gold-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shrink-0"
          >
            {isSearchingUniversal ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching India Code...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Search / Discover Act</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Discovery Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-mono text-ivory-secondary mr-1">Quick Provisions:</span>
          {QUICK_DISCOVERY_PROVISIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setUniversalQuery(item);
                handleUniversalSearch(item);
              }}
              className="rounded-md border border-border-subtle bg-navy-primary/80 hover:border-gold/60 hover:bg-gold/10 px-2.5 py-1 text-[11px] font-mono text-ivory-secondary hover:text-gold transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Legislation Era Switcher */}
      <div className="rounded-2xl border border-border-subtle bg-navy-card p-4 sm:p-5 shadow-legal">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-base font-bold text-ivory-primary">
              Legislative Classification & Transition
            </h2>
            <p className="text-xs text-ivory-secondary">
              Toggle between Current Enacted Statutes (2024 Reform Era) and Historical Pre-2024 Codes.
            </p>
          </div>

          <div className="flex flex-col sm:inline-flex sm:flex-row w-full sm:w-auto rounded-xl border border-border-subtle bg-navy-secondary p-1 gap-1 sm:gap-0">
            <button
              type="button"
              onClick={() => setStatusTab("CURRENT")}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                statusTab === "CURRENT"
                  ? "bg-gold text-navy-primary shadow-sm"
                  : "text-ivory-secondary hover:text-ivory-primary"
              }`}
            >
              Current Enacted Statutes ({acts.filter((a) => a.status === "CURRENT").length || "Enacted"})
            </button>
            <button
              type="button"
              onClick={() => setStatusTab("HISTORICAL")}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                statusTab === "HISTORICAL"
                  ? "bg-amber-400 text-navy-primary shadow-sm"
                  : "text-ivory-secondary hover:text-ivory-primary"
              }`}
            >
              Historical Codes (IPC / CrPC / IEA)
            </button>
          </div>
        </div>

        {statusTab === "HISTORICAL" && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Historical Legislation Notice (July 1, 2024 Transition):</strong> The Indian Penal Code (1860), Code of Criminal Procedure (1973), and Indian Evidence Act (1872) were repealed w.e.f. July 1, 2024 by the BNS, BNSS, and BSA 2023, and remain applicable only to prior offences/proceedings preserved under the statutory savings clauses (e.g. Section 358(2) BNS, Section 531(2) BNSS, Section 170(2) BSA).
            </div>
          </div>
        )}
      </div>

      {/* 3-Pane Reader Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pane 1: Acts Directory (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-border-subtle bg-navy-card p-4 space-y-3 h-fit">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-bold text-ivory-primary">
              {statusTab === "CURRENT" ? "Enacted Statutes" : "Historical Codes"} ({acts.length})
            </h3>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ivory-secondary" />
            <input
              type="search"
              value={actSearch}
              onChange={(e) => setActSearch(e.target.value)}
              placeholder="Filter listed statutes by title..."
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-8 pr-3 py-2 text-xs text-ivory-primary placeholder:text-ivory-secondary focus:border-gold focus:outline-none"
            />
          </div>

          <div className="space-y-2 max-h-52 lg:max-h-[65vh] overflow-y-auto pr-1">
            {acts.length > 0 ? (
              acts.map((act) => {
                const isSelected = selectedAct?.id === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => {
                      setSelectedAct(act);
                      setSectionSearch("");
                    }}
                    className={`w-full text-left rounded-lg border p-3 transition-all ${
                      isSelected
                        ? "border-gold bg-gold/15 shadow-sm"
                        : "border-border-subtle bg-navy-secondary hover:border-gold/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-gold">
                        {act.short_title}
                      </span>
                      <span className="font-mono text-[10px] text-ivory-secondary">
                        {act.act_number}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-ivory-primary">
                      {act.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] text-ivory-secondary">
                      <span>Effective: {act.effective_date}</span>
                      <span className="font-mono text-gold/80">{act.sections_count} Sections</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-border-subtle p-5 text-center space-y-3">
                <p className="text-xs text-ivory-secondary">
                  No cached statutes matching &ldquo;{actSearch}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUniversalQuery(actSearch);
                    handleUniversalSearch(actSearch);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gold/15 border border-gold px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Discover &ldquo;{actSearch}&rdquo; via India Code</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pane 2 & 3: Act Metadata + Statutory Sections Reader (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {selectedAct ? (
            <>
              {/* Act Metadata Banner */}
              <div className="rounded-xl border border-border-subtle bg-navy-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <Badge variant="mono">{selectedAct.act_number}</Badge>
                      <StatuteStatusBadge status={selectedAct.status} />
                      <Badge variant="outline">{selectedAct.subject_category}</Badge>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-status-success font-semibold">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        India Code Verified
                      </span>
                    </div>
                    <h2 className="font-heading text-xl font-bold text-ivory-primary">
                      {selectedAct.title}
                    </h2>
                  </div>

                  <a
                    href={selectedAct.official_url || "https://www.indiacode.nic.in"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary transition-colors"
                  >
                    <span>India Code Official Repository</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <p className="mt-2 text-xs text-ivory-secondary italic leading-relaxed">
                  {selectedAct.preamble}
                </p>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-border-subtle bg-navy-secondary p-3 text-xs">
                  <div>
                    <span className="text-ivory-secondary block text-[11px]">Enactment Date</span>
                    <span className="font-mono text-ivory-primary">{selectedAct.enactment_date}</span>
                  </div>
                  <div>
                    <span className="text-ivory-secondary block text-[11px]">Commencement Date</span>
                    <span className="font-mono text-gold">{selectedAct.commencement_date}</span>
                  </div>
                  <div>
                    <span className="text-ivory-secondary block text-[11px]">Indexed Sections</span>
                    <span className="font-mono text-ivory-primary">{sections.length} Provisions</span>
                  </div>
                  <div>
                    <span className="text-ivory-secondary block text-[11px]">Source Authority</span>
                    <span className="text-ivory-primary">{selectedAct.source_name}</span>
                  </div>
                </div>
              </div>

              {/* Section Filter & Reader */}
              <div className="rounded-xl border border-border-subtle bg-navy-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-heading text-base font-bold text-ivory-primary flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-gold" />
                    <span>Statutory Provisions ({sections.length})</span>
                  </h3>
                  <div className="relative w-full sm:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ivory-secondary" />
                    <input
                      type="search"
                      value={sectionSearch}
                      onChange={(e) => setSectionSearch(e.target.value)}
                      placeholder="Filter section number, title, or keyword..."
                      className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-8 pr-3 py-1.5 text-xs text-ivory-primary placeholder:text-ivory-secondary focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>

                {sections.length > 0 ? (
                  <div className="space-y-4">
                    {/* Section Pills */}
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                      {sections.map((sec) => (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => setSelectedSection(sec)}
                          className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${
                            selectedSection?.id === sec.id
                              ? "border-gold bg-gold text-navy-primary font-bold shadow-sm"
                              : "border-border-subtle bg-navy-secondary text-ivory-primary hover:border-gold/50"
                          }`}
                        >
                          s. {sec.section_number} — {sec.section_title.slice(0, 32)}
                        </button>
                      ))}
                    </div>

                    {/* Active Section Statutory Reader */}
                    {selectedSection && (
                      <div className="rounded-xl border border-gold/40 bg-navy-secondary p-5 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="gold">
                                {selectedSection.chapter_number
                                  ? `Chapter ${selectedSection.chapter_number}: ${selectedSection.chapter_title}`
                                  : selectedSection.chapter_title}
                              </Badge>
                              <span className="inline-flex items-center gap-1 font-mono text-xs text-ivory-secondary">
                                <Calendar className="h-3.5 w-3.5 text-gold" />
                                Effective: {selectedSection.effective_date}
                              </span>
                            </div>
                            <h4 className="mt-2 font-heading text-lg font-bold text-ivory-primary">
                              Section {selectedSection.section_number}. {selectedSection.section_title}
                            </h4>
                            {selectedSection.corresponding_historical_section && (
                              <p className="mt-1 font-mono text-xs text-amber-300">
                                Corresponding Provision: {selectedSection.corresponding_historical_section}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopySection(selectedSection)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-card px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold transition-colors"
                            >
                              {copiedSectionId === selectedSection.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-status-success" />
                                  <span className="text-status-success">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>Copy Text</span>
                                </>
                              )}
                            </button>

                            {selectedSection.historical_comparison && (
                              <button
                                type="button"
                                onClick={() => setComparisonSection(selectedSection)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gold bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary transition-colors"
                              >
                                <GitCompare className="h-3.5 w-3.5" />
                                <span>Compare 2023 vs Legacy</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleBookmarkSection(selectedSection)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-card px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold transition-colors"
                            >
                              <BookmarkPlus className="h-3.5 w-3.5" />
                              <span>Bookmark</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNoteTitle(
                                  `Note on ${selectedSection.act_short_title} Section ${selectedSection.section_number}`
                                );
                                setNoteModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-card px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold transition-colors"
                            >
                              <StickyNote className="h-3.5 w-3.5" />
                              <span>Add Note</span>
                            </button>
                          </div>
                        </div>

                        {/* Statutory Verbatim Content */}
                        <div className="whitespace-pre-line rounded-lg border border-border-subtle bg-navy-primary p-4 text-sm text-ivory-primary leading-relaxed font-sans shadow-inner selection:bg-gold selection:text-navy-primary">
                          {selectedSection.statutory_text}
                        </div>

                        {selectedSection.amendment_notes && (
                          <div className="rounded-lg border border-gold/30 bg-gold/10 p-3.5 text-xs text-ivory-primary">
                            <strong className="text-gold block mb-1">
                              Legislative & Commencement Note:
                            </strong>
                            {selectedSection.amendment_notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border-subtle p-6 text-center space-y-3">
                    <p className="text-xs text-ivory-secondary">
                      Section &ldquo;{sectionSearch}&rdquo; not indexed in the current view for {selectedAct.short_title}.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const q = `${selectedAct.short_title} Section ${sectionSearch}`;
                        setUniversalQuery(q);
                        handleUniversalSearch(q);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-navy-primary hover:bg-gold-bright transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Synthesize Section {sectionSearch} via India Code</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-border-subtle bg-navy-card p-12 text-center space-y-3">
              <BookOpen className="h-10 w-10 text-gold mx-auto" />
              <h3 className="font-heading text-lg font-bold text-ivory-primary">
                Select a Statute or Use Universal Search
              </h3>
              <p className="text-xs text-ivory-secondary max-w-md mx-auto">
                Type any Indian Act, Section, or Order in the search bar above to read verified verbatim statutory text.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Side-by-Side BNS/BNSS/BSA vs IPC/CrPC/IEA Version Comparison Modal */}
      <Modal
        isOpen={Boolean(comparisonSection)}
        onClose={() => setComparisonSection(null)}
        title={`Statutory Version Comparison: ${comparisonSection?.act_short_title} Section ${comparisonSection?.section_number}`}
        subtitle="Side-by-side comparison of post-July 1, 2024 statutory text and historical provision"
        maxWidth="max-w-5xl"
      >
        {comparisonSection && comparisonSection.historical_comparison && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New 2023 Code */}
              <div className="rounded-xl border border-status-success/40 bg-navy-secondary p-4">
                <Badge variant="success" className="mb-2">
                  CURRENT ENACTED PROVISION (W.E.F. 01-07-2024)
                </Badge>
                <h4 className="font-heading text-sm font-bold text-ivory-primary">
                  {comparisonSection.act_short_title} — Section {comparisonSection.section_number}:{" "}
                  {comparisonSection.section_title}
                </h4>
                <p className="mt-2 whitespace-pre-line text-xs text-ivory-primary leading-relaxed">
                  {comparisonSection.statutory_text}
                </p>
              </div>

              {/* Historical Code */}
              <div className="rounded-xl border border-amber-500/40 bg-navy-secondary p-4">
                <Badge variant="warning" className="mb-2">
                  HISTORICAL PROVISION (PRE-01-07-2024 SAVINGS)
                </Badge>
                <h4 className="font-heading text-sm font-bold text-ivory-primary">
                  {comparisonSection.historical_comparison.legacy_act} —{" "}
                  {comparisonSection.historical_comparison.legacy_section}:{" "}
                  {comparisonSection.historical_comparison.legacy_title}
                </h4>
                <p className="mt-2 whitespace-pre-line text-xs text-ivory-secondary leading-relaxed">
                  {comparisonSection.historical_comparison.legacy_text}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
              <h5 className="font-heading text-xs font-bold uppercase tracking-wider text-gold mb-2">
                Key Substantive &amp; Procedural Changes
              </h5>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-ivory-primary">
                {comparisonSection.historical_comparison.key_changes.map((chg, idx) => (
                  <li key={idx}>{chg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* Personal Annotation Modal */}
      <Modal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Attach Personal Statutory Annotation"
        subtitle={
          selectedSection
            ? `${selectedSection.act_short_title} — Section ${selectedSection.section_number}`
            : ""
        }
      >
        <form onSubmit={handleSaveSectionNote} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1">
              Note Title
            </label>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2 text-sm text-ivory-primary focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1">
              Research Annotation
            </label>
            <textarea
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              required
              placeholder="Enter your legal interpretation, court applicability note, or cross-reference..."
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary p-3 text-sm text-ivory-primary focus:border-gold focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNoteModalOpen(false)}
              className="rounded-lg border border-border-subtle px-4 py-2 text-xs text-ivory-secondary hover:text-ivory-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-navy-primary hover:bg-gold-bright"
            >
              Save to My Legal Library
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
