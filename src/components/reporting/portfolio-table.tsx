"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { Health, PortfolioRow } from "@/types";
import {
  distinct,
  filterPortfolio,
  portfolioToCsv,
  type PortfolioFilter,
} from "@/lib/portfolio";

const DOT: Record<Health, string> = { green: "bg-green", amber: "bg-amber", red: "bg-red" };

const statusTone: Record<string, string> = {
  not_started: "text-dim",
  in_progress: "text-accent",
  blocked: "text-red",
  complete: "text-green",
};

const selectClass =
  "rounded-md border border-border bg-panel px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none";

/**
 * The cross-project portfolio rollup table (ADR-0069 D5, #350). One screen lists
 * every project with its rolled-up health and next milestone; filters narrow by
 * account/owner/type/health, and Export downloads the filtered view as CSV. Pure
 * client-side filter/export over the read model — no writes, no server round-trip.
 */
export function PortfolioTable({ rows }: { rows: PortfolioRow[] }) {
  const [filter, setFilter] = useState<PortfolioFilter>({ activeOnly: true });

  // Facet options come from the full (unfiltered) set so a filter never hides
  // its own valid choices.
  const accounts = useMemo(() => distinct(rows.map((r) => r.account)), [rows]);
  const owners = useMemo(() => distinct(rows.map((r) => r.owner)), [rows]);
  const types = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) if (!seen.has(r.typeKey)) seen.set(r.typeKey, r.type);
    return Array.from(seen, ([key, name]) => ({ key, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [rows]);

  const filtered = useMemo(() => filterPortfolio(rows, filter), [rows, filter]);

  function exportCsv() {
    const blob = new Blob([portfolioToCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const set = (patch: Partial<PortfolioFilter>) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={selectClass}
          value={filter.account ?? ""}
          onChange={(e) => set({ account: e.target.value })}
          aria-label="Filter by account"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filter.owner ?? ""}
          onChange={(e) => set({ owner: e.target.value })}
          aria-label="Filter by owner"
        >
          <option value="">All owners</option>
          <option value="__unassigned__">Unassigned</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filter.typeKey ?? ""}
          onChange={(e) => set({ typeKey: e.target.value })}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={filter.health ?? ""}
          onChange={(e) => set({ health: e.target.value as PortfolioFilter["health"] })}
          aria-label="Filter by health"
        >
          <option value="">All health</option>
          <option value="green">Green</option>
          <option value="amber">Amber</option>
          <option value="red">Red</option>
          <option value="__none__">No milestones</option>
        </select>

        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-dim">
          <input
            type="checkbox"
            checked={filter.activeOnly ?? false}
            onChange={(e) => set({ activeOnly: e.target.checked })}
            className="accent-accent"
          />
          Active only
        </label>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-dim">
            {filtered.length} of {rows.length}
          </span>
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="rounded-md border border-border bg-panel px-3 py-1.5 text-sm text-text transition-colors hover:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-dim">
              <th className="px-3 py-2 font-medium">Health</th>
              <th className="px-3 py-2 font-medium">Project</th>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Owner</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Milestones</th>
              <th className="px-3 py-2 font-medium">Next milestone</th>
              <th className="px-3 py-2 font-medium">Target go-live</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-dim">
                  No projects match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2">
                    {r.health ? (
                      <span
                        className={cn("inline-block h-2.5 w-2.5 rounded-full", DOT[r.health])}
                        title={`Health: ${r.health}`}
                      />
                    ) : (
                      <span className="text-dim" title="No milestones">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-dim">{r.account}</td>
                  <td className="px-3 py-2 text-dim">{r.type}</td>
                  <td className="px-3 py-2 text-dim">{r.owner ?? "—"}</td>
                  <td className={cn("px-3 py-2", statusTone[r.status] ?? "text-dim")}>
                    {r.status.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-2 text-dim">
                    {r.milestoneTotal > 0 ? `${r.milestoneDone}/${r.milestoneTotal}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {r.nextMilestone ? (
                      <span>
                        {r.nextMilestone}
                        {r.nextMilestoneDue && (
                          <span className="ml-1 text-xs text-dim">· {r.nextMilestoneDue}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-dim">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-dim">{r.targetLive ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
