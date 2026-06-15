import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { WorkloadBoard } from "@/components/projects/workload-board";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects, canManageCapacity } from "@/lib/auth/roles";
import { addDays, mondayOf, weekLabel } from "@/lib/week";

/**
 * Workload / capacity view (ADR-0069 D1/D2, #591) — per-user ESTIMATED-HOURS load
 * across the whole task model, busiest first, classified against each person's own
 * weekly capacity.
 *
 * RBAC: workload is staff-performance data (ADR-0069 security impact → RBAC-gated
 * visibility), so this surface is delivery-management only (admin | project_manager,
 * `canManageProjects`) — the same gate as the rest of the project-board write
 * surface. Per-task reads stay open; the cross-person aggregate does not.
 *
 * HOURS, not counts (#591): "load" is now Σ `task.estimate` (hours-unit) over each
 * user's open, in-range tasks, and capacity is each user's `user_capacity.weekly_hours`
 * (the D1 inputs the #346/#580 heavy lane authored this wave — superseding the #347
 * count-with-a-flat-threshold stand-in). Range scoping (D2-F1 "over a date range") is a
 * Monday-start week chosen via the `?week=YYYY-MM-DD` param, defaulting to this week.
 */
export default async function WorkloadPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Workload & capacity" description="Per-person task load" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to the workload view — cross-person load is
          delivery-management only (admin / project manager, ADR-0069).
        </div>
      </div>
    );
  }

  // Range scoping (D2-F1) — a Monday-start week. `?week=YYYY-MM-DD` picks any week;
  // default is the week containing today. Prev/next links shift by 7 days.
  const { week } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(week ?? "") ? week! : today);
  const weekEnd = addDays(weekStart, 6);
  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const { crm } = getRepositories();
  const rows = await crm.listWorkload({ from: weekStart, to: weekEnd });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Workload & capacity"
        description="Estimated-hours load per person — over-allocation against weekly capacity"
      >
        <div className="flex items-center gap-4">
          {canManageCapacity(roles) && (
            <Link
              href="/projects/capacity"
              className="text-sm text-dim transition-colors hover:text-text"
            >
              Set weekly capacity
            </Link>
          )}
          <Link
            href="/projects"
            className="text-sm text-dim transition-colors hover:text-text"
          >
            ← Project board
          </Link>
        </div>
      </PageHeader>

      {/* Week range picker (D2-F1 "over a date range") */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-panel px-4 py-2.5 text-sm">
        <Link
          href={`/projects/workload?week=${prevWeek}`}
          className="text-dim transition-colors hover:text-text"
        >
          ← Previous week
        </Link>
        <span className="text-text">{weekLabel(weekStart)}</span>
        <Link
          href={`/projects/workload?week=${nextWeek}`}
          className="text-dim transition-colors hover:text-text"
        >
          Next week →
        </Link>
      </div>

      <p className="rounded-lg border border-border bg-panel px-4 py-2.5 text-xs text-dim">
        Load is the sum of <span className="text-text">estimated hours</span> on each
        person&apos;s open tasks due this week, and &ldquo;over capacity&rdquo; compares
        that against their own <code className="text-text">weekly capacity</code> (≥100% →
        over, ≥80% → near). People with no capacity set show &ldquo;—&rdquo; — set their
        hours on{" "}
        <Link href="/projects/capacity" className="text-accent hover:underline">
          weekly capacity
        </Link>
        . Reassign a person&apos;s tasks from each task&apos;s assignees control.
      </p>

      <WorkloadBoard rows={rows} />
    </div>
  );
}
