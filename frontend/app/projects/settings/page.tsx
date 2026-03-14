"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { User, Lock, Palette, Bell, Trash2, ChevronRight, Check, X, Eye, EyeOff } from "lucide-react";
import { apiFetch, logout } from "../../api-client/http";
import { useProjects } from "../ProjectsContext";
import { PageTransition } from "@/components/ui/page-transition";

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = "profile" | "security" | "appearance" | "notifications" | "danger";

const NAV: { key: Section; label: string; icon: React.ElementType; danger?: boolean }[] = [
  { key: "profile",       label: "Profile",       icon: User },
  { key: "security",      label: "Security",      icon: Lock },
  { key: "appearance",    label: "Appearance",    icon: Palette },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "danger",        label: "Danger zone",   icon: Trash2, danger: true },
];

// ─── Reusable field ───────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, opacity: 0.45,
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
        color: "var(--foreground)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 9, boxSizing: "border-box",
  border: "1px solid rgba(99,102,241,0.22)", background: "rgba(99,102,241,0.05)",
  color: "var(--foreground)", outline: "none", fontSize: 14, fontFamily: "inherit",
  transition: "border-color 0.15s",
};

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width: 42, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
        background: on ? "linear-gradient(135deg,#7c3aed,#6366f1)" : "rgba(99,102,241,0.15)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
        padding: 0,
      }}
    >
      <motion.div
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          position: "absolute", top: 2, left: 0,
          width: 20, height: 20, borderRadius: 999,
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
        background: ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
        border: `1px solid ${ok ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
        color: ok ? "#4ade80" : "#f87171",
        borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 600,
        backdropFilter: "blur(10px)", zIndex: 9999,
        display: "flex", alignItems: "center", gap: 8,
      }}
    >
      {ok ? <Check size={14} /> : <X size={14} />}
      {msg}
    </motion.div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────
function ProfileSection({ onToast }: { onToast: (msg: string, ok: boolean) => void }) {
  const { me, setMe } = useProjects();
  const nameParts = (me?.full_name ?? "").split(" ");
  const [firstName, setFirstName] = useState(nameParts[0] ?? "");
  const [lastName, setLastName] = useState(nameParts.slice(1).join(" ") ?? "");
  const [email, setEmail] = useState(me?.email ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const full_name = `${firstName.trim()} ${lastName.trim()}`.trim();
      const updated = await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: full_name || undefined,
          email: email !== me?.email ? email : undefined,
        }),
      });
      setMe(updated as typeof me);
      onToast("Profile updated", true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      onToast(msg.includes("409") ? "Email already in use" : "Failed to save", false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={sectionTitle}>Profile</h2>
      <p style={sectionSubtitle}>Update your name and email address.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="First name">
          <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.6)")}
            onBlur={e => (e.target.style.borderColor = "rgba(99,102,241,0.22)")} />
        </Field>
        <Field label="Last name">
          <input value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.6)")}
            onBlur={e => (e.target.style.borderColor = "rgba(99,102,241,0.22)")} />
        </Field>
      </div>
      <Field label="Email address">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle}
          onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.6)")}
          onBlur={e => (e.target.style.borderColor = "rgba(99,102,241,0.22)")} />
      </Field>
      <div style={{ fontSize: 11, opacity: 0.4, color: "var(--foreground)", marginBottom: 20 }}>
        Member since {me?.created_at ? new Date(me.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
      </div>
      <SaveButton saving={saving} onClick={save} />
    </div>
  );
}

function SecuritySection({ onToast }: { onToast: (msg: string, ok: boolean) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!current || !next) return onToast("Fill in all fields", false);
    if (next.length < 8) return onToast("New password must be at least 8 characters", false);
    if (next !== confirm) return onToast("Passwords don't match", false);
    setSaving(true);
    try {
      await apiFetch("/auth/me/password", {
        method: "POST",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      setCurrent(""); setNext(""); setConfirm("");
      onToast("Password changed", true);
    } catch {
      onToast("Current password is incorrect", false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={sectionTitle}>Security</h2>
      <p style={sectionSubtitle}>Change your password. We recommend using a strong, unique password.</p>
      <Field label="Current password">
        <div style={{ position: "relative" }}>
          <input type={showCurrent ? "text" : "password"} value={current} onChange={e => setCurrent(e.target.value)}
            style={{ ...inputStyle, paddingRight: 40 }}
            onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.6)")}
            onBlur={e => (e.target.style.borderColor = "rgba(99,102,241,0.22)")} />
          <button type="button" onClick={() => setShowCurrent(v => !v)}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--foreground)", opacity: 0.4 }}>
            {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </Field>
      <Field label="New password">
        <div style={{ position: "relative" }}>
          <input type={showNext ? "text" : "password"} value={next} onChange={e => setNext(e.target.value)}
            style={{ ...inputStyle, paddingRight: 40 }}
            onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.6)")}
            onBlur={e => (e.target.style.borderColor = "rgba(99,102,241,0.22)")} />
          <button type="button" onClick={() => setShowNext(v => !v)}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--foreground)", opacity: 0.4 }}>
            {showNext ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {next && next.length < 8 && (
          <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>At least 8 characters</div>
        )}
      </Field>
      <Field label="Confirm new password">
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          style={{ ...inputStyle, borderColor: confirm && confirm !== next ? "rgba(239,68,68,0.5)" : undefined }}
          onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.6)")}
          onBlur={e => (e.target.style.borderColor = confirm !== next ? "rgba(239,68,68,0.5)" : "rgba(99,102,241,0.22)")} />
        {confirm && confirm !== next && (
          <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>Passwords don&apos;t match</div>
        )}
      </Field>
      <SaveButton saving={saving} onClick={save} label="Change password" />
    </div>
  );
}

function AppearanceSection() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof document !== "undefined") return document.documentElement.classList.contains("light") ? "light" : "dark";
    return "dark";
  });

  function applyTheme(t: "dark" | "light") {
    setTheme(t);
    document.documentElement.classList.toggle("light", t === "light");
    document.documentElement.classList.toggle("dark", t === "dark");
  }

  return (
    <div>
      <h2 style={sectionTitle}>Appearance</h2>
      <p style={sectionSubtitle}>Customize how Strato Track looks for you.</p>
      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
        {(["dark", "light"] as const).map(t => (
          <button key={t} type="button" onClick={() => applyTheme(t)}
            style={{
              flex: 1, padding: "20px 16px", borderRadius: 12, cursor: "pointer",
              border: `2px solid ${theme === t ? "rgba(124,58,237,0.7)" : "rgba(99,102,241,0.16)"}`,
              background: theme === t ? "rgba(124,58,237,0.10)" : "rgba(99,102,241,0.04)",
              color: "var(--foreground)", transition: "all 0.15s", display: "flex",
              flexDirection: "column", alignItems: "center", gap: 8,
            }}>
            <div style={{
              width: 48, height: 32, borderRadius: 7,
              background: t === "dark" ? "#0d1117" : "#f0f4ff",
              border: "1px solid rgba(99,102,241,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 28, height: 4, borderRadius: 2, background: t === "dark" ? "#7c3aed" : "#6366f1", opacity: 0.8 }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{t}</span>
            {theme === t && <Check size={13} style={{ color: "#a78bfa" }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    taskAssigned: true,
    dueDateReminder: true,
    projectUpdates: false,
    weeklyDigest: false,
  });

  const items: { key: keyof typeof prefs; label: string; desc: string }[] = [
    { key: "taskAssigned",    label: "Task assignments",   desc: "When a task is assigned to you" },
    { key: "dueDateReminder", label: "Due date reminders", desc: "24 hours before a task is due" },
    { key: "projectUpdates",  label: "Project updates",    desc: "When project status changes" },
    { key: "weeklyDigest",    label: "Weekly digest",      desc: "A summary of your week every Monday" },
  ];

  return (
    <div>
      <h2 style={sectionTitle}>Notifications</h2>
      <p style={sectionSubtitle}>Choose what you&apos;d like to be notified about.</p>
      <div style={{ display: "grid", gap: 2, marginTop: 8 }}>
        {items.map(item => (
          <div key={item.key} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderRadius: 10,
            background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.10)",
            marginBottom: 8,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{item.label}</div>
              <div style={{ fontSize: 12, opacity: 0.45, color: "var(--foreground)", marginTop: 2 }}>{item.desc}</div>
            </div>
            <Toggle on={prefs[item.key]} onChange={v => setPrefs(p => ({ ...p, [item.key]: v }))} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, opacity: 0.35, color: "var(--foreground)", marginTop: 8 }}>
        Email notifications are coming soon.
      </div>
    </div>
  );
}

function DangerSection({ onToast }: { onToast: (msg: string, ok: boolean) => void }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { me } = useProjects();
  const expected = me?.email ?? "";

  async function handleDelete() {
    if (confirm !== expected) return onToast("Type your email to confirm", false);
    setDeleting(true);
    try {
      await apiFetch("/auth/me", { method: "DELETE" });
      router.push("/");
    } catch {
      onToast("Failed to delete account", false);
      setDeleting(false);
    }
  }

  return (
    <div>
      <h2 style={{ ...sectionTitle, color: "#ef4444" }}>Danger zone</h2>
      <p style={sectionSubtitle}>Permanently delete your account and all associated data. This cannot be undone.</p>
      <div style={{
        marginTop: 16, padding: "20px", borderRadius: 12,
        border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>Delete account</div>
        <div style={{ fontSize: 13, opacity: 0.6, color: "var(--foreground)", marginBottom: 16, lineHeight: 1.5 }}>
          All your projects, tasks, and data will be permanently removed. Type your email address to confirm.
        </div>
        <Field label={`Type "${expected}" to confirm`}>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder={expected}
            style={{ ...inputStyle, borderColor: "rgba(239,68,68,0.3)" }}
            onFocus={e => (e.target.style.borderColor = "rgba(239,68,68,0.6)")}
            onBlur={e => (e.target.style.borderColor = "rgba(239,68,68,0.3)")}
          />
        </Field>
        <button
          onClick={handleDelete}
          disabled={deleting || confirm !== expected}
          style={{
            padding: "9px 20px", borderRadius: 9, border: "none", cursor: confirm === expected ? "pointer" : "not-allowed",
            background: confirm === expected ? "#ef4444" : "rgba(239,68,68,0.15)",
            color: confirm === expected ? "#fff" : "rgba(239,68,68,0.4)",
            fontWeight: 700, fontSize: 13, transition: "all 0.15s",
          }}
        >
          {deleting ? "Deleting…" : "Delete my account"}
        </button>
      </div>
    </div>
  );
}

// ─── Save button ──────────────────────────────────────────────────────────────
function SaveButton({ saving, onClick, label = "Save changes" }: { saving: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        padding: "9px 22px", borderRadius: 9, border: "none", cursor: "pointer",
        background: "linear-gradient(135deg,#7c3aed,#6366f1)",
        color: "#fff", fontWeight: 700, fontSize: 13,
        opacity: saving ? 0.6 : 1, transition: "opacity 0.15s",
        boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
      }}
    >
      {saving ? "Saving…" : label}
    </button>
  );
}

// ─── Section title styles ─────────────────────────────────────────────────────
const sectionTitle: React.CSSProperties = {
  fontSize: 18, fontWeight: 800, color: "var(--foreground)", marginBottom: 4, marginTop: 0,
};
const sectionSubtitle: React.CSSProperties = {
  fontSize: 13, opacity: 0.5, color: "var(--foreground)", marginBottom: 24, marginTop: 0, lineHeight: 1.5,
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [active, setActive] = useState<Section>("profile");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  const sectionContent: Record<Section, React.ReactNode> = {
    profile:       <ProfileSection onToast={showToast} />,
    security:      <SecuritySection onToast={showToast} />,
    appearance:    <AppearanceSection />,
    notifications: <NotificationsSection />,
    danger:        <DangerSection onToast={showToast} />,
  };

  return (
    <PageTransition>
      <div style={{ padding: "40px 28px", maxWidth: 860, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--foreground)", marginBottom: 6, marginTop: 0 }}>Settings</h1>
        <p style={{ fontSize: 14, opacity: 0.45, color: "var(--foreground)", marginBottom: 36, marginTop: 0 }}>
          Manage your account, security, and preferences.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 28, alignItems: "start" }}>
          {/* Nav */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map(item => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActive(item.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer",
                    background: isActive ? (item.danger ? "rgba(239,68,68,0.10)" : "rgba(99,102,241,0.14)") : "transparent",
                    color: isActive ? (item.danger ? "#f87171" : "var(--foreground)") : (item.danger ? "rgba(239,68,68,0.7)" : "var(--foreground)"),
                    fontWeight: isActive ? 700 : 500, fontSize: 13,
                    opacity: isActive ? 1 : item.danger ? 0.7 : 0.65,
                    transition: "all 0.15s", textAlign: "left",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = item.danger ? "rgba(239,68,68,0.06)" : "rgba(99,102,241,0.07)"; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  {item.label}
                  {isActive && <ChevronRight size={13} style={{ marginLeft: "auto", opacity: 0.5 }} />}
                </button>
              );
            })}
          </nav>

          {/* Content panel */}
          <div style={{
            background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.12)",
            borderRadius: 14, padding: "28px 28px 32px",
            minHeight: 340,
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                {sectionContent[active]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} ok={toast.ok} />}
      </AnimatePresence>
    </PageTransition>
  );
}
