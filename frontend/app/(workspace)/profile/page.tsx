"use client";

import React, { useEffect, useState } from "react";
import { User, Save, Plus, X, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { ResponseMode } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const { notify } = useToast();

  const [displayName, setDisplayName] = useState(user.display_name || "Amil");
  const [email, setEmail] = useState(user.email || BRAND.ownerEmail);
  const [responseStyle, setResponseStyle] = useState<ResponseMode>(
    user.ai_response_style || "detailed"
  );
  const [topics, setTopics] = useState<string[]>(user.saved_legal_topics || []);
  const [newTopic, setNewTopic] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(user.display_name || "Amil");
    setEmail(user.email || BRAND.ownerEmail);
    setResponseStyle(user.ai_response_style || "detailed");
    setTopics(user.saved_legal_topics || []);
  }, [user]);

  const handleAddTopic = () => {
    const t = newTopic.trim();
    if (!t || topics.includes(t)) return;
    setTopics([...topics, t]);
    setNewTopic("");
  };

  const handleRemoveTopic = (topic: string) => {
    setTopics(topics.filter((t) => t !== topic));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        display_name: displayName.trim() || "Amil",
        email: email.trim() || BRAND.ownerEmail,
        ai_response_style: responseStyle,
        saved_legal_topics: topics
      });
      await refreshProfile();
      notify({
        title: "Personal profile updated",
        description: `Dashboard greeting set to "Welcome back, ${
          (displayName.trim() || "Amil").split(" ")[0]
        }."`
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10 max-w-4xl">
      <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 shadow-legal">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gold bg-navy-secondary font-heading text-2xl font-bold text-gold shadow-gold">
              {(displayName || "A").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl font-bold text-ivory-primary">
                  {BRAND.ownerName}
                </h1>
                <Badge variant="gold">Workspace Owner</Badge>
              </div>
              <p className="text-xs text-ivory-secondary mt-0.5">
                Primary Jurisdiction: {BRAND.jurisdiction} • Tenant ID: <code className="font-mono">{user.id}</code>
              </p>
            </div>
          </div>

          <Badge variant="success">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Owner Account
          </Badge>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="profile-display-name"
                className="block text-xs font-medium text-ivory-secondary mb-1.5"
              >
                Display Name (Drives Dashboard Greeting)
              </label>
              <input
                id="profile-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2.5 text-sm text-ivory-primary focus:border-gold focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-medium text-ivory-secondary mb-1.5"
              >
                Account Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2.5 text-sm text-ivory-primary focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1.5">
              Default Juris AI Response Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(["short", "standard", "detailed", "research"] as ResponseMode[]).map(
                (style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setResponseStyle(style)}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-semibold uppercase transition-all ${
                      responseStyle === style
                        ? "border-gold bg-gold text-navy-primary"
                        : "border-border-subtle bg-navy-secondary text-ivory-secondary hover:text-ivory-primary"
                    }`}
                  >
                    {style === "research" ? "Research Mode" : style}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1.5">
              Saved Legal Practice & Research Topics
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {topics.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-ivory-primary"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTopic(t)}
                    className="text-ivory-secondary hover:text-status-error"
                    aria-label={`Remove ${t}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Add a legal practice focus (e.g. Insolvency & Bankruptcy Code 2016)..."
                className="flex-1 rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2 text-xs text-ivory-primary focus:border-gold focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className="inline-flex items-center gap-1 rounded-lg border border-gold/50 bg-gold/15 px-3.5 py-2 text-xs font-semibold text-gold hover:bg-gold hover:text-navy-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Topic</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs text-ivory-secondary">
              <User className="h-3.5 w-3.5 text-gold" />
              Profile belongs to {BRAND.ownerName}
            </span>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-5 py-2.5 text-xs font-semibold text-navy-primary hover:bg-gold-bright transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Save Profile Preferences"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
