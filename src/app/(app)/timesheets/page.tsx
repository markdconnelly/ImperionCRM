import Link from "next/link";
import { auth } from "@/auth";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { TimesheetWeek } from "@/components/timesheets/timesheet-week";
import { getRepositories } from "@/lib/data";
import { getTimeDeviations } from "@/lib/timesheets/deviations";
import { resolveAppUserIdByEmail } from "@/lib/data/app-user";
import { addDays, mondayOf, weekLabel } from "@/lib/week";
import type { ReconciliationDay, TimeEntryRow, TimesheetState } from "@/types";
import { addTimeEntryAction, deleteTimeEntryAction, attestTimesheetAction } from "./actions";

/** Minutes → "8h 0m". */
function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

const STATE_BADGE: Record<TimesheetState, string> = {
  open: "text-dim",
  submitted: "text-accent",
  approved: "text-green",
  payroll_approved: "text-green",
  paid: "text-green",
};

/**
 * My Timesheets (ADR-0082, #464) — the employee's own weekly attendance surface.
 * Enter Time Entries day by day, see the Reconciliation memory-jogger (attended vs
 * Autotask allocation), and Attest the week. The week is `?week=<Monday>` (defaults
 * to the current week); the employee id is the signed-in user's (self-scoped).
 */
export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = mondayOf(week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today);
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const session = await auth();
  const employeeId = await resolveAppUserIdByEmail(session?.user?.email ?? "");

  // Unmapped employee (mock mode / no app_user row): show an honest empty state
  // rather than failing the page.
  if (!employeeId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="My timesheets" description="Weekly attendance + attestation" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          Your employee record isn&apos;t resolved yet — sign in with your Entra account on the
          live app to track time.
        </div>
      </div>
    );
  }

  const { crm } = getRepositories();
  const sheet = await crm.getTimesheetForWeek(employeeId, weekStart);
  const state: TimesheetState = sheet?.state ?? "open";
  const entries: TimeEntryRow[] = sheet?.entries ?? [];
  const reconciliation: ReconciliationDay[] = sheet?.reconciliation ?? [];
  const totalMinutes = sheet?.totalMinutes ?? 0;
  // The backend's full typed deviations (overlap/orphan the view can't express); [] when
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
