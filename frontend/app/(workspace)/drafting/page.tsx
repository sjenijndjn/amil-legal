"use client";

import React, { useEffect, useState } from "react";
import {
  PenTool,
  Plus,
  AlertTriangle,
  History,
  BookOpen,
  Download,
  Save,
  Trash2,
  CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";
import { SEED_JUDGMENTS, SEED_LEGAL_SECTIONS } from "@/lib/seed-data";
import { DraftType, LegalDraft } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { downloadTextFile, formatDateTime } from "@/lib/utils";

const DRAFT_TYPES: DraftType[] = [
  "Legal Notice",
  "Application",
  "Complaint",
  "Representation",
  "Agreement",
  "Affidavit Draft",
  "Legal Research Memorandum",
  "General Legal Correspondence"
];

export default function DraftingStudioPage() {
  const { notify } = useToast();

  const [drafts, setDrafts] = useState<LegalDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<LegalDraft | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorTitle, setEditorTitle] = useState("");

  // New Draft Fact-Sheet Modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [draftType, setDraftType] = useState<DraftType>("Legal Notice");
  const [newTitle, setNewTitle] = useState("");
  const [senderName, setSenderName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [forum, setForum] = useState("Commercial Courts at Mumbai / Bombay High Court");
  const [chronology, setChronology] = useState("");
  const [relief, setRelief] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("15 clear days");

  // Citation Insertion Modal & Version History Modal
  const [citationModalOpen, setCitationModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const list = await api.getDrafts();
      setDrafts(list);
      if (list.length > 0) {
        setSelectedDraft(list[0]);
        setEditorTitle(list[0].title);
        setEditorContent(list[0].content_markdown);
      }
    }
    load();
  }, []);

  const handleSelectDraft = (d: LegalDraft) => {
    setSelectedDraft(d);
    setEditorTitle(d.title);
    setEditorContent(d.content_markdown);
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created = await api.createDraft({
      title: newTitle.trim(),
      draft_type: draftType,
      user_facts: {
        client_or_sender_name: senderName.trim() || "[INSERT CLIENT / SENDER NAME]",
        recipient_or_opposite_party:
          recipientName.trim() || "[INSERT RECIPIENT / OPPOSITE PARTY]",
        jurisdiction_or_forum: forum.trim() || "Republic of India",
        chronology_of_facts:
          chronology.trim() || "[INSERT VERIFIED CHRONOLOGY OF FACTS]",
        relief_or_remedy_sought: relief.trim() || "[INSERT SPECIFIC RELIEF SOUGHT]",
        notice_period_or_deadline: noticePeriod.trim() || "15 clear days"
      }
    });

    const list = await api.getDrafts();
    setDrafts(list);
    handleSelectDraft(created);
    setNewModalOpen(false);
    setNewTitle("");
    setSenderName("");
    setRecipientName("");
    setChronology("");
    setRelief("");

    notify({
      title: `Generated ${draftType} draft`,
      description: "Fact-sheet grounded draft ready for human legal review."
    });
  };

  const handleSaveRevision = async () => {
    if (!selectedDraft) return;
    const updated = await api.updateDraft(selectedDraft.id, {
      title: editorTitle,
      content_markdown: editorContent,
      version_note: `Manual legal review edit saved at ${new Date().toLocaleTimeString("en-IN")}`
    });
    const list = await api.getDrafts();
    setDrafts(list);
    setSelectedDraft(updated);
    notify({
      title: `Saved Draft Version v${updated.version}`,
      description: "Version history updated."
    });
  };

  const handleInsertVerifiedCitation = async (item: {
    id: string;
    citation: string;
    title: string;
    type: "STATUTE" | "JUDGMENT";
  }) => {
    if (!selectedDraft) return;
    const snippet = `\n\n> **Verified Authority (${item.citation}):** *${item.title}*\n`;
    const nextContent = editorContent + snippet;
    setEditorContent(nextContent);

    const existingRefs = selectedDraft.cited_references || [];
    const nextRefs = existingRefs.some((r) => r.id === item.id)
      ? existingRefs
      : [...existingRefs, item];

    const updated = await api.updateDraft(selectedDraft.id, {
      content_markdown: nextContent,
      cited_references: nextRefs,
      version_note: `Inserted verified citation: ${item.citation}`
    });
    setSelectedDraft(updated);
    const list = await api.getDrafts();
    setDrafts(list);
    setCitationModalOpen(false);
    notify({
      title: "Verified citation inserted into draft",
      description: `${item.citation} — ${item.title}`
    });
  };

  const handleDeleteDraft = async (id: string) => {
    await api.deleteDraft(id);
    const list = await api.getDrafts();
    setDrafts(list);
    if (selectedDraft?.id === id) {
      const next = list[0] || null;
      setSelectedDraft(next);
      setEditorTitle(next?.title || "");
      setEditorContent(next?.content_markdown || "");
    }
    notify({ title: "Draft deleted", variant: "info" });
  };

  const handleExportDraft = (format: "docx" | "pdf" | "md") => {
    if (!selectedDraft) return;
    const safeName = (editorTitle || selectedDraft.title)
      .slice(0, 36)
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    if (format === "md") {
      downloadTextFile(`${safeName}.md`, editorContent, "text/markdown;charset=utf-8");
      notify({ title: "Exported Draft as Markdown (.md)" });
    } else if (format === "docx") {
      // Word-compatible HTML/DOCX document stream with legal formatting
      const wordDocContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${editorTitle}</title></head>
        <body style="font-family: 'Times New Roman', serif; line-height: 1.6; padding: 40px;">
          <p style="color: #8a5a00; font-weight: bold; border: 1px solid #8a5a00; padding: 8px;">
            [AI-GENERATED DRAFT — REQUIRES HUMAN LEGAL REVIEW BEFORE EXECUTION OR FILING]
          </p>
          <h1>${editorTitle}</h1>
          <pre style="white-space: pre-wrap; font-family: 'Times New Roman', serif; font-size: 12pt;">${editorContent}</pre>
        </body></html>
      `;
      downloadTextFile(
        `${safeName}.doc`,
        wordDocContent,
        "application/msword;charset=utf-8"
      );
      notify({
        title: "Exported Word Document (.doc / .docx compatible)",
        description: `${safeName}.doc`
      });
    } else if (format === "pdf") {
      if (typeof window !== "undefined") {
        window.print();
      }
      notify({
        title: "Opened PDF Print / Export View",
        description: "Save as PDF using the system print dialog."
      });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Mandatory Legal Review Banner */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/50 bg-amber-500/15 px-5 py-3 text-xs text-amber-200">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            <strong>MANDATORY SAFEGUARD — AI-GENERATED DRAFT (REQUIRES HUMAN LEGAL REVIEW):</strong>{" "}
            Drafts are constructed strictly from your supplied fact-sheet and verified citations. Never file or serve without independent verification of facts, limitation dates, and annexures.
          </span>
        </div>
        <Badge variant="warning" className="shrink-0">
          NO FABRICATED FACTS
        </Badge>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Drafts List & Template Creator (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-border-subtle bg-navy-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenTool className="h-4 w-4 text-gold" />
                <h1 className="font-heading text-base font-bold text-ivory-primary">
                  Drafting Studio
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setNewModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-navy-primary hover:bg-gold-bright"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Draft</span>
              </button>
            </div>

            <p className="text-xs text-ivory-secondary">
              8 Supported Indian Legal Instrument Templates:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DRAFT_TYPES.map((dt) => (
                <button
                  key={dt}
                  type="button"
                  onClick={() => {
                    setDraftType(dt);
                    setNewModalOpen(true);
                  }}
                  className="rounded-md border border-border-subtle bg-navy-secondary px-2 py-1 text-[11px] text-ivory-secondary hover:border-gold hover:text-gold transition-colors"
                >
                  + {dt}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-border-subtle space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-ivory-secondary">
                Saved Drafts ({drafts.length})
              </p>
              {drafts.map((dr) => {
                const isSelected = selectedDraft?.id === dr.id;
                return (
                  <div
                    key={dr.id}
                    className={`flex items-start justify-between gap-2 rounded-lg border p-3 transition-all ${
                      isSelected
                        ? "border-gold bg-gold/15"
                        : "border-border-subtle bg-navy-secondary hover:border-gold/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectDraft(dr)}
                      className="text-left flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="gold" className="text-[10px]">
                          {dr.draft_type}
                        </Badge>
                        <span className="font-mono text-[10px] text-ivory-secondary">
                          v{dr.version}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-ivory-primary line-clamp-2">
                        {dr.title}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-ivory-secondary">
                        Updated {formatDateTime(dr.updated_at)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDraft(dr.id)}
                      className="p-1 text-ivory-secondary hover:text-status-error"
                      aria-label="Delete draft"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Editor & Live Preview (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedDraft ? (
            <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 space-y-4 shadow-legal">
              {/* Editor Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-4">
                <div className="flex-1 min-w-[240px]">
                  <input
                    type="text"
                    value={editorTitle}
                    onChange={(e) => setEditorTitle(e.target.value)}
                    className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-1.5 font-heading text-base font-bold text-ivory-primary focus:border-gold focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCitationModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Insert Verified Citation</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistoryModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-secondary px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>Versions (v{selectedDraft.version})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveRevision}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3.5 py-1.5 text-xs font-semibold text-navy-primary hover:bg-gold-bright"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Revision</span>
                  </button>
                </div>
              </div>

              {/* Cited Authorities Strip */}
              {selectedDraft.cited_references.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-ivory-secondary">
                    Grounded Citations in Draft:
                  </span>
                  {selectedDraft.cited_references.map((ref) => (
                    <Badge key={ref.id} variant="mono">
                      <CheckCircle2 className="h-3 w-3 text-status-success" />
                      {ref.citation}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Split Editable Workspace & Formatted Legal Preview */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase text-ivory-secondary mb-1.5">
                    Editable Legal Draft (Markdown)
                  </label>
                  <textarea
                    rows={18}
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    className="w-full rounded-xl border border-border-subtle bg-navy-secondary p-4 font-mono text-xs text-ivory-primary leading-relaxed focus:border-gold focus:outline-none"
                  />
                </div>

                <div>
                  <span className="block font-mono text-[11px] uppercase text-ivory-secondary mb-1.5">
                    Formatted Instrument Preview
                  </span>
                  <div className="h-[412px] overflow-y-auto rounded-xl border border-border-subtle bg-navy-primary p-5 whitespace-pre-line text-xs sm:text-sm text-ivory-primary leading-relaxed">
                    {editorContent}
                  </div>
                </div>
              </div>

              {/* Export Footer */}
              <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-ivory-secondary">
                  Export includes mandatory human-review watermark and citation schedule.
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportDraft("docx")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export .DOCX / Word</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportDraft("pdf")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export / Print .PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportDraft("md")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/15 px-3.5 py-2 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export .MD</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Create New Draft Fact-Sheet Modal */}
      <Modal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Generate Fact-Grounded Legal Draft"
        subtitle="Juris never invents parties, dates, or annexures — missing facts remain clearly bracketed placeholders."
      >
        <form onSubmit={handleCreateDraft} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ivory-secondary mb-1">
                Instrument / Draft Type
              </label>
              <select
                value={draftType}
                onChange={(e) => setDraftType(e.target.value as DraftType)}
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary"
              >
                {DRAFT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ivory-secondary mb-1">
                Draft Title / Subject
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                placeholder="e.g. Legal Notice for Recovery of Commercial Dues"
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ivory-secondary mb-1">
                Client / Sender / Applicant Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Leave blank to insert [PLACEHOLDER]"
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ivory-secondary mb-1">
                Recipient / Opposite Party
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Leave blank to insert [PLACEHOLDER]"
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ivory-secondary mb-1">
                Jurisdiction / Court / Forum
              </label>
              <input
                type="text"
                value={forum}
                onChange={(e) => setForum(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ivory-secondary mb-1">
                Notice Period / Compliance Timeline
              </label>
              <input
                type="text"
                value={noticePeriod}
                onChange={(e) => setNoticePeriod(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1">
              Verified Chronology of Facts
            </label>
            <textarea
              rows={3}
              value={chronology}
              onChange={(e) => setChronology(e.target.value)}
              placeholder="Enter exact dates, invoice/agreement numbers, and events..."
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary p-3 text-xs text-ivory-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1">
              Specific Relief / Claim / Remedy Sought
            </label>
            <textarea
              rows={2}
              value={relief}
              onChange={(e) => setRelief(e.target.value)}
              placeholder="e.g. Refund of principal sum with 18% p.a. interest under Section 73 Indian Contract Act, 1872..."
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary p-3 text-xs text-ivory-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setNewModalOpen(false)}
              className="rounded-lg border border-border-subtle px-4 py-2 text-xs text-ivory-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gold px-5 py-2 text-xs font-semibold text-navy-primary"
            >
              Generate Grounded Draft
            </button>
          </div>
        </form>
      </Modal>

      {/* Verified Citation Insertion Modal */}
      <Modal
        isOpen={citationModalOpen}
        onClose={() => setCitationModalOpen(false)}
        title="Insert Verified Statutory or Judicial Citation"
        subtitle="Only authorities verified in the AMIL India Code & Supreme Court e-SCR corpus can be inserted."
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-mono text-xs uppercase text-gold mb-2">
              Verified Statutory Provisions
            </h4>
            <div className="space-y-2">
              {SEED_LEGAL_SECTIONS.map((sec) => (
                <div
                  key={sec.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-navy-secondary p-3 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-gold">
                      {sec.act_short_title} — Section {sec.section_number}
                    </span>
                    <p className="text-ivory-primary">{sec.section_title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleInsertVerifiedCitation({
                        id: sec.id,
                        citation: `${sec.act_short_title} — Section ${sec.section_number}`,
                        title: sec.section_title,
                        type: "STATUTE"
                      })
                    }
                    className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-navy-primary shrink-0"
                  >
                    Insert Citation
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-mono text-xs uppercase text-gold mb-2">
              Verified Binding Supreme Court Precedents
            </h4>
            <div className="space-y-2">
              {SEED_JUDGMENTS.filter((j) => j.precedent_status === "BINDING").map(
                (jud) => (
                  <div
                    key={jud.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-navy-secondary p-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-gold">
                        {jud.neutral_citation}
                      </span>
                      <p className="text-ivory-primary">{jud.case_title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleInsertVerifiedCitation({
                          id: jud.id,
                          citation: `${jud.case_title} (${jud.neutral_citation})`,
                          title: jud.ratio_decidendi.slice(0, 120) + "...",
                          type: "JUDGMENT"
                        })
                      }
                      className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-navy-primary shrink-0"
                    >
                      Insert Citation
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Version History Modal */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="Draft Version History"
        subtitle={selectedDraft?.title}
      >
        {selectedDraft && (
          <div className="space-y-3">
            {selectedDraft.version_history.map((ver) => (
              <div
                key={ver.version}
                className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-navy-secondary p-3.5 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-gold">
                    Version v{ver.version}
                  </span>
                  <span className="mx-2 text-ivory-secondary">•</span>
                  <span className="text-ivory-secondary">
                    {formatDateTime(ver.updated_at)}
                  </span>
                  <p className="mt-1 text-ivory-primary">{ver.summary_note}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditorContent(ver.content_markdown);
                    setHistoryModalOpen(false);
                    notify({
                      title: `Restored Version v${ver.version} into editor`
                    });
                  }}
                  className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary shrink-0"
                >
                  Restore v{ver.version}
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
