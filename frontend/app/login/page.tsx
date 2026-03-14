"use client";

import { useState } from "react";
import { apiFetch } from "../api-client/http";
import { GradientButton } from "../../components/ui/gradient-button";

function InputField({
  label, placeholder, value, type = "text", onChange, onKeyDown,
}: {
  label: string; placeholder: string; value: string; type?: string;
  onChange: (v: string) => void; onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--foreground)", opacity: 0.6, letterSpacing: "0.03em" }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "11px 14px", borderRadius: 10, boxSizing: "border-box",
          border: `1.5px solid ${focused ? "rgba(124,58,237,0.6)" : "var(--border)"}`,
          background: focused ? "rgba(99,102,241,0.09)" : "var(--input-bg)",
          color: "var(--foreground)", outline: "none", fontSize: 14,
          transition: "border-color 0.15s, background 0.15s",
          boxShadow: focused ? "0 0 0 3px rgba(124,58,237,0.12)" : "none",
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr]           = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    try {
      setLoading(true);
      setErr("");
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      window.location.href = "/projects";
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !loading && !!email.trim() && !!password;

  return (
    <div style={{
      minHeight: "100dvh", display: "grid", placeItems: "center",
      background: "var(--background)", position: "relative", overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 70%)",
      }} />

      <div style={{ width: "100%", maxWidth: 420, margin: "0 16px", position: "relative", zIndex: 1 }}>
        {/* Logo + heading above card */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 48, height: 48, borderRadius: 14,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            boxShadow: "0 8px 24px rgba(124,58,237,0.40)",
            fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em",
            marginBottom: 16,
          }}>ST</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            Welcome back
          </div>
          <div style={{ fontSize: 14, color: "var(--accent-light)", opacity: 0.75, marginTop: 6 }}>
            Sign in to your StratoTrack account
          </div>
        </div>

        {/* Card */}
        <div style={{
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "28px 32px",
          background: "var(--card-bg)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}>
          <div style={{ display: "grid", gap: 14 }}>
            <InputField label="Email" placeholder="jane@example.com" value={email} onChange={setEmail}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            <InputField label="Password" placeholder="Your password" value={password} type="password"
              onChange={setPassword} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />

            {err && (
              <div style={{
                padding: "10px 14px", borderRadius: 10,
                border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)",
                fontSize: 13, color: "#ef4444", lineHeight: 1.4,
              }}>
                {err}
              </div>
            )}

            <GradientButton
              onClick={handleLogin}
              disabled={!canSubmit}
              size="sm"
              style={{ width: "100%", borderRadius: 10, marginTop: 2, justifyContent: "center" }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </GradientButton>
          </div>
        </div>

        {/* Footer links */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, fontSize: 13 }}>
          <a href="/signup" style={{ textDecoration: "none", color: "var(--accent-light)", opacity: 0.75 }}>
            No account? Sign up →
          </a>
          <a href="/" style={{ textDecoration: "none", color: "var(--foreground)", opacity: 0.35 }}>
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
