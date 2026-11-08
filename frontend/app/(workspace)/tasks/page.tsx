"use client";

import React, { useEffect, useState } from "react";
import {
  CheckSquare,
  Plus,
  Calendar as CalendarIcon,
  List,
  AlertCircle,
  Trash2,
  CheckCircle2,
  Clock
} from "lucide-react";
import { api } from "@/lib/api";
import { LegalTask, TaskPriority, TaskStatus, TaskType } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

export default function TasksPage() {
  const { notify } = useToast();

  const [tasks, setTasks] = useState<LegalTask[]>([]);
  const [viewMode, setViewMode] = useState<"LIST" | "CALENDAR">("LIST");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");

  // Create Task Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("RESEARCH");
  const [priority, setPriority] = useState<TaskPriority>("HIGH");
  const [dueDate, setDueDate] = useState("2025-02-28");
  const [linkedRef, setLinkedRef] = useState("");

  const loadTasks = async () => {
    const list = await api.getTasks();
    setTasks(list);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await api.createTask({
      title: title.trim(),
      description: description.trim(),
      task_type: taskType,
      priority,
      due_at: new Date(dueDate).toISOString(),
      linked_entity_label: linkedRef.trim() || null
    });
    await loadTasks();
    setTitle("");
    setDescription("");
    setLinkedRef("");
    setModalOpen(false);
    notify({
      title: "Created legal task & reminder",
      description: title.trim()
    });
  };

  const handleToggleStatus = async (task: LegalTask) => {
    const nextStatus: TaskStatus =
      task.status === "COMPLETED" ? "TODO" : "COMPLETED";
    await api.updateTask(task.id, { status: nextStatus });
    await loadTasks();
    notify({
      title:
        nextStatus === "COMPLETED" ? "Task marked completed" : "Task reopened"
    });
  };

  const handleDeleteTask = async (id: string) => {
    await api.deleteTask(id);
    await loadTasks();
    notify({ title: "Task deleted", variant: "info" });
  };

  const filteredTasks = tasks.filter((t) => {
    if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    return true;
  });

  // Build 28-day February 2025 Calendar Grid for Interactive Calendar View
  const calendarDays = Array.from({ length: 28 }, (_, idx) => {
    const dayNum = idx + 1;
    const dayStr = `2025-02-${String(dayNum).padStart(2, "0")}`;
    const dayTasks = filteredTasks.filter((t) => t.due_at.startsWith(dayStr));
    return { dayNum, dayStr, dayTasks };
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="rounded-2xl border border-border-subtle bg-navy-card p-6 shadow-legal flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ivory-primary flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-gold" />
            <span>Legal Tasks, Deadlines & Case Reminders</span>
          </h1>
          <p className="text-xs text-ivory-secondary mt-0.5">
            Track research action items, statutory notice periods, and filing milestones across your workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl border border-border-subtle bg-navy-secondary p-1">
            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "LIST"
                  ? "bg-gold text-navy-primary"
                  : "text-ivory-secondary hover:text-ivory-primary"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("CALENDAR")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "CALENDAR"
                  ? "bg-gold text-navy-primary"
                  : "text-ivory-secondary hover:text-ivory-primary"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Monthly Calendar View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-navy-primary hover:bg-gold-bright"
          >
            <Plus className="h-4 w-4" />
            <span>New Task / Reminder</span>
          </button>
        </div>
      </div>

      {/* Mandatory eCourts Disclaimer */}
      <div className="flex items-start gap-2.5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-xs text-ivory-primary">
        <AlertCircle className="h-4 w-4 text-gold shrink-0 mt-0.5" />
        <span>
          <strong>Productivity Notice:</strong> Tasks and reminders in this module are private workspace productivity entries and do not constitute official eCourts Services cause-list or court hearing notifications. Always verify official court dates on{" "}
          <a
            href="https://services.ecourts.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold underline"
          >
            services.ecourts.gov.in
          </a>
          .
        </span>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border-subtle bg-navy-card p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ivory-secondary">Priority:</span>
          {(["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={`rounded-md px-2.5 py-1 font-mono text-[11px] ${
                priorityFilter === p
                  ? "bg-gold text-navy-primary font-bold"
                  : "bg-navy-secondary text-ivory-secondary hover:text-ivory-primary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ivory-secondary">Status:</span>
          {(["ALL", "TODO", "IN_PROGRESS", "COMPLETED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-2.5 py-1 font-mono text-[11px] ${
                statusFilter === s
                  ? "bg-gold text-navy-primary font-bold"
                  : "bg-navy-secondary text-ivory-secondary hover:text-ivory-primary"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* List View vs Interactive Monthly Calendar View */}
      {viewMode === "LIST" ? (
        <div className="space-y-3">
          {filteredTasks.map((tsk) => (
            <div
              key={tsk.id}
              className="rounded-xl border border-border-subtle bg-navy-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gold/40 transition-all"
            >
              <div className="flex items-start gap-3.5">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(tsk)}
                  className={`mt-1 h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                    tsk.status === "COMPLETED"
                      ? "border-status-success bg-status-success text-navy-primary"
                      : "border-gold/60 bg-navy-secondary hover:border-gold"
                  }`}
                  aria-label="Toggle task completion"
                >
                  {tsk.status === "COMPLETED" && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge
                      variant={
                        tsk.priority === "URGENT"
                          ? "error"
                          : tsk.priority === "HIGH"
                            ? "warning"
                            : "gold"
                      }
                    >
                      {tsk.priority}
                    </Badge>
                    <Badge variant="outline">{tsk.task_type.replace("_", " ")}</Badge>
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-ivory-secondary">
                      <Clock className="h-3.5 w-3.5 text-gold" />
                      Due: {formatDate(tsk.due_at)}
                    </span>
                  </div>

                  <h3
                    className={`font-heading text-base font-bold ${
                      tsk.status === "COMPLETED"
                        ? "line-through text-ivory-secondary"
                        : "text-ivory-primary"
                    }`}
                  >
                    {tsk.title}
                  </h3>
                  <p className="mt-1 text-xs text-ivory-secondary leading-relaxed">
                    {tsk.description}
                  </p>
                  {tsk.linked_entity_label && (
                    <p className="mt-1.5 font-mono text-[11px] text-gold">
                      Linked Authority / File: {tsk.linked_entity_label}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={tsk.status === "COMPLETED" ? "success" : "default"}
                >
                  {tsk.status.replace("_", " ")}
                </Badge>
                <button
                  type="button"
                  onClick={() => handleDeleteTask(tsk.id)}
                  className="p-2 text-ivory-secondary hover:text-status-error"
                  aria-label="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border-subtle bg-navy-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-bold text-ivory-primary">
              February 2025 — Legal Deadlines & Research Calendar
            </h2>
            <span className="font-mono text-xs text-gold">
              {filteredTasks.length} Scheduled Items
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {calendarDays.map((d) => (
              <div
                key={d.dayNum}
                className={`min-h-[104px] rounded-xl border p-2.5 flex flex-col justify-between ${
                  d.dayTasks.length > 0
                    ? "border-gold/60 bg-gold/10"
                    : "border-border-subtle bg-navy-secondary"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-ivory-primary">
                    Feb {d.dayNum}
                  </span>
                  {d.dayTasks.length > 0 && (
                    <span className="rounded-full bg-gold px-1.5 py-0.2 font-mono text-[10px] font-bold text-navy-primary">
                      {d.dayTasks.length}
                    </span>
                  )}
                </div>
                <div className="space-y-1 mt-2">
                  {d.dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="rounded bg-navy-card border border-gold/40 px-2 py-1 text-[10px] text-ivory-primary truncate"
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Task Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Legal Research Task or Reminder"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1">
              Task / Reminder Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. File Section 63(4) BSA Schedule Certificate"
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2 text-sm text-ivory-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ivory-secondary mb-1">
                Task Category
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary"
              >
                <option value="RESEARCH">Legal Research</option>
                <option value="FILING_DEADLINE">Filing / Notice Deadline</option>
                <option value="DRAFT_REVIEW">Draft Review</option>
                <option value="CASE_REMINDER">Case Reminder</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ivory-secondary mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary"
              >
                <option value="URGENT">URGENT</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ivory-secondary mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3 py-2 text-xs text-ivory-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1">
              Linked Statute / Case / Document Reference (Optional)
            </label>
            <input
              type="text"
              value={linkedRef}
              onChange={(e) => setLinkedRef(e.target.value)}
              placeholder="e.g. BNS Section 318 / 2024 INSC 857"
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary px-3.5 py-2 text-xs text-ivory-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ivory-secondary mb-1">
              Detailed Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add checklist items or statutory notice timelines..."
              className="w-full rounded-lg border border-border-subtle bg-navy-secondary p-3 text-xs text-ivory-primary"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-border-subtle px-4 py-2 text-xs text-ivory-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-navy-primary"
            >
              Save Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
