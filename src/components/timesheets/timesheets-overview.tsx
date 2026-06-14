import Link from "next/link";

import { cn } from "@/lib/cn";
import { weekLabel } from "@/lib/week";
import {
  fmtMinutes,
  LIFECYCLE_STAGES,
  STATE_LABEL,
  type LedgerRow,
  type OverviewWeek,
} from "@/lib/timesheets/overview";
import type { TimesheetRow, TimesheetState } from "@/types";

const STATE_TONE: Record<TimesheetState, string> = {
  open: "text-dim",
  submitted: "text-accent",
  approved: "text-green",
  payroll_approved: "text-green",
  paid: "text-green",
};

const STAGE_LABEL = ["Submitted", "Admin", "Finance", "Paid"] as const;

/**
 * The list-first employee timesheets landing (ADR-0082, #538). Three stacked
 * sections: the active & upcoming strip (open/start a week), the full table of the
 * employee's weeks, and the bottom lifecycle ledger showing each attested week move
 * Submitted → Admin approved → Finance approved → Paid. Self-scoped: the page only
 * ever passes the signed-in employee's own rows.
 */
export function TimesheetsOverview({
  weeks,
  rows,
  ledger,
  createAction,
}: {
  weeks: OverviewWeek[];
  rows: TimesheetRow[];
  ledger: LedgerRow[];
  createAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-8">
      {/* ── Active & upcoming ───────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-dim">Active &amp; upcoming</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {weeks.map((w) => (
            <WeekTile key={w.weekStart} week={w} createAction={createAction} />
          ))}
        </div>
      </section>

      {/* ── All of the employee's weeks ─────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-dim">Your timesheets</h2>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
            No timesheets yet — start one from the current week above. You only need to create a
            week once you have time to log.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-panel-2 text-left text-xs text-dim">
                <tr>
                  <th className="px-4 py-2 font-medium">Week</th>
                  <th className="px-4 py-2 font-medium">Attended</th>
                  <th className="px-4 py-2 font-medium">Entries</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="bg-panel">
                    <td className="px-4 py-2">{weekLabel(r.weekStart)}</td>
                    <td className="px-4 py-2 text-dim">{fmtMinutes(r.totalMinutes)}</td>
                    <td className="px-4 py-2 text-dim">{r.entryCount}</td>
                    <td className={cn("px-4 py-2 font-medium", STATE_TONE[r.state])}>
                      {STATE_LABEL[r.state]}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/timesheets?week=${r.weekStart}`}
                        className="text-accent transition-colors hover:text-text"
                      >
                        {r.state === "open" ? "Edit" : "View"} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Lifecycle ledger ────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-dim">Status &amp; payments</h2>
        {ledger.length === 0 ? (
          <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
            Once you submit a week, you&apos;ll see it move through admin approval, finance
            approval, and payment here.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {ledger.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col">
                  <Link
                    href={`/timesheets?week=${r.weekStart}`}
                    className="text-sm font-medium transition-colors hover:text-accent"
                  >
                    {weekLabel(r.weekStart)}
                  </Link>
                  <span className="text-xs text-dim">{fmtMinutes(r.totalMinutes)} attended</span>
                </div>
                <LifecycleTrack stageIndex={r.stageIndex} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** A single active/upcoming week — open it if started, otherwise offer to start it. */
function WeekTile({
  week,
  createAction,
}: {
  week: OverviewWeek;
  createAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-panel p-4",
        week.isCurrent ? "border-accent/40" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-medium">{week.label}</span>
          <span className="text-xs text-dim">
            {week.isCurrent ? "This week" : "Upcoming"}
          </span>
        </div>
        {week.sheet ? (
          <span className={cn("text-xs font-medium", STATE_TONE[week.sheet.state])}>
            {STATE_LABEL[week.sheet.state]}
          </span>
        ) : (
          <span className="text-xs text-dim">Not started</span>
        )}
      </div>

      {week.sheet ? (
        <Link
          href={`/timesheets?week=${week.weekStart}`}
          className="inline-flex w-fit items-center rounded-md border border-border px-3 py-1 text-xs text-text transition-colors hover:border-accent hover:text-accent"
        >
          Open week →
        </Link>
      ) : (
        <form action={createAction}>
          <input type="hidden" name="weekStart" value={week.weekStart} />
          <button
            type="submit"
            className="inline-flex w-fit items-center rounded-md bg-accent/10 px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
          >
            Start timesheet
          </button>
        </form>
      )}
    </div>
  );
}

/** The four-step progress track for a sheet in the lifecycle ledger. */
function LifecycleTrack({ stageIndex }: { stageIndex: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {LIFECYCLE_STAGES.map((stage, i) => {
        const reached = i <= stageIndex;
        const isPaid = stage === "paid" && reached;
        return (
          <div key={stage} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                reached
                  ? isPaid
                    ? "bg-green/15 text-green"
                    : "bg-accent/15 text-accent"
                  : "bg-panel-2 text-dim",
              )}
            >
              {STAGE_LABEL[i]}
            </span>
            {i < LIFECYCLE_STAGES.length - 1 && (
              <span className={cn("h-px w-3", reached ? "bg-accent/40" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
