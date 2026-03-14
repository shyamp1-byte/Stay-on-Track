"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Heart, ListChecks, Target, RefreshCw } from "lucide-react";
import { useProjects, PROJECT_STATUS_COLORS } from "./ProjectsContext";
import { apiFetch } from "../api-client/http";

// ─── Lamp strip ───────────────────────────────────────────────────────────────

function LampStrip() {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 260, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {/* Wide outer glow cone — headlight sweep */}
      <motion.div
        initial={{ width: "0px", opacity: 0 }}
        animate={{ width: ["0px", "110%", "85%", "75%"], opacity: [0, 1, 1, 1] }}
        transition={{ delay: 0.15, duration: 1.5, times: [0, 0.42, 0.72, 1], ease: "easeOut" }}
        style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          height: "240px",
          background: "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(109,40,217,0.22) 0%, rgba(99,102,241,0.10) 50%, transparent 80%)",
        }}
      />
      {/* Mid glow — tighter, brighter */}
      <motion.div
        initial={{ width: "0px", opacity: 0 }}
        animate={{ width: ["0px", "80%", "58%", "50%"], opacity: [0, 0.9, 0.85, 0.85] }}
        transition={{ delay: 0.15, duration: 1.5, times: [0, 0.42, 0.72, 1], ease: "easeOut" }}
        style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          height: "160px",
          background: "radial-gradient(ellipse 65% 100% at 50% 0%, rgba(139,92,246,0.38) 0%, transparent 75%)",
          filter: "blur(8px)",
        }}
      />
      {/* Core bloom — tight bright center */}
      <motion.div
        initial={{ width: "0px", opacity: 0 }}
        animate={{ width: ["0px", "460px", "340px", "300px"], opacity: [0, 0.7, 0.6, 0.55] }}
        transition={{ delay: 0.15, duration: 1.5, times: [0, 0.42, 0.72, 1], ease: "easeOut" }}
        style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          height: "90px",
          background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(196,181,253,0.55) 0%, transparent 80%)",
          filter: "blur(22px)",
        }}
      />
      {/* The strip line — sweeps out then snaps back */}
      <motion.div
        initial={{ width: "0px", opacity: 0 }}
        animate={{ width: ["0px", "92%", "68%", "58%"], opacity: [0, 1, 1, 1] }}
        transition={{ delay: 0.15, duration: 1.5, times: [0, 0.42, 0.72, 1], ease: "easeOut" }}
        style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          height: "2px",
          background: "linear-gradient(to right, transparent, rgba(167,139,250,0.4) 15%, #a78bfa 35%, #7c3aed 50%, #a78bfa 65%, rgba(167,139,250,0.4) 85%, transparent)",
          boxShadow: "0 0 10px rgba(167,139,250,0.8), 0 0 24px rgba(124,58,237,0.55), 0 0 48px rgba(109,40,217,0.30)",
        }}
      />
    </div>
  );
}

// ─── Shimmer text ──────────────────────────────────────────────────────────────

function ShimmerText({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ overflow: "hidden", display: "inline-block" }}>
      <motion.div
        style={{
          display: "inline-block",
          WebkitTextFillColor: "transparent",
          background: "currentColor linear-gradient(to right, currentColor 0%, rgba(255,255,255,0.75) 40%, rgba(255,255,255,0.75) 60%, currentColor 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          backgroundRepeat: "no-repeat",
          backgroundSize: "50% 200%",
          ...style,
        } as React.CSSProperties}
        initial={{ backgroundPositionX: "250%" }}
        animate={{ backgroundPositionX: ["-100%", "250%"] }}
        transition={{ duration: 1.6, delay: 0.8, repeat: Infinity, repeatDelay: 2.5, ease: "linear" }}
      >
        <span>{children}</span>
      </motion.div>
    </div>
  );
}

// ─── Template definitions ────────────────────────────────────────────────────

type TaskTemplate = { title: string; priority: "LOW" | "MEDIUM" | "HIGH" };
type Template = {
  id: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  title: string;
  description: string;
  tasks: TaskTemplate[];
};

