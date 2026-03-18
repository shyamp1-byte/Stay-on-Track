"use client";

import { useState } from "react";
import { apiFetch, API_BASE } from "../api-client/http";
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
  const [googleLoading, setGoogleLoading] = useState(false);

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

  async function handleGoogleLogin() {
    try {
      setGoogleLoading(true);
      setErr("");
      const data = await apiFetch("/auth/google/authorize");
      window.location.href = data.url;
    } catch (e: any) {
      const msg = String(e?.message || e);
      setErr(msg.includes("501") ? "Google sign-in is not configured yet" : "Google sign-in failed");
      setGoogleLoading(false);
    }
  }

  const canSubmit = !loading && !!email.trim() && !!password;

  return (
    <div style={{
      minHeight: "100dvh", display: "grid", placeItems: "center",
      background: "var(--background)", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 70%)",
      }} />

      <div style={{ width: "100%", maxWidth: 420, margin: "0 16px", position: "relative", zIndex: 1 }}>
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
            Sign in to your Stay on Track account
          </div>
        </div>

        <div style={{
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "28px 32px",
          background: "var(--card-bg)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}>
          {/* Google sign-in */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{
              width: "100%", padding: "10px 16px", borderRadius: 10, boxSizing: "border-box",
              border: "1.5px solid var(--border)", background: "rgba(255,255,255,0.04)",
              color: "var(--foreground)", fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              marginBottom: 16, transition: "background 0.15s",
              opacity: googleLoading ? 0.6 : 1,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.963L3.964 7.295C4.672 5.169 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)", opacity: 0.5 }} />
            <span style={{ fontSize: 12, opacity: 0.4, color: "var(--foreground)" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)", opacity: 0.5 }} />
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <InputField label="Email" placeholder="jane@example.com" value={email} onChange={setEmail}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()} />

            <div>
              <InputField label="Password" placeholder="Your password" value={password} type="password"
                onChange={setPassword} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
              <div style={{ textAlign: "right", marginTop: 6 }}>
                <a href="/forgot-password" style={{ fontSize: 12, color: "var(--accent-light)", opacity: 0.65, textDecoration: "none" }}>
                  Forgot password?
                </a>
              </div>
            </div>

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
