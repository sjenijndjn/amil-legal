"use client";

import React, { useState } from "react";
import {
  Settings,
  Sun,
  Moon,
  ShieldAlert,
  RotateCcw,
  CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";

export default function SettingsPage() {
  const { user, theme, setTheme, refreshProfile } = useAuth();
  const { notify } = useToast();

  const [aiConsent, setAiConsent] = useState(user.ai_document_consent ?? true);
  const [language, setLanguage] = useState(user.preferred_language || "en-IN");
  const [purging, setPurging] = useState(false);

  const handleToggleConsent = async (checked: boolean) => {
    setAiConsent(checked);
    await api.updateProfile({ ai_document_consent: checked });
    await refreshProfile();
    notify({
      title: checked
        ? "DPDP Section 6 AI Document Consent Enabled"
        : "DPDP Section 6 AI Document Consent Withdrawn",
      description: checked
        ? "Uploaded documents may be analyzed by Juris AI."
        : "Document uploads will not be sent to external LLM APIs."
    });
  };

  const handleLanguageChange = async (nextLang: string) => {
    setLanguage(nextLang);
    await api.updateProfile({ preferred_language: nextLang });
    await refreshProfile();
    notify({ title: `Workspace locale updated to ${nextLang}` });
  };

  const handlePurgeAllData = async () => {
    setPurging(true);
    try {
      const res = await api.purgePersonalData();
      notify({
        title: "Personal data purged under DPDP Act 2023",
        description: res.detail,
        variant: "info"
      });
    } finally {
      setPurging(false);
    }
  };

  const handleRestoreSeedWorkspace = async () => {
    await api.resetDemoWorkspace();
    await refreshProfile();
    notify({
      title: "Restored verified Indian legal seed corpus",
      description: "Initial consultations, documents, drafts, and bookmarks restored."
    });
  };

  return (
    <div className="space-y-6 pb-10 max-w-4xl">
      <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 shadow-legal space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ivory-primary flex items-center gap-2">
            <Settings className="h-6 w-6 text-gold" />
            <span>Workspace Settings & DPDP Privacy Controls</span>
          </h1>
          <p className="text-xs text-ivory-secondary mt-0.5">
            Configure appearance, Indian legal citation defaults, and Digital Personal Data Protection Act, 2023 rights.
          </p>
        </div>

        {/* Theme Switcher */}
        <div className="rounded-xl border border-border-subtle bg-navy-secondary p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-sm font-bold text-ivory-primary">
              Color Theme & Reading Surface
            </h2>
            <p className="text-xs text-ivory-secondary mt-0.5">
              Choose between Midnight Navy + Gold (default) or Warm Ivory Light for daytime judgment reading.
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-border-subtle bg-navy-card p-1">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                theme === "dark"
                  ? "bg-gold text-navy-primary"
                  : "text-ivory-secondary hover:text-ivory-primary"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Midnight Navy Dark</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                theme === "light"
                  ? "bg-gold text-navy-primary"
                  : "text-ivory-secondary hover:text-ivory-primary"
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Ivory Light</span>
            </button>
          </div>
        </div>

        {/* Language & Citation Preferences */}
        <div className="rounded-xl border border-border-subtle bg-navy-secondary p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-sm font-bold text-ivory-primary">
              Language & Statutory Citation Locale
            </h2>
            <p className="text-xs text-ivory-secondary mt-0.5">
              Standardizes date formatting (DD MMM YYYY) and Supreme Court INSC neutral citations.
            </p>
          </div>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            aria-label="Select workspace language"
            className="rounded-lg border border-border-subtle bg-navy-card px-3.5 py-2 text-xs text-ivory-primary"
          >
            <option value="en-IN">English (India — en-IN)</option>
            <option value="hi-IN">English + Hindi Statutory Terms (BNS/BNSS/BSA)</option>
          </select>
        </div>

        {/* DPDP Act 2023 Consent Management */}
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-sm font-bold text-gold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-status-success" />
                <span>DPDP Act 2023 (Section 6) — AI Document Processing Consent</span>
              </h2>
              <p className="text-xs text-ivory-primary mt-1 leading-relaxed">
                Control whether uploaded PDF, DOCX, and TXT files may be processed by the AI extraction pipeline. You may withdraw consent at any time under Section 6(4) of the Digital Personal Data Protection Act, 2023.
              </p>
            </div>
            <input
              type="checkbox"
              checked={aiConsent}
              onChange={(e) => handleToggleConsent(e.target.checked)}
              aria-label="Toggle DPDP AI Document Processing Consent"
              className="h-5 w-5 accent-gold mt-1 cursor-pointer"
            />
          </div>
        </div>

        {/* Right to Erasure & Demo Reset */}
        <div className="rounded-xl border border-border-subtle bg-navy-secondary p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-sm font-bold text-ivory-primary">
                Restore Verified Seed Data
              </h3>
              <p className="text-xs text-ivory-secondary mt-0.5">
                Reset sample consultations, contracts, drafts, and bookmarks to initial verified state.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRestoreSeedWorkspace}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold/50 bg-gold/15 px-4 py-2 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restore Seed Workspace</span>
            </button>
          </div>

          <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-sm font-bold text-status-error flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                <span>Right to Erasure (Section 12, DPDP Act 2023)</span>
              </h3>
              <p className="text-xs text-ivory-secondary mt-0.5">
                Permanently purge all personal consultations, uploaded documents, drafts, notes, and history.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePurgeAllData}
              disabled={purging}
              className="inline-flex items-center gap-1.5 rounded-lg border border-status-error bg-status-error/15 px-4 py-2 text-xs font-semibold text-status-error hover:bg-status-error hover:text-white transition-colors shrink-0"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{purging ? "Purging..." : "Purge Personal Data"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
