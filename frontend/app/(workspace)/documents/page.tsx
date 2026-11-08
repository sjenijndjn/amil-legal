"use client";

import React, { useEffect, useState } from "react";
import {
  FileSearch,
  Upload,
  ShieldCheck,
  AlertTriangle,
  GitCompare,
  Download,
  Trash2,
  Send,
  FileText,
  CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";
import { DocumentComparisonResult, LegalDocument } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { downloadTextFile, formatBytes, formatDateTime } from "@/lib/utils";

type AnalysisTab =
  | "summary"
  | "parties"
  | "clauses"
  | "obligations"
  | "deadlines"
  | "risks"
  | "qa";

export default function DocumentsPage() {
  const { notify } = useToast();

  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTab>("summary");

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [dpdpConsent, setDpdpConsent] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Document Q&A state
  const [docQuestion, setDocQuestion] = useState("");
  const [askingQa, setAskingQa] = useState(false);

  // Document Comparison state
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareDocA, setCompareDocA] = useState<string>("");
  const [compareDocB, setCompareDocB] = useState<string>("");
  const [comparisonResult, setComparisonResult] = useState<DocumentComparisonResult | null>(
    null
  );

  useEffect(() => {
    async function load() {
      const list = await api.getDocuments();
      setDocuments(list);
      if (list.length > 0) {
        setSelectedDoc(list[0]);
        setCompareDocA(list[0].id);
        setCompareDocB(list[1]?.id || list[0].id);
      }
    }
    load();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const f = e.target.files?.[0];
    if (!f) return;

    const allowedExts = [".pdf", ".docx", ".txt"];
    const lowerName = f.name.toLowerCase();
    if (!allowedExts.some((ext) => lowerName.endsWith(ext))) {
      setUploadError("Only PDF (.pdf), Word (.docx), and Plain Text (.txt) files are permitted.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setUploadError("File exceeds maximum size limit of 25 MB.");
      return;
    }

    setSelectedFile(f);
    if (!customTitle) {
      setCustomTitle(f.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!selectedFile) {
      setUploadError("Please select a PDF, DOCX, or TXT legal document to analyze.");
      return;
    }
    if (!dpdpConsent) {
      setUploadError(
        "You must grant explicit DPDP Act 2023 Section 6 consent before AI document extraction."
      );
      return;
    }

    setUploading(true);
    try {
      const created = await api.uploadAndAnalyzeDocument({
        file: selectedFile,
        title: customTitle,
        aiConsentGranted: dpdpConsent
      });
      const list = await api.getDocuments();
      setDocuments(list);
      setSelectedDoc(created);
      setSelectedFile(null);
      setCustomTitle("");
      notify({
        title: "Document analyzed & indexed",
        description: `${created.title} (${created.page_count} pages)`
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleAskDocQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !docQuestion.trim() || askingQa) return;
    setAskingQa(true);
    try {
      const updated = await api.askDocumentQuestion(selectedDoc.id, docQuestion.trim());
      setSelectedDoc(updated);
      const list = await api.getDocuments();
      setDocuments(list);
      setDocQuestion("");
      setActiveTab("qa");
      notify({
        title: "Page-cited answer generated",
        description: `Answered against ${updated.original_filename}`
      });
    } finally {
      setAskingQa(false);
    }
  };

  const handleRunComparison = async () => {
    if (!compareDocA || !compareDocB) return;
    const res = await api.compareDocuments(compareDocA, compareDocB);
    setComparisonResult(res);
    setCompareModalOpen(true);
  };

  const handleDeleteDocument = async (id: string) => {
    await api.deleteDocument(id);
    const list = await api.getDocuments();
    setDocuments(list);
    if (selectedDoc?.id === id) {
      setSelectedDoc(list[0] || null);
    }
    notify({
      title: "Document & private storage object deleted",
      variant: "info"
    });
  };

  const handleExportAnalysisReport = () => {
    if (!selectedDoc) return;
    const r = selectedDoc.analysis_result;
    const reportMd = [
      `# AMIL Document Intelligence Report — ${selectedDoc.title}`,
      `- **Original Filename:** ${selectedDoc.original_filename}`,
      `- **SHA-256 Hash:** \`${selectedDoc.sha256_hash}\``,
      `- **Page Count:** ${selectedDoc.page_count} pages | **OCR Applied:** ${selectedDoc.ocr_applied ? "Yes" : "No"}`,
      `- **DPDP Act 2023 Section 6 Consent:** Verified`,
      `\n## 1. Executive Summary\n${r.executive_summary}`,
      `\n## 2. Parties & Key Dates\n${r.parties_and_dates
        .map((p) => `- **${p.label}:** ${p.value} (Page ${p.page})`)
        .join("\n")}`,
      `\n## 3. Extracted Key Clauses\n${r.key_clauses
        .map((c) => `- **${c.clause_ref} (${c.title}) [Page ${c.page}]:** ${c.summary}`)
        .join("\n")}`,
      `\n## 4. Legal Obligations\n${r.obligations
        .map((o) => `- **${o.party} [${o.clause_ref}, Page ${o.page}]:** ${o.obligation}`)
        .join("\n")}`,
      `\n## 5. Deadlines & Notice Periods\n${r.deadlines_and_notice
        .map((d) => `- **${d.event}:** ${d.timeline} (${d.clause_ref}, Page ${d.page})`)
        .join("\n")}`,
      `\n## 6. Risk Flags & Recommendations\n${r.risk_flags
        .map(
          (f) =>
            `- **[${f.severity}] ${f.issue} (${f.clause_ref}, Page ${f.page}):** ${f.recommendation}`
        )
        .join("\n")}`
    ].join("\n");

    downloadTextFile(
      `${selectedDoc.title.slice(0, 32).replace(/\s+/g, "_")}_Analysis_Report.md`,
      reportMd,
      "text/markdown;charset=utf-8"
    );
    notify({
      title: "Exported Document Analysis Report (.MD)",
      description: selectedDoc.title
    });
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Upload Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & Consent Box (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-border-subtle bg-navy-card p-6 shadow-legal">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="h-4 w-4 text-gold" />
            <h1 className="font-heading text-lg font-bold text-ivory-primary">
              Upload Legal Document
            </h1>
          </div>
          <p className="text-xs text-ivory-secondary mb-4">
            Supports PDF, DOCX, and TXT up to 25 MB. Includes PyMuPDF extraction, Tesseract OCR fallback, and SHA-256 verification.
          </p>

          {uploadError && (
            <div
              role="alert"
              className="mb-3 rounded-lg border border-status-error/50 bg-status-error/15 p-3 text-xs text-status-error"
            >
              {uploadError}
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-3.5">
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-subtle bg-navy-secondary p-5 text-center cursor-pointer hover:border-gold transition-colors">
              <FileSearch className="h-7 w-7 text-gold mb-2" />
              <span className="text-xs font-semibold text-ivory-primary">
                {selectedFile
                  ? `${selectedFile.name} (${formatBytes(selectedFile.size)})`
                  : "Click to select PDF, DOCX, or TXT file"}
              </span>
              <span className="text-[11px] text-ivory-secondary mt-1">
                MIME & Magic-Byte Validated • Private Encrypted Storage
              </span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <div>
              <label className="block text-xs font-medium text-ivory-secondary mb-1">
                Document Title (Optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Master Services Agreement — Apex FinTech"
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary focus:border-gold focus:outline-none"
              />
            </div>

            <label className="flex items-start gap-2.5 rounded-lg border border-gold/30 bg-gold/10 p-3 text-xs text-ivory-primary cursor-pointer">
              <input
                type="checkbox"
                checked={dpdpConsent}
                onChange={(e) => setDpdpConsent(e.target.checked)}
                className="mt-0.5 accent-gold"
              />
              <span>
                <strong>DPDP Act 2023 Section 6 Consent:</strong> I authorize AMIL Juris AI to extract and analyze text from this document solely for my private workspace.
              </span>
            </label>

            <button
              type="submit"
              disabled={uploading}
              className="w-full rounded-lg bg-gold px-4 py-2.5 text-xs font-semibold text-navy-primary hover:bg-gold-bright transition-colors disabled:opacity-50"
            >
              {uploading ? "Extracting & Analyzing Clauses..." : "Upload & Run Legal Analysis"}
            </button>
          </form>
        </div>

        {/* Document Vault & Side-by-Side Comparison Selector (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-border-subtle bg-navy-card p-6 shadow-legal space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-heading text-lg font-bold text-ivory-primary">
                Workspace Document Vault ({documents.length})
              </h2>
              <Badge variant="success">
                <ShieldCheck className="h-3.5 w-3.5" />
                SHA-256 Integrity Verified
              </Badge>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-gold bg-gold/15"
                        : "border-border-subtle bg-navy-secondary hover:border-gold/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDoc(doc)}
                      className="text-left flex-1 min-w-0"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="h-4 w-4 text-gold shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold text-ivory-primary truncate">
                          {doc.title}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-ivory-secondary">
                        {doc.original_filename} • {doc.page_count} pages •{" "}
                        {formatBytes(doc.file_size_bytes)} •{" "}
                        {doc.ocr_applied ? "OCR Applied" : "Native Digital Text"}
                      </p>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={
                          doc.analysis_result.risk_flags.some((r) => r.severity === "HIGH")
                            ? "error"
                            : "gold"
                        }
                      >
                        {doc.analysis_result.risk_flags.length} Risks
                      </Badge>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1.5 text-ivory-secondary hover:text-status-error"
                        aria-label="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compare Two Documents Bar */}
          {documents.length >= 2 && (
            <div className="rounded-xl border border-gold/40 bg-navy-secondary p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <GitCompare className="h-4 w-4 text-gold" />
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-gold">
                  Side-by-Side Document & Redline Comparator
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <select
                  value={compareDocA}
                  onChange={(e) => setCompareDocA(e.target.value)}
                  aria-label="Select base document A"
                  className="rounded-lg border border-border-subtle bg-navy-card px-3 py-2 text-xs text-ivory-primary"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      Doc A: {d.title.slice(0, 32)}
                    </option>
                  ))}
                </select>
                <select
                  value={compareDocB}
                  onChange={(e) => setCompareDocB(e.target.value)}
                  aria-label="Select comparison document B"
                  className="rounded-lg border border-border-subtle bg-navy-card px-3 py-2 text-xs text-ivory-primary"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      Doc B: {d.title.slice(0, 32)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRunComparison}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-navy-primary hover:bg-gold-bright"
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  <span>Compare Documents</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Document Intelligence Viewer */}
      {selectedDoc && (
        <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 shadow-legal space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <Badge variant="mono">SHA-256: {selectedDoc.sha256_hash.slice(0, 16)}...</Badge>
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" />
                  DPDP Consent Granted
                </Badge>
                <Badge variant="outline">{selectedDoc.page_count} Pages Indexed</Badge>
              </div>
              <h2 className="font-heading text-xl font-bold text-ivory-primary">
                {selectedDoc.title}
              </h2>
              <p className="text-xs text-ivory-secondary mt-0.5">
                Uploaded {formatDateTime(selectedDoc.created_at)} • File:{" "}
                <span className="font-mono">{selectedDoc.original_filename}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportAnalysisReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold/50 bg-gold/15 px-4 py-2 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Analysis Report (.MD)</span>
            </button>
          </div>

          {/* Structured Analysis Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-border-subtle pb-3">
            {(
              [
                { id: "summary", label: "Executive Summary" },
                {
                  id: "risks",
                  label: `Risk Flags (${selectedDoc.analysis_result.risk_flags.length})`
                },
                {
                  id: "clauses",
                  label: `Key Clauses (${selectedDoc.analysis_result.key_clauses.length})`
                },
                {
                  id: "obligations",
                  label: `Obligations (${selectedDoc.analysis_result.obligations.length})`
                },
                {
                  id: "deadlines",
                  label: `Deadlines & Notice (${selectedDoc.analysis_result.deadlines_and_notice.length})`
                },
                {
                  id: "parties",
                  label: `Parties & Dates (${selectedDoc.analysis_result.parties_and_dates.length})`
                },
                {
                  id: "qa",
                  label: `Document Q&A (${selectedDoc.analysis_result.qa_history?.length || 0})`
                }
              ] as { id: AnalysisTab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                  activeTab === t.id
                    ? "bg-gold text-navy-primary"
                    : "bg-navy-secondary text-ivory-secondary hover:text-ivory-primary border border-border-subtle"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "summary" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-gold mb-2">
                  Executive Legal Summary
                </h3>
                <p className="text-sm text-ivory-primary leading-relaxed">
                  {selectedDoc.analysis_result.executive_summary}
                </p>
              </div>
              <div className="rounded-xl border border-border-subtle bg-navy-secondary p-4">
                <h4 className="font-mono text-xs uppercase text-ivory-secondary mb-1.5">
                  Extracted Document Text Preview
                </h4>
                <p className="font-mono text-xs text-ivory-primary leading-relaxed">
                  {selectedDoc.extracted_text_preview}
                </p>
              </div>
            </div>
          )}

          {activeTab === "risks" && (
            <div className="space-y-3">
              {selectedDoc.analysis_result.risk_flags.map((risk, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border-subtle bg-navy-secondary p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          risk.severity === "HIGH" ? "text-status-error" : "text-amber-400"
                        }`}
                      />
                      <span className="font-heading text-sm font-bold text-ivory-primary">
                        {risk.issue}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="mono">
                        {risk.clause_ref} • Page {risk.page}
                      </Badge>
                      <Badge variant={risk.severity === "HIGH" ? "error" : "warning"}>
                        {risk.severity} RISK
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-ivory-secondary leading-relaxed">
                    <strong className="text-gold">Legal Recommendation: </strong>
                    {risk.recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "clauses" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {selectedDoc.analysis_result.key_clauses.map((cl, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border-subtle bg-navy-secondary p-4"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-gold">
                      {cl.clause_ref}
                    </span>
                    <Badge variant="outline">Page {cl.page}</Badge>
                  </div>
                  <h4 className="font-heading text-sm font-bold text-ivory-primary">
                    {cl.title}
                  </h4>
                  <p className="mt-1.5 text-xs text-ivory-secondary leading-relaxed">
                    {cl.summary}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "obligations" && (
            <div className="space-y-3">
              {selectedDoc.analysis_result.obligations.map((ob, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border-subtle bg-navy-secondary p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-xs font-bold text-gold block">{ob.party}</span>
                    <p className="text-xs sm:text-sm text-ivory-primary mt-1">
                      {ob.obligation}
                    </p>
                  </div>
                  <Badge variant="mono" className="shrink-0">
                    {ob.clause_ref} • Page {ob.page}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {activeTab === "deadlines" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {selectedDoc.analysis_result.deadlines_and_notice.map((dl, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border-subtle bg-navy-secondary p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-ivory-primary">
                      {dl.event}
                    </span>
                    <Badge variant="mono">
                      {dl.clause_ref} (p. {dl.page})
                    </Badge>
                  </div>
                  <p className="font-mono text-xs text-gold mt-1">{dl.timeline}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "parties" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {selectedDoc.analysis_result.parties_and_dates.map((pd, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border-subtle bg-navy-secondary p-4"
                >
                  <span className="text-[11px] text-ivory-secondary block">
                    {pd.label} (Page {pd.page})
                  </span>
                  <span className="text-sm font-semibold text-ivory-primary mt-1 block">
                    {pd.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "qa" && (
            <div className="space-y-4">
              {selectedDoc.analysis_result.qa_history &&
              selectedDoc.analysis_result.qa_history.length > 0 ? (
                selectedDoc.analysis_result.qa_history.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border-subtle bg-navy-secondary p-4 space-y-2.5"
                  >
                    <p className="text-xs font-bold text-gold">Q: {item.question}</p>
                    <p className="text-xs sm:text-sm text-ivory-primary leading-relaxed">
                      {item.answer}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.citations.map((cit, cIdx) => (
                        <Badge key={cIdx} variant="mono">
                          Cited: Page {cit.page} ({cit.section_heading})
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-ivory-secondary">
                  Ask a question below to query this document with pinpoint page and clause citations.
                </p>
              )}
            </div>
          )}

          {/* Document-Scoped RAG Q&A Bar */}
          <form
            onSubmit={handleAskDocQuestion}
            className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={docQuestion}
              onChange={(e) => setDocQuestion(e.target.value)}
              placeholder={`Ask a pinpoint question about "${selectedDoc.title}" (e.g. 'What is the liability cap or arbitration clause?')...`}
              className="flex-1 rounded-lg border border-border-subtle bg-navy-secondary px-4 py-2.5 text-xs sm:text-sm text-ivory-primary placeholder:text-ivory-secondary focus:border-gold focus:outline-none"
            />
            <button
              type="submit"
              disabled={askingQa || !docQuestion.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gold px-5 py-2.5 text-xs font-semibold text-navy-primary hover:bg-gold-bright disabled:opacity-50 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{askingQa ? "Searching Chunks..." : "Query Document"}</span>
            </button>
          </form>
        </div>
      )}

      {/* Side-by-Side Document Comparison Modal */}
      <Modal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        title="Side-by-Side Legal Document Comparison"
        subtitle={
          comparisonResult
            ? `${comparisonResult.document_a_title} vs ${comparisonResult.document_b_title}`
            : ""
        }
        maxWidth="max-w-5xl"
      >
        {comparisonResult && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-xs text-ivory-primary">
              <strong className="text-gold block mb-1">Summary of Redline Deltas:</strong>
              {comparisonResult.summary_of_differences}
            </div>

            <div className="space-y-3">
              {comparisonResult.structural_deltas.map((delta, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border-subtle bg-navy-secondary p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading text-sm font-bold text-gold">
                      {delta.clause_topic}
                    </h4>
                    <Badge variant="warning">{delta.change_type}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-border-subtle bg-navy-card p-3">
                      <span className="font-mono text-[10px] uppercase text-ivory-secondary block mb-1">
                        Document A Position
                      </span>
                      <p className="text-ivory-primary">{delta.doc_a_position}</p>
                    </div>
                    <div className="rounded-lg border border-border-subtle bg-navy-card p-3">
                      <span className="font-mono text-[10px] uppercase text-gold block mb-1">
                        Document B Position
                      </span>
                      <p className="text-ivory-primary">{delta.doc_b_position}</p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-300">
                    <strong>Legal Impact Assessment:</strong> {delta.legal_impact}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
