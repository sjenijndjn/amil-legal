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
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api";
import { LegalAct, LegalSection, LegislationStatus } from "@/lib/types";
import { Badge, StatuteStatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export default function BareActsPage() {
  const { notify } = useToast();

  const [statusTab, setStatusTab] = useState<LegislationStatus>("CURRENT");
  const [actSearch, setActSearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");

  const [acts, setActs] = useState<LegalAct[]>([]);
  const [selectedAct, setSelectedAct] = useState<LegalAct | null>(null);
  const [sections, setSections] = useState<LegalSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<LegalSection | null>(null);

  const [comparisonSection, setComparisonSection] = useState<LegalSection | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    async function loadActs() {
      const list = await api.getActs(statusTab, actSearch);
      setActs(list);
      if (list.length > 0) {
        setSelectedAct(list[0]);
      } else {
        setSelectedAct(null);
      }
    }
    loadActs();
  }, [statusTab, actSearch]);

  useEffect(() => {
    async function loadSections() {
      if (!selectedAct) {
        setSections([]);
        setSelectedSection(null);
        return;
      }
      const list = await api.getActSections(selectedAct.id, sectionSearch);
      setSections(list);
      setSelectedSection(list[0] || null);
    }
    loadSections();
  }, [selectedAct, sectionSearch]);

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
      {/* Header & Legislation Era Switcher */}
      <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 shadow-legal">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ivory-primary">
              Bare Act Library & Statutory Comparator
            </h1>
            <p className="text-xs text-ivory-secondary mt-0.5">
              Hierarchical statutory reader with effective-date verification and side-by-side BNS/BNSS/BSA (2023) vs IPC/CrPC/IEA comparison.
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
              Current Enacted (BNS / BNSS / BSA / COI / DPDP)
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
              Historical Codes (IPC 1860 / CrPC 1973 / IEA 1872)
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
            <h2 className="font-heading text-sm font-bold text-ivory-primary">
              {statusTab === "CURRENT" ? "Enacted Statutes" : "Historical Codes"} ({acts.length})
            </h2>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ivory-secondary" />
            <input
              type="search"
              value={actSearch}
              onChange={(e) => setActSearch(e.target.value)}
              placeholder="Filter statutes by title or subject..."
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-8 pr-3 py-2 text-xs text-ivory-primary placeholder:text-ivory-secondary focus:border-gold focus:outline-none"
            />
          </div>

          <div className="space-y-2 max-h-52 lg:max-h-[65vh] overflow-y-auto pr-1">
            {acts.map((act) => {
              const isSelected = selectedAct?.id === act.id;
              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setSelectedAct(act)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    isSelected
                      ? "border-gold bg-gold/15"
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
                    {act.replaces_act_code && (
                      <span className="text-status-success">
                        Replaces {act.replaces_act_code}
                      </span>
                    )}
                    {act.replaced_by_act_code && (
                      <span className="text-amber-300">
                        Replaced by {act.replaced_by_act_code}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
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
                    </div>
                    <h2 className="font-heading text-xl font-bold text-ivory-primary">
                      {selectedAct.title}
                    </h2>
                  </div>

                  <a
                    href={selectedAct.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary"
                  >
                    <span>India Code Official Text</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <p className="mt-2 text-xs text-ivory-secondary italic">
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
                    <span className="text-ivory-secondary block text-[11px]">Total Sections</span>
                    <span className="font-mono text-ivory-primary">{selectedAct.sections_count} Sections</span>
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
                    <span>Indexed Key Sections & Provisions</span>
                  </h3>
                  <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ivory-secondary" />
                    <input
                      type="search"
                      value={sectionSearch}
                      onChange={(e) => setSectionSearch(e.target.value)}
                      placeholder="Search section number or text..."
                      className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-8 pr-3 py-1.5 text-xs text-ivory-primary placeholder:text-ivory-secondary focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>

                {sections.length > 0 ? (
                  <div className="space-y-4">
                    {/* Section Pills */}
                    <div className="flex flex-wrap gap-2">
                      {sections.map((sec) => (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => setSelectedSection(sec)}
                          className={`rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${
                            selectedSection?.id === sec.id
                              ? "border-gold bg-gold text-navy-primary font-bold"
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
                            {selectedSection.historical_comparison && (
                              <button
                                type="button"
                                onClick={() => setComparisonSection(selectedSection)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gold bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary transition-colors"
                              >
                                <GitCompare className="h-3.5 w-3.5" />
                                <span>Compare 2023 vs Legacy Text</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleBookmarkSection(selectedSection)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-card px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold"
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
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-card px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold"
                            >
                              <StickyNote className="h-3.5 w-3.5" />
                              <span>Add Note</span>
                            </button>
                          </div>
                        </div>

                        <div className="whitespace-pre-line rounded-lg border border-border-subtle bg-navy-primary p-4 text-sm text-ivory-primary leading-relaxed font-sans">
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
                  <p className="text-xs text-ivory-secondary py-4">
                    Select another Act or clear the section filter to view statutory text.
                  </p>
                )}
              </div>
            </>
          ) : null}
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
                Key Substantive & Procedural Changes
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
