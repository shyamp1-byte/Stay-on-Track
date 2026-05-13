"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { API_BASE } from "../../api-client/http";

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {lines.map((line, i) => {
        const isBullet = /^[-*]\s/.test(line);
        const content = isBullet ? line.replace(/^[-*]\s/, "") : line;
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return <span key={j}>{part}</span>;
        });
        if (isBullet) {
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ opacity: 0.5, flexShrink: 0, marginTop: 1 }}>•</span>
              <span>{parts}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} style={{ height: 4 }} />;
        return <div key={i}>{parts}</div>;
      })}
    </div>
  );
}

type Role = "user" | "assistant";
type Message = { role: Role; content: string };

type Props = {
  projectId?: string;
  onTasksChanged?: () => void;
  onProjectsChanged?: () => void;
};

const HISTORY_KEY = "sot_chat_history";

export default function ChatPanel({ projectId, onTasksChanged, onProjectsChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // SSR guard — portals need document
  useEffect(() => { setMounted(true); }, []);

  // Load persisted history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  // Save history on every change
  useEffect(() => {
    try {
      if (history.length === 0) localStorage.removeItem(HISTORY_KEY);
      else localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {}
  }, [history]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, statusText]);

  function clearHistory() {
    setHistory([]);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setInput("");
    setLoading(true);
    setStatusText("");

    const historyToSend = newHistory.slice(0, -1);
    let assistantText = "";

    try {
      const endpoint = projectId
        ? `${API_BASE}/projects/${projectId}/chat`
        : `${API_BASE}/chat`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, history: historyToSend }),
      });

      if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let event: { type: string; text?: string };
          try { event = JSON.parse(raw); } catch { continue; }

          if (event.type === "status" && event.text) {
            setStatusText(event.text);
          } else if (event.type === "delta" && event.text) {
            assistantText += event.text;
            setHistory([...newHistory, { role: "assistant", content: assistantText }]);
            setStatusText("");
          } else if (event.type === "tasks_changed") {
            onTasksChanged?.();
          } else if (event.type === "projects_changed") {
            onProjectsChanged?.();
          } else if (event.type === "error" && event.text) {
            assistantText = `Error: ${event.text}`;
            setHistory([...newHistory, { role: "assistant", content: assistantText }]);
          }
        }
      }
    } catch (e: any) {
      assistantText = `Error: ${e?.message ?? String(e)}`;
      setHistory([...newHistory, { role: "assistant", content: assistantText }]);
    } finally {
      setLoading(false);
      setStatusText("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!mounted) return null;

  const fab = (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 1000 }}>
      {/* Pulsing ring when AI is busy in the background */}
      {loading && !open && (
        <span style={{
          position: "absolute", inset: -6, borderRadius: "50%",
          border: "2px solid #a78bfa",
          animation: "sotFabPulse 1.2s ease-out infinite",
          pointerEvents: "none",
        }} />
      )}
      <button
        onClick={() => setOpen(true)}
        title="AI Assistant"
        style={{
          width: 60, height: 60, borderRadius: "50%", border: "none",
          background: "linear-gradient(135deg, #3b1f6e, #4c3099)",
          cursor: "pointer", boxShadow: "0 4px 20px rgba(99,102,241,0.5)",
          display: "grid", placeItems: "center",
          transition: "transform 0.15s, box-shadow 0.15s",
          padding: 0, overflow: "hidden", position: "relative",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow = "0 6px 26px rgba(99,102,241,0.65)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.5)";
        }}
      >
        <img src="/ai chatbot.png" alt="AI Assistant" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: "50%" }} />
      </button>
    </div>
  );

  const panel = open ? (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 1001 }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 400,
        background: "var(--background, #fff)", color: "var(--foreground, #111)",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.15)", zIndex: 1002,
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid rgba(99,102,241,0.2)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/ai chatbot.png" alt="AI" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>Chat with an AI agent!</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                title="Clear chat"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "inherit", opacity: 0.35, fontSize: 11, padding: "2px 6px",
                  borderRadius: 6, fontWeight: 600,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.35")}
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "inherit", opacity: 0.5, fontSize: 22, lineHeight: 1, padding: 4,
              }}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {history.length === 0 && (
            <div style={{ color: "var(--foreground, #111)", opacity: 0.4, fontSize: 14, textAlign: "center", marginTop: 40 }}>
              <img src="/ai chatbot.png" alt="AI" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", marginBottom: 12 }} />
              <div style={{ fontWeight: 500, marginBottom: 8 }}>
                {projectId ? "Ask me anything about this project" : "Ask me anything about your projects"}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.7 }}>
                {projectId ? (
                  <>"What tasks are overdue?"<br />"Create a task to write tests"<br />"Move task X to Done"</>
                ) : (
                  <>"Show me all my projects"<br />"Create a project with tasks"<br />"What projects are in progress?"</>
                )}
              </div>
            </div>
          )}

          {history.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "85%", padding: "10px 14px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user" ? "#6366f1" : "rgba(99,102,241,0.1)",
                color: msg.role === "user" ? "#fff" : "var(--foreground, #111)",
                fontSize: 14, lineHeight: 1.6, wordBreak: "break-word",
              }}>
                {msg.role === "assistant" ? <MarkdownText text={msg.content} /> : msg.content}
              </div>
            </div>
          ))}

          {statusText && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.55, fontSize: 13 }}>
              <span style={{
                display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                background: "#6366f1", animation: "sotPulse 1.2s ease-in-out infinite",
              }} />
              {statusText}
            </div>
          )}

          {loading && !statusText && (
            <div style={{ display: "flex", gap: 4, alignItems: "center", paddingLeft: 4 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "rgba(99,102,241,0.5)", display: "inline-block",
                  animation: `sotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 16px", borderTop: "1px solid rgba(99,102,241,0.2)",
          flexShrink: 0, display: "flex", gap: 8, alignItems: "flex-end",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything… (Enter to send)"
            rows={1}
            style={{
              flex: 1, resize: "none", border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: 10, padding: "10px 12px", fontSize: 14, lineHeight: 1.5,
              outline: "none", fontFamily: "inherit", maxHeight: 120, overflowY: "auto",
              background: "rgba(99,102,241,0.05)", color: "var(--foreground, #111)",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              padding: "10px 16px", borderRadius: 10, border: "none",
              background: loading || !input.trim() ? "rgba(99,102,241,0.15)" : "linear-gradient(135deg, #7c3aed, #6366f1)",
              color: loading || !input.trim() ? "rgba(99,102,241,0.4)" : "#fff",
              fontWeight: 600, fontSize: 14,
              cursor: loading || !input.trim() ? "default" : "pointer",
              flexShrink: 0, transition: "all 0.15s",
            }}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sotPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        @keyframes sotBounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
        @keyframes sotFabPulse { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(1.6); opacity: 0; } }
      `}</style>
    </>
  ) : null;

  return createPortal(<>{fab}{panel}</>, document.body);
}
