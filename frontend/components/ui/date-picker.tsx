"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DatePickerProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (v: string) => void;
  style?: React.CSSProperties;
  placeholder?: string;
}

export function DatePicker({ value, onChange, style, placeholder = "Set date" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, openLeft: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const parsed = value ? new Date(value + "T00:00:00") : null;

  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => { setMounted(true); }, []);

  function openPicker() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const calW = 260;
    const calH = 300;
    // Prefer right side; fall back to left
    const spaceRight = window.innerWidth - rect.right - 10;
    const openLeft = spaceRight < calW;
    const left = openLeft ? rect.left - calW - 8 : rect.right + 8;
    // Vertical: align top, clamp to viewport
    let top = rect.top;
    if (top + calH > window.innerHeight - 12) top = window.innerHeight - calH - 12;
    if (top < 8) top = 8;
    setPos({ top, left, openLeft });
    setOpen(true);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // Build calendar grid
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function selectDay(d: number) {
    const m = String(viewMonth + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    onChange(`${viewYear}-${m}-${dd}`);
    setOpen(false);
  }

  const selectedDay =
    parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth
      ? parsed.getDate()
      : null;
  const todayDay =
    today.getFullYear() === viewYear && today.getMonth() === viewMonth
      ? today.getDate()
      : null;

  const displayValue = parsed
    ? parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const enterX = pos.openLeft ? 8 : -8;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 10px", borderRadius: 8, cursor: "pointer",
          border: `1px solid ${open ? "rgba(99,102,241,0.45)" : "rgba(99,102,241,0.22)"}`,
          background: open ? "rgba(99,102,241,0.10)" : "rgba(99,102,241,0.05)",
          color: displayValue ? "var(--foreground)" : "rgba(160,160,180,0.7)",
          fontSize: 13, fontWeight: 500, width: "100%",
          transition: "background 0.15s, border-color 0.15s",
          outline: "none",
          ...style,
        }}
      >
        <Calendar size={13} style={{ opacity: 0.55, flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: "left" }}>{displayValue ?? placeholder}</span>
        {displayValue && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            style={{ opacity: 0.4, display: "flex", alignItems: "center", cursor: "pointer", padding: 2 }}
          >
            <X size={11} />
          </span>
        )}
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={pickerRef}
              initial={{ opacity: 0, scale: 0.94, x: enterX }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.94, x: enterX }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                zIndex: 99999,
                width: 260,
                background: "var(--background)",
                border: "1px solid rgba(99,102,241,0.22)",
                borderRadius: 14,
                boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(99,102,241,0.08)",
                padding: "14px 12px 10px",
                userSelect: "none",
              }}
            >
              {/* Month / Year header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={prevMonth}
                  style={navBtn}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.12)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  style={navBtn}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.12)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Weekday labels */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
                {WEEKDAYS.map(d => (
                  <div key={d} style={{
                    textAlign: "center", fontSize: 10, fontWeight: 700,
                    opacity: 0.3, color: "var(--foreground)", padding: "2px 0",
                  }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {cells.map((d, i) => {
                  const isSel = d !== null && d === selectedDay;
                  const isToday = d !== null && d === todayDay;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={d === null}
                      onClick={() => d && selectDay(d)}
                      style={{
                        width: "100%", aspectRatio: "1",
                        borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: isSel ? 700 : 500,
                        cursor: d ? "pointer" : "default",
                        border: isToday && !isSel ? "1px solid rgba(99,102,241,0.5)" : "1px solid transparent",
                        background: isSel ? "linear-gradient(135deg, #7c3aed, #6366f1)" : "transparent",
                        color: isSel ? "#fff" : d ? "var(--foreground)" : "transparent",
                        opacity: d ? 1 : 0,
                        outline: "none",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { if (!isSel && d) (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.14)"; }}
                      onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      {d ?? ""}
                    </button>
                  );
                })}
              </div>

              {/* "Today" shortcut */}
              <div style={{ marginTop: 10, borderTop: "1px solid rgba(99,102,241,0.10)", paddingTop: 8, display: "flex", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => {
                    const m = String(today.getMonth() + 1).padStart(2, "0");
                    const d = String(today.getDate()).padStart(2, "0");
                    onChange(`${today.getFullYear()}-${m}-${d}`);
                    setOpen(false);
                  }}
                  style={{
                    fontSize: 11, fontWeight: 600, color: "#a78bfa",
                    background: "transparent", border: "none", cursor: "pointer",
                    padding: "4px 8px", borderRadius: 6, opacity: 0.8,
                    transition: "opacity 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}
                >
                  Today
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

const navBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "transparent", border: "none", cursor: "pointer",
  color: "var(--foreground)", opacity: 0.65,
  transition: "background 0.12s",
  outline: "none",
};
