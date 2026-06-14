import Link from "next/link";
import { auth } from "@/auth";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { TimesheetWeek } from "@/components/timesheets/timesheet-week";
import { TimesheetsOverview } from "@/components/timesheets/timesheets-overview";
import { getRepositories } from "@/lib/data";
import { getTimeDeviations } from "@/lib/timesheets/deviations";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import {
  buildActiveUpcoming,
  buildLifecycleLedger,
  fmtMinutes,
} from "@/lib/timesheets/overview";
import { addDays, mondayOf, weekLabel } from "@/lib/week";
import type { ReconciliationDay, TimeEntryRow, TimesheetState } from "@/types";
import {
  addTimeEntryAction,
  deleteTimeEntryAction,
  attestTimesheetAction,
  createTimesheetAction,
} from "./actions";

const STATE_BADGE: Record<TimesheetState, string> = {
  open: "text-dim",
  submitted: "text-accent",
  approved: "text-green",
  payroll_approved: "text-green",
  paid: "text-green",
};

/** Honest empty state when the signed-in user isn't mapped to an employee record. */
function UnmappedEmployee() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My timesheets" description="Weekly attendance + attestation" />
      <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
        Your employee record isn&apos;t resolved yet — sign in with your Entra account on the live
        app to track time.
      </div>
    </div>
  );
}

/**
 * My Timesheets (ADR-0082; list-first redesign #538).
 *
 * Default view is a LIST: an "active & upcoming" strip (open or start a week — lazy,
 * no need to make weeks early), the full table of the employee's weeks, and a bottom
 * lifecycle ledger that tracks each submitted week through admin approval → finance
 * approval → paid. Drilling into a single week (`?week=<Monday>`) shows the day-by-day
 * entry surface. Self-scoped: the employee id is the signed-in user's.
 */
export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const session = await auth();
  const employeeId = await resolveAppUserIdByEmail(session?.user?.email ?? "");
  if (!employeeId) return <UnmappedEmployee />;

  const { crm } = getRepositories();
  const showWeek = Boolean(week && /^\d{4}-\d{2}-\d{2}$/.test(week));

  // ── Single-week detail ─────────────────────────────────────────────────
  if (showWeek) {
    const today = new Date().toISOString().slice(0, 10);
    const weekStart = mondayOf(week!);
    const prevWeek = addDays(weekStart, -7);
    const nextWeek = addDays(weekStart, 7);

    const sheet = await crm.getTimesheetForWeek(employeeId, weekStart);
    const state: TimesheetState = sheet?.state ?? "open";
    const entries: TimeEntryRow[] = sheet?.entries ?? [];
    const reconciliation: ReconciliationDay[] = sheet?.reconciliation ?? [];
    const totalMinutes = sheet?.totalMinutes ?? 0;
    // Backend's full typed deviations (overlap/orphan the view can't express); [] when
    // the backend is unconfigured, so the memory-jogger renders as before (ADR-0046/0018).
    const deviations = sheet ? await getTimeDeviations(sheet.id) : [];

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="My timesheets"
          description={`${weekLabel(weekStart)} · ${fmtMinutes(totalMinutes)} attended`}
        >
          <span className={cn("text-sm font-medium capitalize", STATE_BADGE[state])}>
            {state.replace(/_/g, " ")}
          </span>
          <div className="inline-flex items-center rounded-lg border border-border bg-panel p-1">
            <Link
              href={`/timesheets?week=${prevWeek}`}
              className="rounded-md px-3 py-1 text-sm text-dim transition-colors hover:text-text"
            >
              ← Prev
            </Link>
            <Link
              href={`/timesheets?week=${mondayOf(today)}`}
              className="rounded-md px-3 py-1 text-sm text-dim transition-colors hover:text-text"
            >
              This week
            </Link>
            <Link
              href={`/timesheets?week=${nextWeek}`}
              className="rounded-md px-3 py-1 text-sm text-dim transition-colors hover:text-text"
            >
              Next →
            </Link>
          </div>
        </PageHeader>

        <Link
          href="/timesheets"
          className="-mt-2 w-fit text-sm text-dim transition-colors hover:text-text"
        >
          ← All timesheets
        </Link>

        <TimesheetWeek
          weekStart={weekStart}
          state={state}
          entries={entries}
          reconciliation={reconciliation}
          deviations={deviations}
          hasHardDeviation={sheet?.hasHardDeviation ?? false}
          addAction={addTimeEntryAction}
          deleteAction={deleteTimeEntryAction}
          attestAction={attestTimesheetAction}
        />
      </div>
    );
  }

  // ── List landing ───────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const rows = await crm.listTimesheets({ employeeId });
  const weeks = buildActiveUpcoming(today, rows);
  const ledger = buildLifecycleLedger(rows);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My timesheets"
        description="Your weekly attendance — open a week to log time, then track it through approval and payment."
      />
      <TimesheetsOverview
        weeks={weeks}
        rows={rows}
        ledger={ledger}
        createAction={createTimesheetAction}
      />
    </div>
  );
}
