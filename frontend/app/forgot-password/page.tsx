"use client";

import { useState } from "react";
import { apiFetch } from "../api-client/http";
import { GradientButton } from "../../components/ui/gradient-button";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [err, setErr]         = useState("");
  const [focused, setFocused] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    setErr("");
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
            Forgot your password?
          </div>
          <div style={{ fontSize: 14, color: "var(--accent-light)", opacity: 0.75, marginTop: 6 }}>
            {sent ? "Check your inbox" : "Enter your email and we'll send you a reset link"}
          </div>
        </div>

        <div style={{
          border: "1px solid var(--border)", borderRadius: 20, padding: "28px 32px",
          background: "var(--card-bg)", backdropFilter: "blur(20px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}>
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
              <p style={{ fontSize: 14, color: "var(--foreground)", opacity: 0.7, lineHeight: 1.6, margin: "0 0 20px" }}>
                If <strong style={{ opacity: 1 }}>{email}</strong> is associated with a Stay on Track account,
                you'll receive a reset link shortly. Check your spam folder if it doesn't arrive.
              </p>
              <a href="/login" style={{
                display: "inline-block", padding: "9px 22px", borderRadius: 9,
                background: "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#fff",
                textDecoration: "none", fontWeight: 700, fontSize: 13,
              }}>
                Back to sign in
              </a>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--foreground)", opacity: 0.6, letterSpacing: "0.03em" }}>
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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

              {err && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)",
                  fontSize: 13, color: "#ef4444",
                }}>
                  {err}
                </div>
              )}

              <GradientButton
                onClick={handleSubmit}
                disabled={!email.trim() || loading}
                size="sm"
                style={{ width: "100%", borderRadius: 10, justifyContent: "center" }}
              >
                {loading ? "Sending…" : "Send reset link"}
              </GradientButton>
            </div>
          )}
        </div>

        {!sent && (
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13 }}>
            <a href="/login" style={{ textDecoration: "none", color: "var(--accent-light)", opacity: 0.75 }}>
              ← Back to sign in
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
