"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../api-client/http";
import { GradientButton } from "../../components/ui/gradient-button";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token  = params.get("token") ?? "";

  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [loading, setLoading]           = useState(false);
  const [done, setDone]                 = useState(false);
  const [err, setErr]                   = useState("");
  const [focusedPw, setFocusedPw]       = useState(false);
  const [focusedCfm, setFocusedCfm]     = useState(false);

  useEffect(() => {
    if (!token) setErr("Missing or invalid reset link. Please request a new one.");
  }, [token]);

  async function handleReset() {
    if (!password || !confirm) return;
    if (password.length < 8) { setErr("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setErr("Passwords don't match"); return; }
    setLoading(true);
    setErr("");
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      setDone(true);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("400")) {
        setErr("This reset link is invalid or has expired. Please request a new one.");
      } else {
        setErr("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: "100%", padding: "11px 14px", borderRadius: 10, boxSizing: "border-box",
    border: `1.5px solid ${focused ? "rgba(124,58,237,0.6)" : "var(--border)"}`,
    background: focused ? "rgba(99,102,241,0.09)" : "var(--input-bg)",
    color: "var(--foreground)", outline: "none", fontSize: 14,
    transition: "border-color 0.15s, background 0.15s",
    boxShadow: focused ? "0 0 0 3px rgba(124,58,237,0.12)" : "none",
  });

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
            {done ? "Password reset" : "Set a new password"}
          </div>
          <div style={{ fontSize: 14, color: "var(--accent-light)", opacity: 0.75, marginTop: 6 }}>
            {done ? "You're all set" : "Choose a strong password for your account"}
          </div>
        </div>

        <div style={{
          border: "1px solid var(--border)", borderRadius: 20, padding: "28px 32px",
          background: "var(--card-bg)", backdropFilter: "blur(20px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <p style={{ fontSize: 14, color: "var(--foreground)", opacity: 0.7, lineHeight: 1.6, margin: "0 0 20px" }}>
                Your password has been updated. You can now sign in with your new password.
              </p>
              <a href="/login" style={{
                display: "inline-block", padding: "9px 22px", borderRadius: 9,
                background: "linear-gradient(135deg,#7c3aed,#6366f1)", color: "#fff",
                textDecoration: "none", fontWeight: 700, fontSize: 13,
              }}>
                Sign in
              </a>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--foreground)", opacity: 0.6, letterSpacing: "0.03em" }}>
                  New password
                </label>
                <input
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReset()}
                  onFocus={() => setFocusedPw(true)}
                  onBlur={() => setFocusedPw(false)}
                  style={inputStyle(focusedPw)}
                />
                {password && password.length < 8 && (
                  <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>At least 8 characters</div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--foreground)", opacity: 0.6, letterSpacing: "0.03em" }}>
                  Confirm password
                </label>
                <input
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReset()}
                  onFocus={() => setFocusedCfm(true)}
                  onBlur={() => setFocusedCfm(false)}
                  style={{
                    ...inputStyle(focusedCfm),
                    borderColor: confirm && confirm !== password ? "rgba(239,68,68,0.5)" : undefined,
                  }}
                />
                {confirm && confirm !== password && (
                  <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>Passwords don&apos;t match</div>
                )}
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
                onClick={handleReset}
                disabled={!token || !password || !confirm || loading}
                size="sm"
                style={{ width: "100%", borderRadius: 10, justifyContent: "center" }}
              >
                {loading ? "Updating…" : "Update password"}
              </GradientButton>
            </div>
          )}
        </div>

        {!done && (
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13 }}>
            <a href="/forgot-password" style={{ textDecoration: "none", color: "var(--accent-light)", opacity: 0.75 }}>
              Request a new link
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
