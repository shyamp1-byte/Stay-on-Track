"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Clock, Heart, Plus, ChevronRight, FolderOpen, X, Settings } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { logout } from "../api-client/http";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ProjectsProvider, useProjects, PROJECT_STATUS_COLORS } from "./ProjectsContext";

function initialsFromName(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "U";
}

function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { projects, recentIds, starredIds, me, touchRecent, createProject } = useProjects();

  const [navFlyout, setNavFlyout] = useState<"RECENT" | "STARRED" | null>(null);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 260 });
  const [flyoutSearch, setFlyoutSearch] = useState("");
  const flyoutRef = useRef<HTMLDivElement>(null);

  const [showNewProject, setShowNewProject] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!navFlyout) return;
    function onMouseDown(e: MouseEvent) {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setNavFlyout(null); setFlyoutSearch("");
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setNavFlyout(null); setFlyoutSearch(""); }
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onMouseDown); document.removeEventListener("keydown", onKey); };
  }, [navFlyout]);

  async function handleCreate() {
    if (!newTitle.trim() || !newDueDate) return;
    setCreating(true);
    try {
      const created = await createProject(newTitle.trim(), newDueDate);
      setNewTitle(""); setNewDueDate(""); setShowNewProject(false);
      router.push(`/projects/${created.id}`);
    } finally { setCreating(false); }
  }

  const myProjects = projects.filter((p) => p.owner_id === me?.id);
  const sharedProjects = projects.filter((p) => p.owner_id !== me?.id);
  const recentProjects = projects.filter((p) => recentIds.includes(p.id));
  const flyoutProjects = navFlyout === "STARRED"
    ? projects.filter((p) => starredIds.includes(p.id))
    : recentProjects;
  const flyoutFiltered = flyoutSearch.trim()
    ? flyoutProjects.filter((p) => p.title.toLowerCase().includes(flyoutSearch.toLowerCase()))
    : flyoutProjects;

  const isForYou = pathname === "/projects";

  const navItems = [
    { key: "FOR_YOU", label: "For you", icon: Home, href: "/projects" },
    { key: "RECENT", label: "Recent", icon: Clock, flyout: true },
    { key: "STARRED", label: "Liked", icon: Heart, flyout: true },
  ] as const;

  return (
    <>
      {/* Flyout panel */}
      <AnimatePresence>
        {navFlyout && (
          <motion.div
            ref={flyoutRef}
            initial={{ opacity: 0, x: -8, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed", top: flyoutPos.top, left: flyoutPos.left,
              zIndex: 200, width: 280,
              background: "var(--background)", border: "1px solid rgba(99,102,241,0.22)",
              borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid rgba(99,102,241,0.12)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 9, color: "var(--foreground)", opacity: 0.7, letterSpacing: "0.04em" }}>
                {navFlyout === "RECENT" ? "Recent" : "Liked"}
              </div>
              <div style={{ position: "relative" }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", opacity: 0.35, pointerEvents: "none" }}>
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  autoFocus
                  placeholder={`Search ${navFlyout === "RECENT" ? "recent" : "liked"} projects`}
                  value={flyoutSearch}
                  onChange={(e) => setFlyoutSearch(e.target.value)}
                  style={{
                    width: "100%", padding: "7px 10px 7px 28px", borderRadius: 8,
                    border: "1px solid rgba(99,102,241,0.18)", background: "rgba(99,102,241,0.07)",
                    color: "var(--foreground)", fontSize: 12, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto", padding: "6px 0" }}>
              {flyoutFiltered.length === 0 ? (
                <div style={{ padding: "12px 14px", fontSize: 12, opacity: 0.4, color: "var(--foreground)" }}>
                  {flyoutSearch ? "No matches." : navFlyout === "STARRED" ? "No liked projects yet." : "No recent projects."}
                </div>
              ) : flyoutFiltered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { touchRecent(p.id); setNavFlyout(null); setFlyoutSearch(""); router.push(`/projects/${p.id}`); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    width: "100%", padding: "8px 14px", border: "none",
                    background: pathname === `/projects/${p.id}` ? "rgba(99,102,241,0.10)" : "transparent",
                    color: "var(--foreground)", cursor: "pointer", textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.07)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = pathname === `/projects/${p.id}` ? "rgba(99,102,241,0.10)" : "transparent"; }}
                >
                  <div style={{
                    width: 7, height: 7, borderRadius: 999, flexShrink: 0,
                    background: PROJECT_STATUS_COLORS[p.status],
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.title}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside style={{
        borderRight: "1px solid rgba(99,102,241,0.20)",
        background: "linear-gradient(180deg, rgba(99,102,241,0.09) 0%, rgba(99,102,241,0.03) 100%)",
        padding: "16px 12px",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0,
        height: "100dvh", overflowY: "auto",
        gap: 0,
      }}>

        {/* Logo */}
        <Link href="/projects" style={{ textDecoration: "none", color: "inherit", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
              display: "grid", placeItems: "center", fontWeight: 900, fontSize: 14,
              color: "#fff", boxShadow: "0 4px 14px rgba(124,58,237,0.45)",
              flexShrink: 0,
            }}>S</div>
            <div>
              <div style={{ fontWeight: 900, lineHeight: 1.15, fontSize: 14, letterSpacing: "-0.01em" }}>StratoTrack</div>
              <div style={{ fontSize: 10, opacity: 0.4, letterSpacing: "0.04em" }}>Workspace</div>
            </div>
          </div>
        </Link>

        {/* Nav items */}
        <nav style={{ display: "grid", gap: 2, marginBottom: 20 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === "FOR_YOU" ? isForYou : navFlyout === item.key;
            return item.key === "FOR_YOU" ? (
              <Link key={item.key} href="/projects" style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "8px 10px", borderRadius: 9,
                  background: isActive ? "rgba(99,102,241,0.16)" : "transparent",
                  color: isActive ? "var(--foreground)" : "var(--foreground)",
                  opacity: isActive ? 1 : 0.6,
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  transition: "background 0.15s, opacity 0.15s",
                }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.background = isActive ? "rgba(99,102,241,0.16)" : "rgba(99,102,241,0.07)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = isActive ? "1" : "0.6"; (e.currentTarget as HTMLElement).style.background = isActive ? "rgba(99,102,241,0.16)" : "transparent"; }}
                >
                  <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </div>
              </Link>
            ) : (
              <button
                key={item.key}
                onClick={(e) => {
                  if (isActive) { setNavFlyout(null); setFlyoutSearch(""); return; }
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setFlyoutPos({ top: rect.top, left: rect.right + 10 });
                  setFlyoutSearch("");
                  setNavFlyout(item.key as "RECENT" | "STARRED");
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 9, justifyContent: "space-between",
                  padding: "8px 10px", borderRadius: 9, border: "none", width: "100%", textAlign: "left",
                  background: isActive ? "rgba(99,102,241,0.16)" : "transparent",
                  color: "var(--foreground)", opacity: isActive ? 1 : 0.6,
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  transition: "background 0.15s, opacity 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.background = isActive ? "rgba(99,102,241,0.16)" : "rgba(99,102,241,0.07)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = isActive ? "1" : "0.6"; (e.currentTarget as HTMLElement).style.background = isActive ? "rgba(99,102,241,0.16)" : "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </div>
                <ChevronRight size={12} style={{ opacity: 0.4 }} />
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(99,102,241,0.14)", marginBottom: 16 }} />

        {/* Projects list */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 10, paddingLeft: 4,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FolderOpen size={11} style={{ opacity: 0.4 }} />
              <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Projects
              </span>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 999,
              background: "rgba(99,102,241,0.14)", color: "var(--accent-light)",
            }}>
              {projects.length}
            </span>
          </div>

          {projects.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.35, padding: "4px 4px", lineHeight: 1.5, color: "var(--foreground)" }}>
              No projects yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 1 }}>
              {myProjects.map((p) => {
                const isActive = pathname === `/projects/${p.id}`;
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                    <div
                      onClick={() => touchRecent(p.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 10px", borderRadius: 9,
                        background: isActive ? "rgba(99,102,241,0.16)" : "transparent",
                        color: "var(--foreground)", cursor: "pointer",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.07)"; }}
                      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div style={{
                        width: 7, height: 7, borderRadius: 999, flexShrink: 0,
                        background: PROJECT_STATUS_COLORS[p.status],
                        boxShadow: isActive ? `0 0 6px ${PROJECT_STATUS_COLORS[p.status]}` : "none",
                      }} />
                      <span style={{
                        fontSize: 13, fontWeight: isActive ? 700 : 500,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        opacity: isActive ? 1 : 0.75,
                      }}>
                        {p.title}
                      </span>
                    </div>
                  </Link>
                );
              })}

              {sharedProjects.length > 0 && (
                <>
                  <div style={{ height: 1, background: "rgba(99,102,241,0.10)", margin: "6px 4px" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.3, padding: "2px 10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Shared
                  </div>
                  {sharedProjects.map((p) => {
                    const isActive = pathname === `/projects/${p.id}`;
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                        <div
                          onClick={() => touchRecent(p.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "7px 10px", borderRadius: 9,
                            background: isActive ? "rgba(99,102,241,0.16)" : "transparent",
                            color: "var(--foreground)", cursor: "pointer",
                            transition: "background 0.12s",
                          }}
                          onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.07)"; }}
                          onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <div style={{
                            width: 7, height: 7, borderRadius: 999, flexShrink: 0,
                            background: PROJECT_STATUS_COLORS[p.status],
                          }} />
                          <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: isActive ? 1 : 0.65, flex: 1 }}>
                            {p.title}
                          </span>
                          <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 999, background: "rgba(99,102,241,0.14)", color: "var(--accent-light)", fontWeight: 700, flexShrink: 0 }}>
                            shared
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(99,102,241,0.14)", margin: "14px 0 12px" }} />

        {/* New project button */}
        <div>
          <button
            onClick={() => setShowNewProject((v) => !v)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(99,102,241,0.28)",
              background: showNewProject ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)",
              color: "var(--foreground)", fontWeight: 700, fontSize: 12,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {showNewProject
              ? <><X size={13} style={{ opacity: 0.6 }} /> Cancel</>
              : <><Plus size={13} style={{ color: "#a78bfa" }} /> New project</>
            }
          </button>

          <AnimatePresence>
            {showNewProject && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ display: "grid", gap: 7, paddingTop: 10 }}>
                  <input
                    autoFocus
                    placeholder="Project title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    style={{
                      padding: "8px 10px", borderRadius: 8, fontSize: 12,
                      border: "1px solid rgba(99,102,241,0.22)", background: "rgba(99,102,241,0.06)",
                      color: "var(--foreground)", outline: "none",
                    }}
                  />
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    style={{
                      padding: "8px 10px", borderRadius: 8, fontSize: 12,
                      border: "1px solid rgba(99,102,241,0.22)", background: "rgba(99,102,241,0.06)",
                      color: "var(--foreground)", outline: "none", colorScheme: "dark",
                    }}
                  />
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newTitle.trim() || !newDueDate}
                    style={{
                      padding: "8px", borderRadius: 8, border: "none",
                      background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                      color: "#fff", fontWeight: 700, fontSize: 12,
                      cursor: !newTitle.trim() || !newDueDate ? "default" : "pointer",
                      opacity: !newTitle.trim() || !newDueDate ? 0.4 : creating ? 0.7 : 1,
                    }}
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>
    </>
  );
}

function Topbar() {
  const { me } = useProjects();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setUserMenuOpen(false); }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onMouseDown); document.removeEventListener("keydown", onKey); };
  }, [userMenuOpen]);

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "flex-end",
      gap: 12, padding: "0 20px", height: 56,
      borderBottom: "1px solid rgba(99,102,241,0.16)",
      background: "rgba(99,102,241,0.03)", flexShrink: 0,
    }}>
      <ThemeToggle />
      <div ref={userMenuRef} style={{ position: "relative" }}>
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          style={{
            width: 34, height: 34, borderRadius: 999,
            border: "1px solid rgba(99,102,241,0.30)",
            background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.15))",
            color: "var(--foreground)", fontWeight: 900, cursor: "pointer",
            display: "grid", placeItems: "center", fontSize: 12, transition: "background 0.15s",
          }}
          aria-label="Account"
        >
          {initialsFromName(me?.full_name)}
        </button>
        <AnimatePresence>
          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)",
                width: 240, borderRadius: 14,
                border: "1px solid rgba(99,102,241,0.22)",
                background: "var(--background)", color: "var(--foreground)",
                backdropFilter: "blur(12px)", boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
                overflow: "hidden", zIndex: 50,
              }}
            >
              <div style={{ padding: "14px 16px", display: "flex", gap: 11, alignItems: "center", borderBottom: "1px solid rgba(99,102,241,0.14)" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 999,
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  display: "grid", placeItems: "center", fontWeight: 900, fontSize: 12, flexShrink: 0, color: "#fff",
                }}>
                  {initialsFromName(me?.full_name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {me?.full_name || "User"}
                  </div>
                  <div style={{ opacity: 0.5, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {me?.email || ""}
                  </div>
                </div>
              </div>
              <Link href="/projects/settings" onClick={() => setUserMenuOpen(false)} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    width: "100%", padding: "12px 16px",
                    color: "var(--foreground)", cursor: "pointer", fontWeight: 600, fontSize: 13, opacity: 0.7,
                    transition: "opacity 0.1s, background 0.1s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.07)"; (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
                >
                  <Settings size={14} style={{ opacity: 0.7 }} />
                  Settings
                </div>
              </Link>
              <div style={{ height: 1, background: "rgba(99,102,241,0.10)", margin: "2px 0" }} />
              <button
                onClick={logout}
                style={{
                  width: "100%", textAlign: "left", padding: "12px 16px",
                  border: "none", background: "transparent", color: "inherit",
                  cursor: "pointer", fontWeight: 600, fontSize: 13, opacity: 0.7,
                  transition: "opacity 0.1s, background 0.1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.07)"; (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
              >
                Log out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

function ProjectsShell({ children }: { children: React.ReactNode }) {
  const { authChecked } = useProjects();
  if (!authChecked) {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "var(--background)" }}>
        <div style={{ color: "#a78bfa", fontSize: 14, opacity: 0.5 }}>Loading...</div>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100dvh" }}>
      <Sidebar />
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", overflow: "hidden" }}>
        <Topbar />
        <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
      </div>
    </div>
  );
}

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <ProjectsProvider><ProjectsShell>{children}</ProjectsShell></ProjectsProvider>;
}
