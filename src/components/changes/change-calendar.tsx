"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { buildMonth, bucketByDay, WEEKDAY_LABELS, type CalendarMonth } from "@/lib/calendar";
import {
  effectiveRisk,
  riskBand,
  RISK_BAND_LABEL,
  RISK_BAND_TONE,
  CHANGE_TYPE_LABEL,
  type RiskBand,
} from "@/lib/change";
import type { ChangeRequestSummary, ChangeType } from "@/types";

/**
 * Change calendar (#660, ADR-0079): the upcoming/scheduled changes laid onto a month grid by
 * their `schedule_start` day, via the SAME pure `buildMonth`/`bucketByDay` helpers the Tasks
 * calendar uses (#342) — so the grid arithmetic is shared and tested, not re-derived. Read-only
 * coordination/visibility: filterable by account / type / risk band, each change links to its
 * detail. Unscheduled changes never appear (no window ⇒ no cell). Month nav is client-side over
 * the already-loaded set (the page hands the full list; the estate of in-flight changes is small).
 */

/** Left-bar accent per risk-band tone (reuses the band→tone map so colours never drift). */
const TONE_BAR: Record<(typeof RISK_BAND_TONE)[RiskBand], string> = {
  red: "border-l-red",
  amber: "border-l-amber",
  accent: "border-l-accent",
  dim: "border-l-dim",
};

export function ChangeCalendar({
  changes,
  accounts,
  today,
}: {
  /** All changes (scheduled + not); the calendar filters to those with a window. */
  changes: ChangeRequestSummary[];
  /** Account filter options resolved server-side (id → name). */
  accounts: { id: string; name: string }[];
  /** ISO `yyyy-mm-dd` for "today", resolved server-side for SSR stability. */
  today: string;
}) {
  const [ym, setYm] = useState(today.slice(0, 7));
  const [account, setAccount] = useState("");
  const [type, setType] = useState<ChangeType | "">("");
  const [band, setBand] = useState<RiskBand | "">("");

  const [year, month] = ym.split("-").map(Number);
  const grid: CalendarMonth = buildMonth(year, month, today);

  const filtered = useMemo(
    () =>
      changes
        .filter((c) => Boolean(c.scheduleStart && c.scheduleEnd))
        .filter((c) => (account ? c.accountId === account : true))
        .filter((c) => (type ? c.changeType === type : true))
        .filter((c) => {
          if (!band) return true;
          const risk = effectiveRisk(c.riskDerived, c.riskOverride);
          return risk !== null && riskBand(risk) === band;
        }),
    [changes, account, type, band],
  );

  const byDay = bucketByDay(filtered, (c) => c.scheduleStart);

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-dim">
          Account
          <select
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-dim">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ChangeType | "")}
            className="rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text"
          >
            <option value="">All types</option>
            {(["standard", "normal", "emergency"] as ChangeType[]).map((t) => (
              <option key={t} value={t}>
                {CHANGE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-dim">
          Risk
          <select
            value={band}
            onChange={(e) => setBand(e.target.value as RiskBand | "")}
            className="rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text"
          >
            <option value="">All risk</option>
            {(["low", "moderate", "high", "critical"] as RiskBand[]).map((b) => (
              <option key={b} value={b}>
                {RISK_BAND_LABEL[b]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setYm(grid.prev)}
            className="rounded-md border border-border bg-panel px-2.5 py-1 text-sm text-dim transition-colors hover:text-text"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setYm(grid.next)}
            className="rounded-md border border-border bg-panel px-2.5 py-1 text-sm text-dim transition-colors hover:text-text"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setYm(today.slice(0, 7))}
            className="ml-1 rounded-md border border-border bg-panel px-2.5 py-1 text-xs text-dim transition-colors hover:text-text"
          >
            Today
          </button>
        </div>
        <span className="text-sm font-medium text-text">{grid.label}</span>
        <span className="text-xs text-dim">
          {filtered.length} scheduled change{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="px-2 py-1 text-center text-xs font-medium text-dim">
            {d}
          </div>
        ))}
      </div>

      {/* Grid: 6 weeks × 7 days */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {grid.weeks.flat().map((cell) => {
          const cards = byDay.get(cell.date) ?? [];
          return (
            <div
              key={cell.date}
              className={cn(
                "flex min-h-28 flex-col gap-1 p-1.5",
                cell.inMonth ? "bg-panel" : "bg-panel-2/40",
              )}
            >
              <div className="flex items-center justify-between px-0.5">
                <span
                  className={cn(
                    "text-xs",
                    cell.isToday
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-accent font-semibold text-white"
                      : cell.inMonth
                        ? "text-dim"
                        : "text-dim/50",
                  )}
                >
                  {cell.day}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {cards.map((c) => {
                  const risk = effectiveRisk(c.riskDerived, c.riskOverride);
                  const tone = risk !== null ? TONE_BAR[RISK_BAND_TONE[riskBand(risk)]] : "border-l-dim";
                  return (
                    <Link
                      key={c.id}
                      href={`/changes/${c.id}`}
                      className={cn(
                        "block truncate rounded border-l-2 bg-panel-2 px-1.5 py-1 text-[11px] text-text transition-opacity hover:bg-panel-2/80",
                        tone,
                      )}
                      title={`${c.title} · ${c.changeType}${
                        risk !== null ? ` · risk ${risk}/100` : ""
                      } · ${c.scheduleStart?.slice(11, 16) ?? ""}`}
                    >
                      {c.scheduleStart?.slice(11, 16)} {c.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-xs text-dim">
          No scheduled changes match these filters. Set a schedule window on a change to place it
          here.
        </p>
      )}
    </div>
  );
}
