"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Plus,
  Search,
  Trash2,
  Edit3,
  Check,
  Download,
  Send,
  ShieldCheck,
  MessageSquare
} from "lucide-react";
import { api } from "@/lib/api";
import { CitedSource, Conversation, ResponseMode } from "@/lib/types";
import { StructuredAnswerCard } from "@/components/juris/StructuredAnswerCard";
import { SourcePanel } from "@/components/juris/SourcePanel";
import { useToast } from "@/components/ui/Toast";
import { downloadTextFile, formatDateTime } from "@/lib/utils";

function JurisWorkspaceInner() {
  const searchParams = useSearchParams();
  const { notify } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [searchConvQuery, setSearchConvQuery] = useState("");
  const [promptInput, setPromptInput] = useState("");
  const [responseMode, setResponseMode] = useState<ResponseMode>("detailed");
  const [isSending, setIsSending] = useState(false);

  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [inspectedSource, setInspectedSource] = useState<CitedSource | null>(null);

  useEffect(() => {
    async function load() {
      const list = await api.getConversations();
      setConversations(list);

      const paramConvId = searchParams.get("conv");
      const paramMode = searchParams.get("mode") as ResponseMode | null;
      const paramQuery = searchParams.get("q");

      if (paramMode && ["short", "standard", "detailed", "research"].includes(paramMode)) {
        setResponseMode(paramMode);
      }

      if (paramConvId) {
        const found = list.find((c) => c.id === paramConvId);
        if (found) setActiveConv(found);
      } else if (list.length > 0) {
        setActiveConv(list[0]);
      }

      if (paramQuery) {
        setPromptInput(paramQuery);
      }
    }
    load();
  }, [searchParams]);

  const handleFilterConversations = async (q: string) => {
    setSearchConvQuery(q);
    const filtered = await api.getConversations(q);
    setConversations(filtered);
  };

  const handleNewConversation = async () => {
    const created = await api.createConversation("New Legal Consultation", responseMode);
    const updatedList = await api.getConversations(searchConvQuery);
    setConversations(updatedList);
    setActiveConv(created);
    setPromptInput("");
    notify({
      title: "Started new Juris consultation",
      description: "Ask any question across Indian statutes, case law, or uploaded documents."
    });
  };

  const handleRenameConversation = async (id: string) => {
    if (!editingTitle.trim()) {
      setEditingConvId(null);
      return;
    }
    const updated = await api.updateConversation(id, { title: editingTitle.trim() });
    const list = await api.getConversations(searchConvQuery);
    setConversations(list);
    if (activeConv?.id === id && updated) {
      setActiveConv(updated);
    }
    setEditingConvId(null);
    notify({ title: "Conversation renamed" });
  };

  const handleDeleteConversation = async (id: string) => {
    await api.deleteConversation(id);
    const list = await api.getConversations(searchConvQuery);
    setConversations(list);
    if (activeConv?.id === id) {
      setActiveConv(list[0] || null);
    }
    notify({
      title: "Conversation deleted",
      variant: "info"
    });
  };

  const handleSendQuestion = async (questionText?: string) => {
    const q = (questionText ?? promptInput).trim();
    if (!q || isSending) return;

    setIsSending(true);
    setPromptInput("");
    try {
      const { conversation } = await api.sendJurisMessage({
        message: q,
        conversation_id: activeConv?.id,
        response_mode: responseMode
      });
      setActiveConv(conversation);
      const list = await api.getConversations(searchConvQuery);
      setConversations(list);
    } finally {
      setIsSending(false);
    }
  };

  const handleExportConversation = (format: "markdown" | "json") => {
    if (!activeConv) return;
    if (format === "json") {
      downloadTextFile(
        `${activeConv.title.slice(0, 36).replace(/\s+/g, "_")}.json`,
        JSON.stringify(activeConv, null, 2),
        "application/json"
      );
    } else {
      const mdLines = [
        `# ${activeConv.title}`,
        `- **Platform:** AMIL Legal Intelligence (Juris AI)`,
        `- **Response Mode:** ${activeConv.response_mode.toUpperCase()}`,
        `- **Exported At:** ${new Date().toISOString()}`,
        `\n---\n`
      ];
      (activeConv.messages || []).forEach((m) => {
        if (m.role === "user") {
          mdLines.push(`## Inquiry (User)\n${m.content}\n`);
        } else if (m.structured_sections) {
          const s = m.structured_sections;
          mdLines.push(
            `## Juris 7-Part Legal Analysis`,
            `### 1. Direct Answer\n${s.direct_answer}\n`,
            `### 2. Applicable Legal Provisions\n${s.applicable_provisions
              .map((p) => `- **${p.act_title} — ${p.section}** (${p.status}): ${p.summary}`)
              .join("\n")}\n`,
            `### 3. Relevant Judgments\n${s.relevant_judgments
              .map(
                (j) =>
                  `- **${j.case_title}**, ${j.neutral_citation} (${j.court}) [${j.precedent_status}]: ${j.holding}`
              )
              .join("\n")}\n`,
            `### 4. Legal Reasoning\n${s.legal_reasoning}\n`,
            `### 5. Source References\n${s.source_references
              .map((r) => `- ${r.title} (${r.citation}) — ${r.repository} [${r.official_url}]`)
              .join("\n")}\n`,
            `### 6. Important Limitations\n${s.important_limitations}\n`,
            `### 7. Verification Date\n${s.verification_date}\n`
          );
        } else {
          mdLines.push(`## Juris Response\n${m.content}\n`);
        }
      });
      downloadTextFile(
        `${activeConv.title.slice(0, 36).replace(/\s+/g, "_")}.md`,
        mdLines.join("\n"),
        "text/markdown;charset=utf-8"
      );
    }
    notify({
      title: `Conversation exported as .${format === "markdown" ? "md" : "json"}`,
      description: activeConv.title
    });
  };

  const starterPrompts = [
    "Compare Section 318 BNS 2023 with Section 420 IPC 1860 on cheating and inducement of property.",
    "What is the mandatory certification requirement for WhatsApp & server logs under Section 63 BSA 2023?",
    "Are unilateral arbitrator appointment clauses valid after CORE v. ECI SPIC (2024 INSC 857)?",
    "Explain the police arrest checklist under Arnesh Kumar v. State of Bihar and Section 35 BNSS 2023."
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
      {/* Left Conversation History Sidebar (3 cols) */}
      <aside className="lg:col-span-3 flex flex-col rounded-xl border border-border-subtle bg-navy-card p-3.5 sm:p-4 max-h-52 lg:max-h-none lg:h-[calc(100dvh-7.5rem)]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <h2 className="font-heading text-sm font-bold text-ivory-primary">
              Consultations
            </h2>
          </div>
          <button
            type="button"
            onClick={handleNewConversation}
            className="inline-flex items-center gap-1 rounded-lg bg-gold px-2.5 py-1.5 text-xs font-semibold text-navy-primary hover:bg-gold-bright transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ivory-secondary" />
          <input
            type="search"
            value={searchConvQuery}
            onChange={(e) => handleFilterConversations(e.target.value)}
            placeholder="Search consultations..."
            className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-8 pr-3 py-1.5 text-xs text-ivory-primary placeholder:text-ivory-secondary focus:border-gold focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {conversations.map((conv) => {
            const isSelected = activeConv?.id === conv.id;
            const isEditing = editingConvId === conv.id;

            return (
              <div
                key={conv.id}
                className={`group rounded-lg border p-2.5 transition-all ${
                  isSelected
                    ? "border-gold/60 bg-gold/10"
                    : "border-border-subtle bg-navy-secondary hover:border-gold/30"
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="flex-1 rounded border border-gold bg-navy-card px-2 py-1 text-xs text-ivory-primary focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleRenameConversation(conv.id)}
                      className="rounded bg-gold p-1 text-navy-primary"
                      aria-label="Save conversation title"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveConv(conv)}
                      className="text-left flex-1 min-w-0"
                    >
                      <p className="text-xs font-semibold text-ivory-primary line-clamp-2">
                        {conv.title}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-ivory-secondary">
                        {formatDateTime(conv.updated_at)}
                      </p>
                    </button>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingConvId(conv.id);
                          setEditingTitle(conv.title);
                        }}
                        className="p-1 text-ivory-secondary hover:text-gold"
                        aria-label="Rename conversation"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteConversation(conv.id)}
                        className="p-1 text-ivory-secondary hover:text-status-error"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Consultation Workspace (9 cols) */}
      <div className="lg:col-span-9 flex flex-col space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-navy-card px-5 py-3.5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-lg font-bold text-ivory-primary">
                Ask Juris — Legal Intelligence
              </h1>
              <span className="inline-flex items-center gap-1 rounded border border-status-success/40 bg-status-success/10 px-2 py-0.5 text-[11px] font-medium text-status-success">
                <ShieldCheck className="h-3 w-3" />
                Zero-Hallucination Citation Validator Active
              </span>
            </div>
            <p className="text-xs text-ivory-secondary mt-0.5">
              Every response is structured in 7 parts and cross-checked against India Code and Supreme Court e-SCR.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportConversation("markdown")}
              disabled={!activeConv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-secondary px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export .MD</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportConversation("json")}
              disabled={!activeConv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-secondary px-3 py-1.5 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export .JSON</span>
            </button>
          </div>
        </div>

        {/* Optional Source Inspector Drawer */}
        {inspectedSource && (
          <SourcePanel
            source={inspectedSource}
            onClose={() => setInspectedSource(null)}
          />
        )}

        {/* Messages Thread */}
        <div className="space-y-5">
          {activeConv && activeConv.messages && activeConv.messages.length > 0 ? (
            activeConv.messages.map((msg) => (
              <div key={msg.id} className="space-y-3">
                {msg.role === "user" ? (
                  <div className="ml-auto max-w-3xl rounded-xl border border-gold/40 bg-gold/10 px-5 py-3.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-gold">
                        Legal Inquiry • {msg.response_mode || "detailed"} mode
                      </span>
                      <span className="font-mono text-[10px] text-ivory-secondary">
                        {formatDateTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-ivory-primary leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <StructuredAnswerCard
                      message={msg}
                      onInspectSource={(src) => setInspectedSource(src)}
                    />
                    {msg.follow_up_suggestions && msg.follow_up_suggestions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pl-1">
                        <span className="font-mono text-[11px] text-ivory-secondary">
                          Follow-up Inquiries:
                        </span>
                        {msg.follow_up_suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendQuestion(suggestion)}
                            className="rounded-full border border-border-subtle bg-navy-secondary px-3 py-1 text-xs text-ivory-primary hover:border-gold hover:text-gold transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-border-subtle bg-navy-card p-6 text-center space-y-4">
              <MessageSquare className="h-8 w-8 text-gold mx-auto" />
              <div>
                <h3 className="font-heading text-base font-bold text-ivory-primary">
                  Begin a Grounded Indian Legal Consultation
                </h3>
                <p className="text-xs text-ivory-secondary mt-1 max-w-xl mx-auto">
                  Select a starter legal question below or enter your own query. Juris automatically distinguishes pre- and post-July 1, 2024 statutory applicability (BNS/BNSS/BSA vs IPC/CrPC/IEA).
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-left max-w-3xl mx-auto">
                {starterPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendQuestion(p)}
                    className="rounded-lg border border-border-subtle bg-navy-secondary p-3 text-xs text-ivory-primary hover:border-gold hover:text-gold transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Composer Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuestion();
          }}
          className="rounded-xl border border-gold/40 bg-navy-card p-4 shadow-legal"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-ivory-secondary mr-1">Response Mode:</span>
              {(["short", "standard", "detailed", "research"] as ResponseMode[]).map(
                (mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setResponseMode(mode)}
                    className={`rounded-md px-2.5 py-1 font-mono text-[11px] uppercase transition-colors ${
                      responseMode === mode
                        ? "bg-gold text-navy-primary font-semibold"
                        : "bg-navy-secondary text-ivory-secondary hover:text-ivory-primary border border-border-subtle"
                    }`}
                  >
                    {mode === "research" ? "Research Mode" : mode}
                  </button>
                )
              )}
            </div>
            <span className="font-mono text-[11px] text-ivory-secondary">
              Mandatory 7-Part Legal Output
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <textarea
              rows={2}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ask Juris about Indian statutes, BNS/BNSS/BSA sections, Supreme Court precedents, or contractual clauses..."
              className="flex-1 rounded-lg border border-border-subtle bg-navy-secondary p-3 text-sm text-ivory-primary placeholder:text-ivory-secondary/75 focus:border-gold focus:outline-none resize-none"
            />
            <button
              type="submit"
              disabled={isSending || !promptInput.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-navy-primary hover:bg-gold-bright transition-colors disabled:opacity-50 shrink-0"
            >
              <Send className="h-4 w-4" />
              <span>{isSending ? "Verifying Citations..." : "Ask Juris"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function JurisPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border-subtle bg-navy-card p-8 text-sm text-ivory-secondary">
          Loading Juris Legal Intelligence workspace...
        </div>
      }
    >
      <JurisWorkspaceInner />
    </Suspense>
  );
}