const TEMPLATES: Template[] = [
  {
    id: "checklist",
    icon: ListChecks,
    title: "Simple Checklist",
    description: "A straightforward task list for anything you need to power through.",
    tasks: [
      { title: "Gather everything you need", priority: "HIGH" },
      { title: "Break the work into steps", priority: "HIGH" },
      { title: "Work through each item", priority: "MEDIUM" },
      { title: "Review your progress", priority: "MEDIUM" },
      { title: "Final check & wrap up", priority: "LOW" },
    ],
  },
  {
    id: "sprint",
    icon: Target,
    title: "Goal Sprint",
    description: "Push hard toward one specific objective in a fixed window of time.",
    tasks: [
      { title: "Define the goal clearly", priority: "HIGH" },
      { title: "Break into daily actions", priority: "HIGH" },
      { title: "Execute & track daily", priority: "HIGH" },
      { title: "Mid-point check-in", priority: "MEDIUM" },
      { title: "Final push", priority: "HIGH" },
      { title: "Review & reflect", priority: "LOW" },
    ],
  },
  {
    id: "recurring",
    icon: RefreshCw,
    title: "Ongoing Work",
    description: "Recurring responsibilities with phases you revisit regularly.",
    tasks: [
      { title: "Initial setup & planning", priority: "HIGH" },
      { title: "Phase 1 execution", priority: "HIGH" },
      { title: "Phase 2 execution", priority: "MEDIUM" },
      { title: "Review & adjust", priority: "MEDIUM" },
      { title: "Document & hand off", priority: "LOW" },
    ],
  },
];

function GlassIcon({
  icon: Icon,
  active,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  active: boolean;
}) {
  return (
    <div style={{
      position: "relative",
      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
      overflow: "hidden",
      background: active
        ? "linear-gradient(155deg, rgba(192,160,255,0.42) 0%, rgba(124,58,237,0.20) 45%, rgba(109,40,217,0.32) 100%)"
        : "linear-gradient(155deg, rgba(255,255,255,0.24) 0%, rgba(210,215,255,0.08) 45%, rgba(190,200,255,0.16) 100%)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      border: "1px solid rgba(255,255,255,0.26)",
      boxShadow: active
        ? "0 6px 22px rgba(100,50,220,0.45), 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.18) inset"
        : "0 4px 18px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.28) inset, 0 -1px 0 rgba(0,0,0,0.14) inset",
      transition: "all 0.25s ease",
    }}>
      {/* Top specular arc — the key "liquid glass" highlight */}
      <div style={{
        position: "absolute", top: 0, left: "10%", right: "10%", height: "44%",
        background: "linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.12) 65%, transparent 100%)",
        borderRadius: "0 0 55% 55%",
        pointerEvents: "none",
      }} />
      {/* Bottom rim reflection */}
      <div style={{
        position: "absolute", bottom: 0, left: "22%", right: "22%", height: "18%",
        background: "linear-gradient(0deg, rgba(255,255,255,0.14) 0%, transparent 100%)",
        borderRadius: "50% 50% 0 0",
        pointerEvents: "none",
      }} />
      {/* Icon */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon
          size={16}
          style={{
            color: active ? "#ede9fe" : "rgba(255,255,255,0.82)",
            filter: active
              ? "drop-shadow(0 0 5px rgba(216,180,254,0.70)) drop-shadow(0 1px 2px rgba(0,0,0,0.25))"
              : "drop-shadow(0 1px 3px rgba(0,0,0,0.40))",
            transition: "all 0.25s",
          }}
        />
      </div>
    </div>
  );
}

const PRIORITY_COLORS = { LOW: "#6b7280", MEDIUM: "#f59e0b", HIGH: "#ef4444" };

// ─── Heart button ─────────────────────────────────────────────────────────────

function HeartButton({ liked, onToggle }: { liked: boolean; onToggle: () => void }) {
  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      whileTap={{ scale: 0.85 }}
      style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex", flexShrink: 0 }}
    >
      <motion.div
        animate={{ scale: liked ? [1, 1.35, 1] : 1 }}
        transition={{ duration: 0.28 }}
      >
        <Heart
          size={15}
          style={{
            fill: liked ? "#ef4444" : "none",
            color: liked ? "#ef4444" : "rgba(99,102,241,0.4)",
            transition: "color 0.2s, fill 0.2s",
          }}
        />
      </motion.div>
    </motion.button>
  );
}

// ─── Template Picker ──────────────────────────────────────────────────────────

