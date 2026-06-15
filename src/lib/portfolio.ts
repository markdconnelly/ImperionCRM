/**
 * Portfolio rollup — pure presentation/derivation helpers (ADR-0069 D5, #350).
 *
 * The cross-project portfolio view rolls up status/health/owner/target-date
 * across every project beyond today's per-type grouping. This module holds the
 * framework-free logic so it is unit-testable in the node env (vitest):
 * milestone-health rollup, filtering, and CSV export. The page/component read
 * `crm.listPortfolio()` and apply these.
 */
import type { Health, PortfolioRow } from "@/types";

/** A single milestone of a project, as read for the rollup. */
export interface PortfolioMilestone {
  status: string; // milestone_status: not_started|in_progress|blocked|complete
  health: Health; // stored milestone_health
  ordinal: number; // sibling order within the project
  name: string;
  due: string | null; // formatted due date
}

/**
 * Overall project health = the worst milestone health (red beats amber beats
 * green), mirroring the onboarding dashboard's project rollup. A project with no
 * milestones has no rolled-up signal → null (the row still lists, just dash-rated).
 */
export function rollupHealth(milestones: { health: Health }[]): Health | null {
  if (milestones.length === 0) return null;
  if (milestones.some((m) => m.health === "red")) return "red";
  if (milestones.some((m) => m.health === "amber")) return "amber";
  return "green";
}

/**
 * The next milestone = the earliest not-yet-complete milestone by ordinal. Used
 * for the "next milestone" column the acceptance criterion calls for. Returns
 * null when every milestone is complete (or there are none).
 */
export function nextMilestone(
  milestones: PortfolioMilestone[],
): PortfolioMilestone | null {
  const open = milestones
    .filter((m) => m.status !== "complete")
    .sort((a, b) => a.ordinal - b.ordinal);
  return open[0] ?? null;
}

/** Filters the portfolio view supports (ADR-0069 D5-F2): account/owner/type/health. */
export interface PortfolioFilter {
  account?: string; // exact account name; "" / undefined = any
  owner?: string; // exact owner display name; "" = any; "__unassigned__" = no owner
  typeKey?: string; // project_type key; "" = any
  health?: Health | "__none__" | ""; // "__none__" = projects with no milestone health
  /** When true, drop completed projects (the default "active projects" view). */
  activeOnly?: boolean;
}

/** A status counts as "active" for the default portfolio view unless it is complete. */
export function isActiveProject(row: PortfolioRow): boolean {
  return row.status !== "complete";
}

/** Apply the portfolio filters in-memory (read-only view; small N). */
export function filterPortfolio(
  rows: PortfolioRow[],
  filter: PortfolioFilter,
): PortfolioRow[] {
  return rows.filter((r) => {
    if (filter.activeOnly && !isActiveProject(r)) return false;
    if (filter.account && r.account !== filter.account) return false;
    if (filter.typeKey && r.typeKey !== filter.typeKey) return false;
    if (filter.owner) {
      if (filter.owner === "__unassigned__") {
        if (r.owner) return false;
      } else if (r.owner !== filter.owner) {
        return false;
      }
    }
    if (filter.health) {
      if (filter.health === "__none__") {
        if (r.health !== null) return false;
      } else if (r.health !== filter.health) {
        return false;
      }
    }
    return true;
  });
}

/** Distinct, sorted facet values for a filter dropdown. */
export function distinct<T extends string>(values: (T | null)[]): T[] {
  return Array.from(new Set(values.filter((v): v is T => v !== null))).sort((a, b) =>
    a.localeCompare(b),
  );
}

/** RFC-4180 CSV cell: quote when it contains a comma, quote, or newline. */
export function csvCell(value: string | null): string {
  const s = value ?? "";
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_HEADER = [
  "Project",
  "Account",
  "Type",
  "Owner",
  "Status",
  "Health",
  "Milestones done",
  "Milestones total",
  "Next milestone",
  "Next milestone due",
  "Target go-live",
] as const;

/** Serialize the (already filtered) portfolio rows to a CSV string (ADR-0069 D5-F2 export). */
export function portfolioToCsv(rows: PortfolioRow[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.name),
        csvCell(r.account),
        csvCell(r.type),
        csvCell(r.owner),
        csvCell(r.status),
        csvCell(r.health),
        csvCell(String(r.milestoneDone)),
        csvCell(String(r.milestoneTotal)),
        csvCell(r.nextMilestone),
        csvCell(r.nextMilestoneDue),
        csvCell(r.targetLive),
      ].join(","),
    );
  }
  return lines.join("\n");
}
