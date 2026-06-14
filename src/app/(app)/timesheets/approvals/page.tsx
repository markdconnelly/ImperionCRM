import Link from "next/link";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { ApprovalReview } from "@/components/timesheets/approval-review";
import { getRepositories } from "@/lib/data";
import { getTimeDeviations } from "@/lib/timesheets/deviations";
import { getSessionRoles } from "@/lib/auth/session";
import { canApproveTimesheets } from "@/lib/auth/roles";
import { weekLabel } from "@/lib/week";
import { approveTimesheetAction, reopenTimesheetAction } from "./actions";

function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Time Approvals (ADR-0082, #465) — the admin correctness gate. Lists every
 * Submitted timesheet across employees; selecting one (`?review=<id>&emp=&week=`)
 * opens its read-only review with Approve / Reopen. Admin-only (`time:approve`);
 * approving requests the backend Time Ticket write. Inline correction is #477.
 */
export default async function TimeApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ review?: string; emp?: string; week?: string }>;
}) {
  const roles = await getSessionRoles();
  if (!canApproveTimesheets(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Time approvals" description="Admin correctness gate" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to timesheet approvals — this surface is admin-only
          (ADR-0082).
        </div>
      </div>
    );
  }

  const { review, emp, week } = await searchParams;
  const { crm } = getRepositories();
  const queue = await crm.listSubmittedTimesheets();

  // The selected sheet's detail (reuse the employee-scoped read via the queue row's
  // emp+week, so no extra read method is needed). Only valid for a Submitted sheet.
  const reviewing =
    review && emp && week && ISO.test(week)
      ? await crm.getTimesheetForWeek(emp, week)
      : null;
  const reviewingName =
    queue.find((q) => q.id === review)?.employeeName ?? "Employee";
  // Full typed deviations for the reviewed sheet ([] when the backend is off — ADR-0046/0018).
  const deviations = reviewing ? await getTimeDeviations(reviewing.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Time approvals"
        description={`${queue.length} timesheet${queue.length === 1 ? "" : "s"} awaiting approval`}
      />

      {queue.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          No submitted timesheets to review. Attested weeks land here for approval.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-panel-2 text-left text-xs text-dim">
              <tr>
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Week</th>
                <th className="px-4 py-2 font-medium">Attended</th>
                <th className="px-4 py-2 font-medium">Entries</th>
                <th className="px-4 py-2 font-medium">Attested</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {queue.map((t) => {
                const selected = t.id === review;
                return (
                  <tr key={t.id} className={cn("bg-panel", selected && "bg-panel-2")}>
                    <td className="px-4 py-2 text-text">{t.employeeName}</td>
                    <td className="px-4 py-2 text-dim">{weekLabel(t.weekStart)}</td>
                    <td className="px-4 py-2 tabular-nums text-dim">{fmtMinutes(t.totalMinutes)}</td>
                    <td className="px-4 py-2 tabular-nums text-dim">{t.entryCount}</td>
                    <td className="px-4 py-2 text-dim">{t.attestedAt?.slice(0, 10) ?? "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/timesheets/approvals?review=${t.id}&emp=${t.employeeId}&week=${t.weekStart}`}
                        className="text-accent transition-colors hover:underline"
                      >
                        {selected ? "Reviewing" : "Review"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reviewing && (
        <ApprovalReview
          employeeName={reviewingName}
          detail={reviewing}
          deviations={deviations}
          approveAction={approveTimesheetAction}
          reopenAction={reopenTimesheetAction}
        />
      )}
    </div>
  );
}
