"use client";

import React, { useEffect, useState } from "react";
import {
  Library,
  FolderPlus,
  StickyNote,
  Search,
  Trash2,
  Pin,
  Tag
} from "lucide-react";
import { api } from "@/lib/api";
import { LibraryBookmark, LibraryFolder, LibraryNote } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils";

type LibraryTab = "ALL" | "SECTION" | "JUDGMENT" | "AI_ANSWER" | "NOTES";

export default function LegalLibraryPage() {
  const { notify } = useToast();

  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [bookmarks, setBookmarks] = useState<LibraryBookmark[]>([]);
  const [notes, setNotes] = useState<LibraryNote[]>([]);

  const [selectedFolderId, setSelectedFolderId] = useState<string | "ALL">("ALL");
  const [activeTab, setActiveTab] = useState<LibraryTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");

  // Modals
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDesc, setFolderDesc] = useState("");

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteTags, setNoteTags] = useState("Research Note, BNS 2023");

  const reloadLibrary = async () => {
    const res = await api.getLibraryOverview();
    setFolders(res.folders);
    setBookmarks(res.bookmarks);
    setNotes(res.notes);
  };

  useEffect(() => {
    reloadLibrary();
  }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    await api.createFolder({
      name: folderName.trim(),
      color_hex: "#D6B66D",
      description: folderDesc.trim() || "Custom legal research folder"
    });
    await reloadLibrary();
    setFolderName("");
    setFolderDesc("");
    setFolderModalOpen(false);
    notify({ title: "Created folder in My Legal Library" });
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    await api.createNote({
      folder_id: selectedFolderId === "ALL" ? null : selectedFolderId,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      tags: noteTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      is_pinned: true
    });
    await reloadLibrary();
    setNoteTitle("");
    setNoteContent("");
    setNoteModalOpen(false);
    notify({ title: "Saved personal research note" });
  };

  const handleDeleteBookmark = async (id: string) => {
    await api.deleteBookmark(id);
    await reloadLibrary();
    notify({ title: "Removed bookmark from library", variant: "info" });
  };

  const handleDeleteNote = async (id: string) => {
    await api.deleteNote(id);
    await reloadLibrary();
    notify({ title: "Deleted research note", variant: "info" });
  };

  const allTags = Array.from(
    new Set([
      ...bookmarks.flatMap((b) => b.tags),
      ...notes.flatMap((n) => n.tags)
    ])
  );

  const q = searchQuery.trim().toLowerCase();

  const filteredBookmarks = bookmarks.filter((b) => {
    if (selectedFolderId !== "ALL" && b.folder_id !== selectedFolderId) return false;
    if (activeTab !== "ALL" && activeTab !== "NOTES" && b.item_type !== activeTab)
      return false;
    if (activeTab === "NOTES") return false;
    if (selectedTag !== "ALL" && !b.tags.includes(selectedTag)) return false;
    if (!q) return true;
    return (
      b.title.toLowerCase().includes(q) ||
      b.excerpt.toLowerCase().includes(q) ||
      (b.citation || "").toLowerCase().includes(q)
    );
  });

  const filteredNotes = notes.filter((n) => {
    if (selectedFolderId !== "ALL" && n.folder_id !== selectedFolderId) return false;
    if (activeTab !== "ALL" && activeTab !== "NOTES") return false;
    if (selectedTag !== "ALL" && !n.tags.includes(selectedTag)) return false;
    if (!q) return true;
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.linked_entity_label || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 shadow-legal flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ivory-primary flex items-center gap-2">
            <Library className="h-6 w-6 text-gold" />
            <span>My Legal Library & Knowledge Vault</span>
          </h1>
          <p className="text-xs text-ivory-secondary mt-0.5">
            Personal repository of bookmarked Bare Act sections, Supreme Court precedents, saved Juris AI answers, and private annotations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFolderModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2 text-xs font-medium text-ivory-primary hover:border-gold hover:text-gold"
          >
            <FolderPlus className="h-4 w-4 text-gold" />
            <span>New Folder</span>
          </button>
          <button
            type="button"
            onClick={() => setNoteModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-navy-primary hover:bg-gold-bright"
          >
            <StickyNote className="h-4 w-4" />
            <span>New Research Note</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Folders Sidebar (3 cols) + Items (9 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-border-subtle bg-navy-card p-4 space-y-2">
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-ivory-secondary mb-2">
              Research Folders
            </h2>
            <button
              type="button"
              onClick={() => setSelectedFolderId("ALL")}
              className={`w-full text-left rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                selectedFolderId === "ALL"
                  ? "bg-gold text-navy-primary"
                  : "bg-navy-secondary text-ivory-primary hover:border-gold"
              }`}
            >
              All Saved Items ({bookmarks.length + notes.length})
            </button>

            {folders.map((fld) => (
              <button
                key={fld.id}
                type="button"
                onClick={() => setSelectedFolderId(fld.id)}
                className={`w-full text-left rounded-lg border p-2.5 transition-all ${
                  selectedFolderId === fld.id
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border-subtle bg-navy-secondary text-ivory-primary hover:border-gold/40"
                }`}
              >
                <p className="text-xs font-semibold">{fld.name}</p>
                <p className="text-[11px] text-ivory-secondary mt-0.5 line-clamp-1">
                  {fld.description}
                </p>
              </button>
            ))}
          </div>

          {/* Tags Filter */}
          <div className="rounded-xl border border-border-subtle bg-navy-card p-4">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-ivory-secondary mb-2.5 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-gold" />
              <span>Filter by Tag</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTag("ALL")}
                className={`rounded-md px-2 py-1 text-[11px] ${
                  selectedTag === "ALL"
                    ? "bg-gold text-navy-primary font-semibold"
                    : "bg-navy-secondary text-ivory-secondary"
                }`}
              >
                All Tags
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`rounded-md px-2 py-1 text-[11px] ${
                    selectedTag === tag
                      ? "bg-gold text-navy-primary font-semibold"
                      : "bg-navy-secondary text-ivory-secondary hover:text-ivory-primary"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="lg:col-span-9 space-y-4">
          <div className="rounded-xl border border-border-subtle bg-navy-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "ALL", label: "All Items" },
                  { id: "SECTION", label: "Saved Provisions" },
                  { id: "JUDGMENT", label: "Saved Judgments" },
                  { id: "AI_ANSWER", label: "Saved Juris Answers" },
                  { id: "NOTES", label: "Personal Notes" }
                ] as { id: LibraryTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeTab === tab.id
                      ? "bg-gold text-navy-primary"
                      : "bg-navy-secondary text-ivory-secondary hover:text-ivory-primary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ivory-secondary" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved library..."
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary pl-8 pr-3 py-1.5 text-xs text-ivory-primary focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          {/* Personal Notes Section */}
          {filteredNotes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-heading text-sm font-bold text-gold uppercase tracking-wider">
                Personal Legal Notes & Annotations ({filteredNotes.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex flex-col justify-between rounded-xl border border-gold/40 bg-navy-card p-5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Pin className="h-3.5 w-3.5 text-gold" />
                          <h4 className="font-heading text-sm font-bold text-ivory-primary">
                            {note.title}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-ivory-secondary hover:text-status-error"
                          aria-label="Delete note"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {note.linked_entity_label && (
                        <p className="font-mono text-[11px] text-gold mb-2">
                          Linked Authority: {note.linked_entity_label}
                        </p>
                      )}
                      <p className="whitespace-pre-line text-xs text-ivory-primary leading-relaxed">
                        {note.content}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((tg) => (
                          <Badge key={tg} variant="outline" className="text-[10px]">
                            {tg}
                          </Badge>
                        ))}
                      </div>
                      <span className="font-mono text-[10px] text-ivory-secondary">
                        {formatDateTime(note.updated_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bookmarks Section */}
          {filteredBookmarks.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-heading text-sm font-bold text-ivory-primary uppercase tracking-wider">
                Bookmarked Authorities & Juris Answers ({filteredBookmarks.length})
              </h3>
              <div className="space-y-3">
                {filteredBookmarks.map((bmk) => (
                  <div
                    key={bmk.id}
                    className="rounded-xl border border-border-subtle bg-navy-card p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="gold">{bmk.item_type}</Badge>
                        {bmk.citation && (
                          <span className="font-mono text-xs text-gold">
                            {bmk.citation}
                          </span>
                        )}
                      </div>
                      <h4 className="font-heading text-base font-bold text-ivory-primary">
                        {bmk.title}
                      </h4>
                      <p className="text-xs text-ivory-secondary leading-relaxed">
                        {bmk.excerpt}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {bmk.tags.map((tg) => (
                          <Badge key={tg} variant="outline" className="text-[10px]">
                            {tg}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteBookmark(bmk.id)}
                      className="rounded-lg border border-border-subtle p-2 text-ivory-secondary hover:text-status-error shrink-0"
                      aria-label="Delete bookmark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Folder Modal */}
      <Modal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        title="Create Research Folder"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1">
              Folder Name
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              required
              placeholder="e.g. Supreme Court Constitutional Bench Briefs"
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2 text-sm text-ivory-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1">
              Description
            </label>
            <input
              type="text"
              value={folderDesc}
              onChange={(e) => setFolderDesc(e.target.value)}
              placeholder="Optional description..."
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2 text-sm text-ivory-primary"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFolderModalOpen(false)}
              className="rounded-lg border border-border-subtle px-4 py-2 text-xs text-ivory-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-navy-primary"
            >
              Create Folder
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Note Modal */}
      <Modal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Create Personal Legal Research Note"
      >
        <form onSubmit={handleCreateNote} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1">
              Note Title
            </label>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              required
              placeholder="e.g. Strategy Note on Section 63 BSA Certificate"
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2 text-sm text-ivory-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1">
              Note Content
            </label>
            <textarea
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              required
              placeholder="Write your legal observations..."
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary p-3 text-sm text-ivory-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1">
              Comma-Separated Tags
            </label>
            <input
              type="text"
              value={noteTags}
              onChange={(e) => setNoteTags(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2 text-xs text-ivory-primary"
            />
          </div>
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
              Save Note
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
