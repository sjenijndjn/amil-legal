"use client";

import React, { useEffect, useState } from "react";
import {
  Scale,
  Search,
  BookmarkPlus,
  StickyNote,
  ExternalLink,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";
import { Judgment, PrecedentStatus } from "@/lib/types";
import { Badge, PrecedentBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export default function CaseLawsPage() {
  const { notify } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PrecedentStatus | "ALL">("ALL");
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [selectedJudgment, setSelectedJudgment] = useState<Judgment | null>(null);

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    async function load() {
      const list = await api.getJudgments({
        q: searchQuery,
        precedent_status: statusFilter
      });
      setJudgments(list);
      if (list.length > 0 && (!selectedJudgment || !list.some((j) => j.id === selectedJudgment.id))) {
        setSelectedJudgment(list[0]);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter]);

  const handleSaveJudgment = async (jud: Judgment) => {
    await api.createBookmark({
      item_type: "JUDGMENT",
      target_id: jud.id,
      title: jud.case_title,
      citation: `${jud.neutral_citation} | ${jud.equivalent_citations[0] || ""}`,
      excerpt: jud.ratio_decidendi,
      tags: [jud.neutral_citation, jud.precedent_status, jud.bench_type]
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
      tags: [selectedJudgment.neutral_citation, "Case Law Note"],
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
    <div className="space-y-6 pb-10">
      {/* Header & Search/Filter Bar */}
      <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 shadow-legal">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ivory-primary">
              Case Law & Precedent Intelligence
            </h1>
            <p className="text-xs text-ivory-secondary mt-0.5">
              Verified Supreme Court e-SCR and High Court judgments with precedent treatment status, ratio decidendi, and paragraph-level extracts.
            </p>
          </div>
          <Badge variant="gold">INSC Neutral Citations + SCC</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-8 relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by case title (e.g. Puttaswamy, Arjun Panditrao, CORE), neutral citation (2024 INSC 857), judge, or issue..."
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-10 pr-4 py-2.5 text-sm text-ivory-primary placeholder:text-ivory-secondary/75 focus:border-gold focus:outline-none"
            />
          </div>

          <div className="lg:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PrecedentStatus | "ALL")}
              aria-label="Filter by precedent status"
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2.5 text-xs font-medium text-ivory-primary focus:border-gold focus:outline-none"
            >
              <option value="ALL">All Precedent Statuses</option>
              <option value="BINDING">BINDING Precedents Only</option>
              <option value="PERSUASIVE">PERSUASIVE Authorities</option>
              <option value="DISTINGUISHED">DISTINGUISHED</option>
              <option value="OVERRULED">OVERRULED (Caution List)</option>
              <option value="PENDING_VERIFICATION">PENDING VERIFICATION</option>
            </select>
          </div>
        </div>
      </div>

      {/* Master-Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of Judgments (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {judgments.map((jud) => {
            const isSelected = selectedJudgment?.id === jud.id;
            return (
              <button
                key={jud.id}
                type="button"
                onClick={() => setSelectedJudgment(jud)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "border-gold bg-gold/15 shadow-gold"
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
                <p className="mt-1 text-[11px] text-ivory-secondary">
                  {jud.court} • {jud.bench_type} • Decided: {jud.decision_date}
                </p>
                <p className="mt-2 text-xs text-ivory-secondary line-clamp-2">
                  {jud.ratio_decidendi}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right Judgment Reader (7 cols) */}
        <div className="lg:col-span-7">
          {selectedJudgment ? (
            <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 space-y-5 shadow-legal">
              {selectedJudgment.precedent_status === "OVERRULED" && (
                <div className="flex items-start gap-2.5 rounded-xl border border-status-error bg-status-error/15 p-3.5 text-xs text-status-error">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div>
                    <strong>OVERRULED PRECEDENT ALERT:</strong> This decision has been overruled by a larger bench of the Supreme Court. Do not cite as binding authority.
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="mono">{selectedJudgment.neutral_citation}</Badge>
                    {selectedJudgment.equivalent_citations.map((eq) => (
                      <Badge key={eq} variant="outline" className="font-mono text-[11px]">
                        {eq}
                      </Badge>
                    ))}
                    <PrecedentBadge status={selectedJudgment.precedent_status} />
                  </div>
                  <h2 className="font-heading text-xl font-bold text-ivory-primary">
                    {selectedJudgment.case_title}
                  </h2>
                  <p className="mt-1 text-xs text-ivory-secondary">
                    {selectedJudgment.court} • {selectedJudgment.bench_type} • Decision Date:{" "}
                    <span className="font-mono text-ivory-primary">
                      {selectedJudgment.decision_date}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveJudgment(selectedJudgment)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" />
                    <span>Save Judgment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-secondary px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold"
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                    <span>Add Note</span>
                  </button>
                  <a
                    href={selectedJudgment.official_source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-secondary px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold"
                  >
                    <span>Official e-SCR</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Coram / Judges */}
              <div>
                <h4 className="font-mono text-[11px] uppercase tracking-wider text-ivory-secondary mb-1.5">
                  Coram / Hon&apos;ble Judges
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJudgment.judges.map((judge) => (
                    <Badge key={judge} variant="default">
                      {judge}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Ratio Decidendi */}
              <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-gold mb-1.5 flex items-center gap-1.5">
                  <Scale className="h-4 w-4" />
                  <span>Ratio Decidendi (Binding Holding)</span>
                </h4>
                <p className="text-sm text-ivory-primary leading-relaxed">
                  {selectedJudgment.ratio_decidendi}
                </p>
              </div>

              {/* Headnote Summary */}
              <div>
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-ivory-secondary mb-1.5">
                  Judgment Summary & Background
                </h4>
                <p className="text-xs sm:text-sm text-ivory-primary leading-relaxed">
                  {selectedJudgment.headnote_summary}
                </p>
              </div>

              {/* Extracted Key Paragraphs */}
              <div>
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-ivory-secondary mb-2">
                  Extracted Key Paragraphs
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

              {/* Subsequent / Cited Authorities */}
              {selectedJudgment.cited_authorities.length > 0 && (
                <div>
                  <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-ivory-secondary mb-2">
                    Precedent Treatment & Cited Authorities
                  </h4>
                  <div className="space-y-2">
                    {selectedJudgment.cited_authorities.map((ca, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border-subtle bg-navy-secondary p-3 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-ivory-primary">
                            {ca.citation_text}
                          </span>
                          <p className="text-ivory-secondary mt-0.5">{ca.context_excerpt}</p>
                        </div>
                        <Badge
                          variant={ca.treatment_type === "OVERRULED" ? "error" : "success"}
                        >
                          {ca.treatment_type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification Footnote */}
              <div className="pt-3 border-t border-border-subtle flex items-center gap-2 text-xs text-ivory-secondary">
                <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" />
                <span>{selectedJudgment.verification_notes}</span>
              </div>
            </div>
          ) : null}
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
            placeholder="Write your private analysis on how this precedent applies to your brief or contract..."
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