function TemplatePicker() {
  const router = useRouter();
  const { createProject } = useProjects();
  const [activeIdx, setActiveIdx] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");

  const active = TEMPLATES[activeIdx];

  async function handleCreate() {
    if (!name.trim() || !dueDate) return;
    setCreating(true);
    setErr("");
    try {
      const project = await createProject(name.trim(), dueDate);
      await Promise.all(
        active.tasks.map((t) =>
          apiFetch(`/projects/${project.id}/tasks`, {
            method: "POST",
            body: JSON.stringify({ title: t.title, priority: t.priority }),
          })
        )
      );
      router.push(`/projects/${project.id}`);
    } catch (e: any) {
      setErr(String(e?.message || "Failed to create project"));
      setCreating(false);
    }
  }

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{
        fontSize: 13, fontWeight: 700, opacity: 0.45, textTransform: "uppercase",
        letterSpacing: "0.06em", marginBottom: 14, color: "var(--foreground)",
      }}>
        Start from a template
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 0,
        borderRadius: 16, border: "1px solid rgba(99,102,241,0.18)",
        background: "rgba(99,102,241,0.03)", overflow: "hidden",
      }}>
        {/* Left: tabs */}
        <div style={{ borderRight: "1px solid rgba(99,102,241,0.14)", padding: "6px 0" }}>
          {TEMPLATES.map((t, i) => {
            const isActive = activeIdx === i;
            return (
              <button
                key={t.id}
                onClick={() => { setActiveIdx(i); setShowForm(false); setErr(""); }}
                style={{
                  width: "100%", textAlign: "left", padding: "14px 18px",
                  border: "none", background: isActive ? "rgba(99,102,241,0.10)" : "transparent",
                  cursor: "pointer", position: "relative", transition: "background 0.15s",
                  borderLeft: `2px solid ${isActive ? "#7c3aed" : "transparent"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <GlassIcon icon={t.icon} active={isActive} />
                  <div>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: isActive ? "var(--foreground)" : "var(--foreground)",
                      opacity: isActive ? 1 : 0.55,
                    }}>{t.title}</div>
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22 }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{ fontSize: 11, opacity: 0.5, color: "var(--foreground)", marginTop: 3, lineHeight: 1.4 }}>
                            {t.description}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: task preview + form */}
        <div style={{ padding: "18px 20px" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, color: "var(--foreground)" }}>
                Included tasks
              </div>
              <div style={{ display: "grid", gap: 5, marginBottom: 16 }}>
                {active.tasks.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: 999, flexShrink: 0,
                      background: PRIORITY_COLORS[t.priority],
                    }} />
                    <span style={{ fontSize: 12, color: "var(--foreground)", opacity: 0.7 }}>{t.title}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!showForm ? (
              <motion.button
                key="use-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowForm(true)}
                style={{
                  padding: "8px 18px", borderRadius: 9, border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}
              >
                Use template →
              </motion.button>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ display: "grid", gap: 8 }}
              >
                <input
                  autoFocus
                  placeholder="Project name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  style={{
                    padding: "8px 11px", borderRadius: 9, fontSize: 13,
                    border: "1px solid rgba(99,102,241,0.28)", background: "rgba(99,102,241,0.07)",
                    color: "var(--foreground)", outline: "none",
                  }}
                />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    padding: "8px 11px", borderRadius: 9, fontSize: 13,
                    border: "1px solid rgba(99,102,241,0.28)", background: "rgba(99,102,241,0.07)",
                    color: "var(--foreground)", outline: "none", colorScheme: "dark",
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleCreate}
                    disabled={creating || !name.trim() || !dueDate}
                    style={{
                      flex: 1, padding: "8px", borderRadius: 9, border: "none",
                      background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                      color: "#fff", fontWeight: 700, fontSize: 12,
                      cursor: !name.trim() || !dueDate ? "default" : "pointer",
                      opacity: !name.trim() || !dueDate ? 0.4 : creating ? 0.7 : 1,
                    }}
                  >
                    {creating ? "Creating..." : "Create project"}
                  </button>
                  <button
                    onClick={() => { setShowForm(false); setErr(""); }}
                    style={{
                      padding: "8px 12px", borderRadius: 9,
                      border: "1px solid rgba(99,102,241,0.2)", background: "transparent",
                      color: "var(--foreground)", fontSize: 12, cursor: "pointer", opacity: 0.6,
                    }}
                  >
                    Cancel
                  </button>
                </div>
                {err && <div style={{ fontSize: 11, color: "#ef4444" }}>{err}</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

const cardStyle = {
  padding: "16px 18px", borderRadius: 14, cursor: "pointer",
  border: "1px solid rgba(99,102,241,0.15)",
  background: "rgba(99,102,241,0.04)",
  transition: "border-color 0.15s, background 0.15s",
};

function onHoverEnter(e: React.MouseEvent<HTMLElement>) {
  e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)";
  e.currentTarget.style.background = "rgba(99,102,241,0.08)";
}
function onHoverLeave(e: React.MouseEvent<HTMLElement>) {
  e.currentTarget.style.borderColor = "rgba(99,102,241,0.15)";
  e.currentTarget.style.background = "rgba(99,102,241,0.04)";
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ForYouPage() {
  const router = useRouter();
  const { me, projects, starredIds, touchRecent, toggleStar, cycleProjectStatus } =
    useProjects();

  const myProjects = projects.filter((p) => p.owner_id === me?.id);
  const sharedProjects = projects.filter((p) => p.owner_id !== me?.id);
  const activeProjects = projects.filter((p) => p.status === "IN_PROGRESS");
  const doneProjects = projects.filter((p) => p.status === "DONE");

  function navigate(id: string) {
    touchRecent(id);
    router.push(`/projects/${id}`);
  }

  const stats = [
    { label: "Total projects", value: projects.length, sub: "across all workspaces" },
    { label: "In progress", value: activeProjects.length, sub: "currently active" },
    { label: "Completed", value: doneProjects.length, sub: "shipped & closed" },
    { label: "Collaborations", value: sharedProjects.length, sub: "shared with you" },
  ];

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <LampStrip />
      <div style={{ padding: "36px 28px", maxWidth: 1000, margin: "0 auto", position: "relative", zIndex: 1 }}>

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 32 }}
      >
        <ShimmerText style={{ fontSize: 28, fontWeight: 900, color: "var(--foreground)" }}>
          Hello, {me?.full_name?.split(" ")[0] || "there"}!
        </ShimmerText>
      </motion.div>

      {/* Stat cards */}
      {projects.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12, marginBottom: 40,
        }}>
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              style={{
                borderRadius: 16, border: "1px solid rgba(99,102,241,0.18)",
                background: "rgba(99,102,241,0.05)", backdropFilter: "blur(12px)",
                padding: "20px 22px", position: "relative", overflow: "hidden",
              }}
            >
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "linear-gradient(135deg, rgba(99,102,241,0.07) 0%, transparent 60%)",
                borderRadius: 16,
              }} />
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--foreground)", lineHeight: 1, marginBottom: 6 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 2 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 11, opacity: 0.4, color: "var(--foreground)" }}>
                {s.sub}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* My projects */}
      {myProjects.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, opacity: 0.45, textTransform: "uppercase",
            letterSpacing: "0.06em", marginBottom: 14, color: "var(--foreground)",
          }}>
            My projects
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {myProjects.map((p, i) => {
              const sc = PROJECT_STATUS_COLORS[p.status];
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  whileHover={{ y: -2 }}
                  onClick={() => navigate(p.id)}
                  style={cardStyle}
                  onMouseEnter={onHoverEnter}
                  onMouseLeave={onHoverLeave}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {p.title}
                    </div>
                    <HeartButton liked={starredIds.includes(p.id)} onToggle={() => toggleStar(p.id)} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); cycleProjectStatus(p); }}
                      style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
                        border: `1px solid ${sc}35`, background: `${sc}18`, color: sc,
                        cursor: "pointer", letterSpacing: "0.03em", transition: "all 0.15s",
                      }}
                    >
                      {p.status.replace(/_/g, " ")}
                    </button>
                    <span style={{ fontSize: 11, opacity: 0.4, color: "var(--foreground)" }}>
                      Due {p.target_due_date}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Template picker */}
      <TemplatePicker />

      {/* Shared with me */}
      {sharedProjects.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, opacity: 0.45, textTransform: "uppercase",
            letterSpacing: "0.06em", marginBottom: 14, color: "var(--foreground)",
          }}>
            Shared with me
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {sharedProjects.map((p, i) => {
              const sc = PROJECT_STATUS_COLORS[p.status];
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  whileHover={{ y: -2 }}
                  onClick={() => navigate(p.id)}
                  style={cardStyle}
                  onMouseEnter={onHoverEnter}
                  onMouseLeave={onHoverLeave}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {p.title}
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "rgba(99,102,241,0.12)", color: "var(--accent-light)", fontWeight: 700, flexShrink: 0 }}>
                      shared
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
                      border: `1px solid ${sc}35`, background: `${sc}18`, color: sc, letterSpacing: "0.03em",
                    }}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.4, color: "var(--foreground)" }}>
                      Due {p.target_due_date}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {projects.length === 0 && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              display: "grid", placeItems: "center", padding: "48px 0 32px",
              opacity: 0.38, fontSize: 14, color: "var(--foreground)",
            }}
          >
            No projects yet. Create one using the sidebar or start from a template below.
          </motion.div>
          <TemplatePicker />
        </>
      )}
      </div>
    </div>
  );
}
