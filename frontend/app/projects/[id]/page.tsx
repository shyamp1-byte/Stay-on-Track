"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { apiFetch } from "../../api-client/http";
import {
  useProjects,
  PROJECT_STATUS_COLORS,
  type Member,
} from "../ProjectsContext";

type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "TODO" | "DOING" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  created_by_id: string | null;
  created_by_name: string | null;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
};

function dueDateUrgency(dueDate: string | null, status: Task["status"]): "overdue" | "soon" | null {
  if (!dueDate || status === "DONE") return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "soon";
  return null;
}

function memberInitials(name: string) {
  return name.split(" ").map((n) => n[0] ?? "").join("").toUpperCase().slice(0, 2);
}

const TASK_STATUSES: Task["status"][] = ["TODO", "DOING", "DONE"];
const TASK_PRIORITIES: Task["priority"][] = ["LOW", "MEDIUM", "HIGH"];

const TASK_STATUS_COLORS: Record<Task["status"], string> = {
  TODO: "#6b7280",
  DOING: "#3b82f6",
  DONE: "#22c55e",
};

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  LOW: "#6b7280",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
};

function TaskStatusIcon({ status, onClick }: { status: Task["status"]; onClick: () => void }) {
  const color = TASK_STATUS_COLORS[status];
  return (
    <button
      onClick={onClick}
      title={`Status: ${status} — click to cycle`}
      style={{
        width: 22, height: 22, borderRadius: 999,
        border: `2px solid ${color}`,
        background: status === "DONE" ? color : "transparent",
        display: "grid", placeItems: "center", cursor: "pointer",
        flexShrink: 0, transition: "all 0.15s ease", padding: 0,
      }}
    >
      {status === "DONE" ? (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : status === "DOING" ? (
        <div style={{ width: 7, height: 7, borderRadius: 999, background: color }} />
      ) : null}
    </button>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const {
    me, projects, touchRecent, starredIds, toggleStar,
    cycleProjectStatus, deleteProject, renameProject,
  } = useProjects();

  const project = projects.find((p) => p.id === projectId) ?? null;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksErr, setTasksErr] = useState("");

  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Task["priority"]>("MEDIUM");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  const [taskFilter, setTaskFilter] = useState<"ALL" | Task["status"]>("ALL");
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState("");

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [expandedTaskTitle, setExpandedTaskTitle] = useState("");
  const [expandedDesc, setExpandedDesc] = useState("");
  const [expandedDueDate, setExpandedDueDate] = useState("");
  const [expandedAssignedTo, setExpandedAssignedTo] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [summaries, setSummaries] = useState<Record<string, string | null>>({});
  const [summarized, setSummarized] = useState<Record<string, boolean>>({}); // true once attempted
  const [summarizing, setSummarizing] = useState<Record<string, boolean>>({});
  const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>({});

  const [members, setMembers] = useState<Member[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteErr, setInviteErr] = useState("");
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    touchRecent(projectId);
    setTasksErr("");
    setTasksLoading(true);
    setShowNewTask(false);
    setNewTaskTitle("");
    setTaskFilter("ALL");
    apiFetch(`/projects/${projectId}/tasks`)
      .then((data) => {
        const taskList = Array.isArray(data) ? (data as Task[]) : [];
        setTasks(taskList);
        taskList.forEach((t) => { if (t.description) summarizeTask(t.id); });
      })
      .catch((e) => setTasksErr(String(e?.message || e)))
      .finally(() => setTasksLoading(false));
    apiFetch(`/projects/${projectId}/members`)
      .then((data) => setMembers(Array.isArray(data) ? (data as Member[]) : []))
      .catch(() => {});
  }, [projectId]);

  async function inviteMember() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteErr("");
    try {
      const added = (await apiFetch(`/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })) as Member;
      setMembers((prev) => [...prev, added]);
      setInviteEmail("");
      setShowInvite(false);
    } catch (e: any) {
      setInviteErr(String(e?.message || e));
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(userId: string) {
    setMembers((prev) => prev.filter((m) => String(m.user_id) !== userId));
    try {
      await apiFetch(`/projects/${projectId}/members/${userId}`, { method: "DELETE" });
    } catch {
      apiFetch(`/projects/${projectId}/members`)
        .then((data) => setMembers(Array.isArray(data) ? (data as Member[]) : []))
        .catch(() => {});
    }
  }

  async function handleCreateTask() {
    if (!newTaskTitle.trim()) return;
    try {
      setCreatingTask(true);
      const created = (await apiFetch(`/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          priority: newTaskPriority,
          description: newTaskDesc.trim() || null,
          due_date: newTaskDueDate || null,
          assigned_to_id: newTaskAssignedTo || null,
        }),
      })) as Task;
      setTasks((prev) => [...prev, created]);
      if (created.description) summarizeTask(created.id);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskDueDate("");
      setNewTaskPriority("MEDIUM");
      setNewTaskAssignedTo("");
      setShowNewTask(false);
    } catch {
    } finally {
      setCreatingTask(false);
    }
  }

  async function cycleTaskStatus(task: Task) {
    const next = TASK_STATUSES[(TASK_STATUSES.indexOf(task.status) + 1) % TASK_STATUSES.length];
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    try {
      const updated = (await apiFetch(`/projects/${task.project_id}/tasks/${task.id}`, {
        method: "PATCH", body: JSON.stringify({ status: next }),
      })) as Task;
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
    }
  }

  async function cycleTaskPriority(task: Task) {
    const next = TASK_PRIORITIES[(TASK_PRIORITIES.indexOf(task.priority) + 1) % TASK_PRIORITIES.length];
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, priority: next } : t)));
    try {
      const updated = (await apiFetch(`/tasks/${task.id}/priority`, {
        method: "POST", body: JSON.stringify({ priority: next }),
      })) as Task;
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, priority: task.priority } : t)));
    }
  }

  async function deleteTask(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await apiFetch(`/projects/${task.project_id}/tasks/${task.id}`, { method: "DELETE" });
    } catch {
      setTasks((prev) => [...prev, task]);
    }
  }

  function openTask(task: Task) {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null);
      return;
    }
    setExpandedTaskId(task.id);
    setExpandedTaskTitle(task.title);
    setExpandedDesc(task.description ?? "");
    setExpandedDueDate(task.due_date ?? "");
    setExpandedAssignedTo(task.assigned_to_id ?? "");
  }

  async function saveTaskDetail(task: Task) {
    const title = expandedTaskTitle.trim() || task.title;
    setSavingTask(true);
    setSaveErr("");
    try {
      const updated = (await apiFetch(`/projects/${projectId}/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          description: expandedDesc.trim() || null,
          due_date: expandedDueDate || null,
          assigned_to_id: expandedAssignedTo || null,
        }),
      })) as Task;
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setExpandedTaskId(null);
    } catch (e: any) {
      setSaveErr(String(e?.message || "Failed to save"));
    } finally {
      setSavingTask(false);
    }
  }

  async function summarizeTask(taskId: string) {
    if (summarizing[taskId]) return;
    setSummarizing((prev) => ({ ...prev, [taskId]: true }));
    setSummaryErrors((prev) => { const n = { ...prev }; delete n[taskId]; return n; });
    try {
      const result = (await apiFetch(`/projects/${projectId}/tasks/${taskId}/summarize`, {
        method: "POST",
      })) as { summary: string | null };
      setSummaries((prev) => ({ ...prev, [taskId]: result.summary }));
      setSummarized((prev) => ({ ...prev, [taskId]: true }));
    } catch (e: any) {
      const msg: string = e?.message || "Summary failed";
      if (msg.includes("503")) {
        setSummaryErrors((prev) => ({ ...prev, [taskId]: "Model loading — try again in ~20s" }));
      } else {
        setSummaryErrors((prev) => ({ ...prev, [taskId]: msg }));
      }
    } finally {
      setSummarizing((prev) => ({ ...prev, [taskId]: false }));
    }
  }

  function startEditTitle() {
    if (!project) return;
    setEditingTitleValue(project.title);
    setEditingTitle(true);
  }

  async function commitTitleEdit() {
    setEditingTitle(false);
    if (project) await renameProject(project, editingTitleValue);
  }

  const isOwner = project?.owner_id === me?.id;
  const doneTasks = tasks.filter((t) => t.status === "DONE").length;
  const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const filteredTasks = taskFilter === "ALL" ? tasks : tasks.filter((t) => t.status === taskFilter);

  // Project not yet loaded (context still fetching)
  if (projects.length === 0) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%", opacity: 0.38, fontSize: 14, color: "var(--foreground)" }}>
        Loading...
      </div>
    );
  }

  // Project not found
  if (!project) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%", padding: 40, textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>
            Project not found
          </div>
          <button
            onClick={() => router.push("/projects")}
            style={{
              padding: "8px 16px", borderRadius: 9, border: "none",
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            Back to projects
          </button>
        </div>
      </div>
    );
  }

  const sc = PROJECT_STATUS_COLORS[project.status];

  return (
    <div style={{ padding: "24px 28px", maxWidth: 860, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, opacity: 0.45, marginBottom: 20, color: "var(--foreground)" }}>
        <button
          onClick={() => router.push("/projects")}
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 12, opacity: 1 }}
        >
          For you
        </button>
        <span style={{ margin: "0 6px" }}>›</span>
        <span>{project.title}</span>
      </div>

      {/* Project header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
          {editingTitle ? (
            <input
              autoFocus
              value={editingTitleValue}
              onChange={(e) => setEditingTitleValue(e.target.value)}
              onBlur={commitTitleEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitleEdit();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              style={{
                fontSize: 24, fontWeight: 900, background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.30)", borderRadius: 8,
                color: "var(--foreground)", outline: "none", padding: "4px 10px",
                flex: 1, minWidth: 0,
              }}
            />
          ) : (
            <div
              onDoubleClick={startEditTitle}
              title="Double-click to rename"
              style={{ fontSize: 24, fontWeight: 900, color: "var(--foreground)", lineHeight: 1.2, cursor: "default" }}
            >
              {project.title}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <motion.button
              onClick={() => toggleStar(project.id)}
              title={starredIds.includes(project.id) ? "Unlike" : "Like"}
              whileTap={{ scale: 0.82 }}
              style={{ border: "none", background: "transparent", padding: "2px 4px", cursor: "pointer", display: "flex" }}
            >
              <motion.div animate={{ scale: starredIds.includes(project.id) ? [1, 1.35, 1] : 1 }} transition={{ duration: 0.28 }}>
                <Heart
                  size={20}
                  style={{
                    fill: starredIds.includes(project.id) ? "#ef4444" : "none",
                    color: starredIds.includes(project.id) ? "#ef4444" : "rgba(99,102,241,0.45)",
                    transition: "color 0.2s, fill 0.2s",
                  }}
                />
              </motion.div>
            </motion.button>
            <button
              onClick={() => cycleProjectStatus(project)}
              title="Click to cycle status"
              style={{
                fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999,
                border: `1px solid ${sc}35`, background: `${sc}18`, color: sc,
                cursor: "pointer", letterSpacing: "0.03em", transition: "all 0.2s",
              }}
            >
              {project.status.replace(/_/g, " ")}
            </button>
            {isOwner && (
              <button
                onClick={() => deleteProject(project, () => router.push("/projects"))}
                title="Delete project"
                style={{
                  border: "none", background: "transparent", color: "#ef4444",
                  cursor: "pointer", fontSize: 13, opacity: 0.6, padding: "2px 4px",
                  transition: "opacity 0.15s",
                }}
              >✕</button>
            )}
          </div>
        </div>
        <div style={{ fontSize: 13, opacity: 0.45, color: "var(--foreground)" }}>
          Due {project.target_due_date}
        </div>

        {/* Members row */}
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {members.map((m) => {
            const initials = m.full_name.split(" ").map((n) => n[0] ?? "").join("").toUpperCase().slice(0, 2);
            const isThisMemberOwner = m.role === "owner";
            return (
              <div
                key={String(m.user_id)}
                onMouseEnter={() => setHoveredMemberId(String(m.user_id))}
                onMouseLeave={() => setHoveredMemberId(null)}
                title={`${m.full_name} — ${m.role}`}
                style={{ position: "relative", display: "inline-flex" }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 999,
                  background: isThisMemberOwner
                    ? "linear-gradient(135deg, #7c3aed, #6366f1)"
                    : "rgba(99,102,241,0.18)",
                  border: isThisMemberOwner
                    ? "2px solid rgba(124,58,237,0.6)"
                    : "2px solid rgba(99,102,241,0.28)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800,
                  color: isThisMemberOwner ? "#fff" : "var(--accent-light)",
                  cursor: "default", userSelect: "none" as const,
                  transition: "opacity 0.15s",
                  opacity: isOwner && !isThisMemberOwner && hoveredMemberId === String(m.user_id) ? 0.5 : 1,
                }}>
                  {initials}
                </div>
                {/* Remove button — owner only, non-owner members */}
                {isOwner && !isThisMemberOwner && hoveredMemberId === String(m.user_id) && (
                  <button
                    onClick={() => removeMember(String(m.user_id))}
                    title={`Remove ${m.full_name}`}
                    style={{
                      position: "absolute", top: -4, right: -4,
                      width: 14, height: 14, borderRadius: 999,
                      background: "#ef4444", border: "none",
                      color: "#fff", fontSize: 8, fontWeight: 900,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      lineHeight: 1, padding: 0,
                    }}
                  >✕</button>
                )}
              </div>
            );
          })}

          {/* Invite button — owner only */}
          {isOwner && (
            <button
              onClick={() => { setShowInvite((v) => !v); setInviteErr(""); setInviteEmail(""); }}
              title="Invite a collaborator"
              style={{
                width: 32, height: 32, borderRadius: 999,
                border: "1.5px dashed rgba(99,102,241,0.35)",
                background: showInvite ? "rgba(99,102,241,0.10)" : "transparent",
                color: "var(--accent-light)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 400, transition: "all 0.15s",
              }}
            >+</button>
          )}
        </div>

        {/* Invite form */}
        {isOwner && showInvite && (
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              autoFocus
              placeholder="Email address to invite"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") inviteMember();
                if (e.key === "Escape") setShowInvite(false);
              }}
              style={{
                flex: 1, minWidth: 200, padding: "7px 10px", borderRadius: 8,
                border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.06)",
                color: "var(--foreground)", outline: "none", fontSize: 13,
              }}
            />
            <button
              onClick={inviteMember}
              disabled={inviting || !inviteEmail.trim()}
              style={{
                padding: "7px 16px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg, #7c3aed, #6366f1)", color: "#fff",
                fontWeight: 700, fontSize: 12, cursor: "pointer",
                opacity: inviting || !inviteEmail.trim() ? 0.5 : 1, transition: "opacity 0.15s",
              }}
            >
              {inviting ? "Inviting..." : "Invite"}
            </button>
          </div>
        )}
        {inviteErr && (
          <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>{inviteErr}</div>
        )}

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <div style={{ fontSize: 12, opacity: 0.55, color: "var(--foreground)" }}>
                {doneTasks} of {tasks.length} tasks done
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: progress === 100 ? "#22c55e" : "var(--foreground)", opacity: progress === 100 ? 1 : 0.55 }}>
                {progress}%
              </div>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: "rgba(99,102,241,0.10)" }}>
              <div style={{
                height: "100%", borderRadius: 999,
                background: progress === 100 ? "#22c55e" : "#7c3aed",
                width: `${progress}%`, transition: "width 0.4s ease, background 0.3s",
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Tasks section */}
      <div style={{ border: "1px solid rgba(99,102,241,0.15)", borderRadius: 16, padding: 18, background: "rgba(99,102,241,0.02)" }}>
        {/* Tasks header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}>
            Tasks
            {tasks.length > 0 && (
              <span style={{ fontSize: 11, opacity: 0.4, background: "rgba(99,102,241,0.10)", borderRadius: 6, padding: "2px 7px" }}>
                {tasks.length}
              </span>
            )}
          </div>
          <button
            onClick={() => { setShowNewTask((v) => !v); setNewTaskTitle(""); setNewTaskDesc(""); setNewTaskDueDate(""); setNewTaskPriority("MEDIUM"); setNewTaskAssignedTo(""); }}
            style={{
              fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 8,
              border: "1px solid rgba(99,102,241,0.25)",
              background: showNewTask ? "rgba(99,102,241,0.12)" : "transparent",
              color: "inherit", cursor: "pointer", transition: "background 0.15s",
            }}
          >
            {showNewTask ? "Cancel" : "+ New task"}
          </button>
        </div>

        {/* New task form */}
        {showNewTask && (
          <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(99,102,241,0.22)", background: "rgba(99,102,241,0.04)" }}>
            <input
              autoFocus
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handleCreateTask();
                if (e.key === "Escape") { setShowNewTask(false); setNewTaskTitle(""); setNewTaskDesc(""); }
              }}
              style={{
                width: "100%", padding: "9px 11px", borderRadius: 9,
                border: "1px solid rgba(99,102,241,0.22)", background: "rgba(99,102,241,0.06)",
                color: "inherit", outline: "none", fontSize: 13, boxSizing: "border-box", marginBottom: 9,
              }}
            />
            <textarea
              placeholder="Description (optional)"
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setShowNewTask(false); setNewTaskTitle(""); setNewTaskDesc(""); setNewTaskDueDate(""); }
              }}
              style={{
                width: "100%", padding: "9px 11px", borderRadius: 9,
                border: "1px solid rgba(99,102,241,0.22)", background: "rgba(99,102,241,0.06)",
                color: "inherit", outline: "none", fontSize: 13, boxSizing: "border-box",
                resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, marginBottom: 9,
              }}
            />
            <div style={{ display: "flex", gap: 10, marginBottom: 9, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, opacity: 0.5, color: "var(--foreground)", flexShrink: 0 }}>Due date</span>
                <DatePicker
                  value={newTaskDueDate}
                  onChange={setNewTaskDueDate}
                  placeholder="Set due date"
                  style={{ fontSize: 12, padding: "5px 9px" }}
                />
              </div>
              {members.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, opacity: 0.5, color: "var(--foreground)", flexShrink: 0 }}>Assign to</span>
                  <select
                    value={newTaskAssignedTo}
                    onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                    style={{
                      padding: "5px 9px", borderRadius: 8,
                      border: "1px solid rgba(99,102,241,0.22)", background: "var(--input-bg)",
                      color: "var(--foreground)", outline: "none", fontSize: 12, cursor: "pointer",
                    }}
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={String(m.user_id)} value={String(m.user_id)}>
                        {m.full_name}{m.role === "owner" ? " (owner)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 5 }}>
                {TASK_PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewTaskPriority(p)}
                    style={{
                      padding: "4px 9px", borderRadius: 999,
                      border: `1px solid ${newTaskPriority === p ? PRIORITY_COLORS[p] : "rgba(99,102,241,0.20)"}`,
                      background: newTaskPriority === p ? `${PRIORITY_COLORS[p]}20` : "transparent",
                      color: newTaskPriority === p ? PRIORITY_COLORS[p] : "inherit",
                      fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCreateTask}
                disabled={creatingTask || !newTaskTitle.trim()}
                style={{
                  marginLeft: "auto", padding: "5px 14px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)", color: "#fff",
                  fontWeight: 700, fontSize: 12, transition: "opacity 0.15s",
                  cursor: !newTaskTitle.trim() ? "default" : "pointer",
                  opacity: !newTaskTitle.trim() ? 0.35 : creatingTask ? 0.7 : 1,
                }}
              >
                {creatingTask ? "Adding..." : "Add task"}
              </button>
            </div>
          </div>
        )}

        {tasksErr && (
          <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 10 }}>{tasksErr}</div>
        )}

        {/* Filter chips */}
        {tasks.length > 0 && (
          <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
            {(["ALL", ...TASK_STATUSES] as const).map((f) => {
              const active = taskFilter === f;
              const color = f === "ALL" ? "#888" : TASK_STATUS_COLORS[f];
              return (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  style={{
                    padding: "3px 10px", borderRadius: 999,
                    border: `1px solid ${active ? color : "rgba(99,102,241,0.18)"}`,
                    background: active ? `${color}18` : "transparent",
                    color: active ? color : "inherit", fontSize: 11, fontWeight: 700,
                    cursor: "pointer", transition: "all 0.15s", opacity: active ? 1 : 0.55,
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        )}

        {/* Task list */}
        {tasksLoading ? (
          <div style={{ display: "grid", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 58, borderRadius: 12,
                background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)",
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 7 }}>
            {filteredTasks.map((t) => {
              const pc = PRIORITY_COLORS[t.priority];
              const done = t.status === "DONE";
              const urgency = dueDateUrgency(t.due_date, t.status);
              const urgencyColor = urgency === "overdue" ? "#ef4444" : urgency === "soon" ? "#f59e0b" : null;
              const isExpanded = expandedTaskId === t.id;
              const aiSummary = summaries[t.id];
              const hasAttemptedSummary = summarized[t.id] || false;
              const isSummarizing = summarizing[t.id];
              return (
                <div
                  key={t.id}
                  onMouseEnter={() => setHoveredTaskId(t.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                  style={{
                    border: `1px solid ${isExpanded ? "rgba(99,102,241,0.30)" : urgencyColor ? `${urgencyColor}30` : "rgba(99,102,241,0.14)"}`,
                    borderRadius: 12, padding: "11px 13px",
                    background: isExpanded ? "rgba(99,102,241,0.06)" : urgencyColor ? `${urgencyColor}06` : "rgba(99,102,241,0.04)",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  {/* Main row */}
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <TaskStatusIcon status={t.status} onClick={() => cycleTaskStatus(t)} />
                    <div style={{
                      fontWeight: 700, fontSize: 13, flex: 1, minWidth: 0,
                      textDecoration: done ? "line-through" : "none",
                      opacity: done ? 0.45 : 1, transition: "opacity 0.2s",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      color: "var(--foreground)",
                    }}>
                      {t.title}
                    </div>

                    {/* Assignee avatar */}
                    {t.assigned_to_name && (
                      <div
                        title={`Assigned to ${t.assigned_to_name}`}
                        style={{
                          width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                          background: "rgba(99,102,241,0.20)",
                          border: "1.5px solid rgba(99,102,241,0.35)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 800, color: "var(--accent-light)",
                          userSelect: "none" as const,
                        }}
                      >
                        {memberInitials(t.assigned_to_name)}
                      </div>
                    )}

                    {/* Due date urgency chip */}
                    {urgencyColor && (
                      <div style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                        border: `1px solid ${urgencyColor}40`, background: `${urgencyColor}14`,
                        color: urgencyColor, flexShrink: 0, whiteSpace: "nowrap",
                      }}>
                        {urgency === "overdue" ? "Overdue" : "Due soon"}
                      </div>
                    )}

                    {/* Edit toggle */}
                    <button
                      onClick={() => openTask(t)}
                      title={isExpanded ? "Close editor" : "Edit task"}
                      style={{
                        border: "none", background: "transparent", cursor: "pointer",
                        padding: "2px 4px", flexShrink: 0, color: "var(--foreground)",
                        opacity: isExpanded ? 0.8 : hoveredTaskId === t.id ? 0.5 : 0.2,
                        transition: "opacity 0.15s, transform 0.2s",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        display: "flex", alignItems: "center",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      onClick={() => cycleTaskPriority(t)}
                      title="Click to cycle priority"
                      style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
                        border: `1px solid ${pc}35`, background: `${pc}15`, color: pc,
                        cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s",
                      }}
                    >
                      {t.priority}
                    </button>
                    <button
                      onClick={() => deleteTask(t)}
                      title="Delete task"
                      style={{
                        border: "none", background: "transparent", color: "#ef4444",
                        cursor: "pointer", fontSize: 11, padding: "2px 4px", flexShrink: 0,
                        opacity: hoveredTaskId === t.id ? 0.7 : 0, transition: "opacity 0.15s",
                      }}
                    >✕</button>
                  </div>

                  {/* Always-visible info rows (hidden while edit panel is open) */}
                  {!isExpanded && (t.description || t.due_date || t.assigned_to_name || t.created_by_name || aiSummary) && (
                    <div style={{ marginTop: 8, marginLeft: 32, display: "grid", gap: 6 }}>

                      {/* Description */}
                      {t.description && (
                        <div style={{
                          fontSize: 12, color: "var(--foreground)", opacity: 0.6, lineHeight: 1.5,
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                          overflow: "hidden",
                        }}>
                          {t.description}
                        </div>
                      )}

                      {/* AI summary row */}
                      {t.description && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 800, letterSpacing: "0.07em",
                            color: "var(--accent-light)", background: "rgba(99,102,241,0.13)",
                            border: "1px solid rgba(99,102,241,0.22)", borderRadius: 5,
                            padding: "2px 5px", flexShrink: 0, userSelect: "none" as const,
                          }}>✦ AI</span>
                          {aiSummary ? (
                            <span style={{
                              fontSize: 11, fontStyle: "italic", color: "var(--foreground)",
                              opacity: 0.65, flex: 1, lineHeight: 1.4,
                              display: "-webkit-box", WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical" as const, overflow: "hidden",
                            }}>{aiSummary}</span>
                          ) : summaryErrors[t.id] ? (
                            <span style={{ fontSize: 11, color: "#f59e0b", opacity: 0.8 }}>
                              {summaryErrors[t.id]}
                            </span>
                          ) : hasAttemptedSummary ? (
                            <span style={{ fontSize: 11, opacity: 0.35, color: "var(--foreground)", fontStyle: "italic" }}>
                              Description is already concise
                            </span>
                          ) : (
                            <button
                              onClick={() => summarizeTask(t.id)}
                              disabled={isSummarizing}
                              style={{
                                padding: 0, border: "none", background: "transparent",
                                color: "var(--accent-light)", fontSize: 11, fontWeight: 600,
                                cursor: isSummarizing ? "default" : "pointer",
                                opacity: isSummarizing ? 0.4 : 0.6,
                              }}
                            >
                              {isSummarizing ? "Generating..." : "Generate summary"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Attribution + due date row */}
                      {(t.assigned_to_name || t.due_date || t.created_by_name) && (
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const }}>
                          {t.assigned_to_name && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 5,
                              background: "rgba(99,102,241,0.08)", borderRadius: 20,
                              padding: "3px 9px 3px 4px", border: "1px solid rgba(99,102,241,0.18)",
                            }}>
                              <div style={{
                                width: 18, height: 18, borderRadius: 999,
                                background: "linear-gradient(135deg,#7c3aed,#6366f1)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 8, fontWeight: 800, color: "#fff",
                                userSelect: "none" as const, flexShrink: 0,
                              }}>
                                {memberInitials(t.assigned_to_name)}
                              </div>
                              <span style={{ fontSize: 11, opacity: 0.5, color: "var(--foreground)", fontWeight: 600 }}>Assigned to</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)" }}>{t.assigned_to_name}</span>
                            </div>
                          )}
                          {t.due_date && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 4,
                              fontSize: 11, flexShrink: 0,
                              background: urgencyColor ? `${urgencyColor}14` : "rgba(99,102,241,0.06)",
                              border: `1px solid ${urgencyColor ? `${urgencyColor}35` : "rgba(99,102,241,0.16)"}`,
                              borderRadius: 20, padding: "3px 9px",
                            }}>
                              <span style={{ opacity: 0.5, fontWeight: 600, color: urgencyColor ?? "var(--foreground)" }}>Due</span>
                              <span style={{ fontWeight: 700, color: urgencyColor ?? "var(--foreground)" }}>{t.due_date}</span>
                            </div>
                          )}
                          {t.created_by_name && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                              <span style={{ fontSize: 11, opacity: 0.35, color: "var(--foreground)" }}>Created by</span>
                              <span style={{ fontSize: 11, opacity: 0.55, fontWeight: 600, color: "var(--foreground)" }}>{t.created_by_name}</span>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )}

                  {/* Edit panel */}
                  {isExpanded && (
                    <div style={{ marginTop: 14, borderTop: "1px solid rgba(99,102,241,0.14)", paddingTop: 14, display: "grid", gap: 12 }}>
                      {/* Editable title */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Title</div>
                        <input
                          value={expandedTaskTitle}
                          onChange={(e) => setExpandedTaskTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Escape" && setExpandedTaskId(null)}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: 8,
                            border: "1px solid rgba(99,102,241,0.22)", background: "rgba(99,102,241,0.06)",
                            color: "var(--foreground)", outline: "none", fontSize: 13, boxSizing: "border-box",
                          }}
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Description</div>
                        <textarea
                          value={expandedDesc}
                          onChange={(e) => setExpandedDesc(e.target.value)}
                          placeholder="Add a description..."
                          rows={3}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: 8,
                            border: "1px solid rgba(99,102,241,0.22)", background: "rgba(99,102,241,0.06)",
                            color: "var(--foreground)", outline: "none", fontSize: 13,
                            boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
                            lineHeight: 1.5,
                          }}
                        />
                      </div>

                      {/* Due date + Assignee row */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Due date</div>
                          <DatePicker
                            value={expandedDueDate}
                            onChange={setExpandedDueDate}
                            placeholder="Set due date"
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Assigned to</div>
                          <select
                            value={expandedAssignedTo}
                            onChange={(e) => setExpandedAssignedTo(e.target.value)}
                            style={{
                              width: "100%", padding: "8px 10px", borderRadius: 8, boxSizing: "border-box",
                              border: "1px solid rgba(99,102,241,0.22)", background: "var(--input-bg)",
                              color: "var(--foreground)", outline: "none", fontSize: 13, cursor: "pointer",
                            }}
                          >
                            <option value="">Unassigned</option>
                            {members.map((m) => (
                              <option key={String(m.user_id)} value={String(m.user_id)}>
                                {m.full_name}{m.role === "owner" ? " (owner)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Meta + actions */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ fontSize: 11, opacity: 0.3, color: "var(--foreground)" }}>
                          Created {new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          {t.created_by_name && <span> by <strong style={{ opacity: 0.6 }}>{t.created_by_name}</strong></span>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 6 }}>
                          {saveErr && (
                            <div style={{ fontSize: 11, color: "#ef4444" }}>{saveErr}</div>
                          )}
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => setExpandedTaskId(null)}
                              style={{
                                padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.22)",
                                background: "transparent", color: "var(--foreground)", fontSize: 12,
                                fontWeight: 600, cursor: "pointer", opacity: 0.7,
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveTaskDetail(t)}
                              disabled={savingTask}
                              style={{
                                padding: "6px 14px", borderRadius: 8, border: "none",
                                background: "linear-gradient(135deg, #7c3aed, #6366f1)", color: "#fff",
                                fontSize: 12, fontWeight: 700, cursor: savingTask ? "default" : "pointer",
                                opacity: savingTask ? 0.6 : 1, transition: "opacity 0.15s",
                              }}
                            >
                              {savingTask ? "Saving..." : "Save changes"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
            {filteredTasks.length === 0 && (
              <div style={{ textAlign: "center", padding: "36px 0", opacity: 0.38, fontSize: 13, color: "var(--foreground)" }}>
                {tasks.length === 0
                  ? 'No tasks yet. Click "+ New task" to add one.'
                  : `No ${taskFilter} tasks.`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
