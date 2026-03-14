"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "../api-client/http";
import { useRouter } from "next/navigation";

export type Project = {
  id: string;
  owner_id: string;
  title: string;
  target_due_date: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  created_at: string;
  updated_at: string;
};

export type Me = { id: string; email: string; full_name: string };

export type Member = {
  user_id: string;
  email: string;
  full_name: string;
  role: "owner" | "member";
  joined_at: string;
};

export const PROJECT_STATUSES: Project["status"][] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
];

export const PROJECT_STATUS_COLORS: Record<Project["status"], string> = {
  NOT_STARTED: "#6b7280",
  IN_PROGRESS: "#3b82f6",
  BLOCKED: "#ef4444",
  DONE: "#22c55e",
};

type Ctx = {
  me: Me | null;
  setMe: React.Dispatch<React.SetStateAction<Me | null>>;
  authChecked: boolean;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  recentIds: string[];
  starredIds: string[];
  touchRecent: (id: string) => void;
  toggleStar: (id: string) => void;
  cycleProjectStatus: (project: Project) => Promise<void>;
  deleteProject: (project: Project, onDelete?: () => void) => Promise<void>;
  renameProject: (project: Project, newTitle: string) => Promise<void>;
  createProject: (title: string, dueDate: string) => Promise<Project>;
};

const ProjectsContext = createContext<Ctx | null>(null);

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used inside ProjectsProvider");
  return ctx;
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [starredIds, setStarredIds] = useState<string[]>([]);

  useEffect(() => {
    apiFetch("/auth/me")
      .then((u) => { setMe(u as Me); setAuthChecked(true); })
      .catch(() => { router.push("/login"); });
  }, []);

  useEffect(() => {
    apiFetch("/projects")
      .then((data) => setProjects(Array.isArray(data) ? (data as Project[]) : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!me) return;
    try {
      const raw = localStorage.getItem(`starred:${me.id}`);
      if (raw) setStarredIds(JSON.parse(raw));
    } catch {}
  }, [me?.id]);

  useEffect(() => {
    if (!me) return;
    try { localStorage.setItem(`starred:${me.id}`, JSON.stringify(starredIds)); }
    catch {}
  }, [starredIds, me?.id]);

  function touchRecent(id: string) {
    setRecentIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 8));
  }

  function toggleStar(id: string) {
    setStarredIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]
    );
  }

  async function cycleProjectStatus(project: Project) {
    const next =
      PROJECT_STATUSES[
        (PROJECT_STATUSES.indexOf(project.status) + 1) % PROJECT_STATUSES.length
      ];
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, status: next } : p))
    );
    try {
      const updated = (await apiFetch(`/projects/${project.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: next }),
      })) as Project;
      setProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    } catch {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, status: project.status } : p))
      );
    }
  }

  async function deleteProject(project: Project, onDelete?: () => void) {
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    setRecentIds((prev) => prev.filter((id) => id !== project.id));
    setStarredIds((prev) => prev.filter((id) => id !== project.id));
    onDelete?.();
    try {
      await apiFetch(`/projects/${project.id}/delete`, { method: "POST" });
    } catch {
      setProjects((prev) => [...prev, project]);
    }
  }

  async function renameProject(project: Project, newTitle: string) {
    const trimmed = newTitle.trim();
    if (!trimmed || trimmed === project.title) return;
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, title: trimmed } : p))
    );
    try {
      const updated = (await apiFetch(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: trimmed, target_due_date: project.target_due_date }),
      })) as Project;
      setProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    } catch {
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, title: project.title } : p))
      );
    }
  }

  async function createProject(title: string, dueDate: string): Promise<Project> {
    const created = (await apiFetch("/projects", {
      method: "POST",
      body: JSON.stringify({ title: title.trim(), target_due_date: dueDate }),
    })) as Project;
    setProjects((prev) => [created, ...prev]);
    touchRecent(created.id);
    return created;
  }

  return (
    <ProjectsContext.Provider
      value={{
        me, setMe, authChecked, projects, setProjects,
        recentIds, starredIds, touchRecent, toggleStar,
        cycleProjectStatus, deleteProject, renameProject, createProject,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}
