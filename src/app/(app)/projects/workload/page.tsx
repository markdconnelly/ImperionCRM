import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { WorkloadBoard } from "@/components/projects/workload-board";
import { DEFAULT_WORKLOAD_THRESHOLDS } from "@/lib/workload";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";

/**
 * Workload / capacity view (ADR-0069 D2, #347) — per-user open-task load across
 * the whole task model, busiest first, with over-allocation highlighting.
 *
 * RBAC: workload is staff-performance data (ADR-0069 security impact → RBAC-gated
 * visibility), so this surface is delivery-management only (admin | project_manager,
 * `canManageProjects`) — the same gate as the rest of the project-board write
 * surface. Per-task reads stay open; the cross-person aggregate does not.
 *
 * SCOPE NOTE (estimates pending, D1/#346): "load" is OPEN-TASK COUNTS, not
 * estimated hours, and capacity is approximated by a count threshold — there is
 * no `task.estimate` column or `user_capacity.weekly_hours` table yet (D1 has no
 * migration in this VIEW lane). Reassign-from-view is deferred with the same
 * dependency (reassignment already exists per task via the assignees control,
 * #337). All tracked on #346.
 */
export default async function WorkloadPage() {
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

  const { crm } = getRepositories();
  const rows = await crm.listWorkload();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Workload & capacity"
        description="Open-task load per person — over-allocation highlighted"
      >
        <Link
          href="/projects"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          ← Project board
        </Link>
      </PageHeader>

      <p className="rounded-lg border border-amber/30 bg-amber/5 px-4 py-2.5 text-xs text-dim">
        Load is measured in <span className="text-text">open-task counts</span>, and
        &ldquo;over capacity&rdquo; uses a task-count threshold (≥{DEFAULT_WORKLOAD_THRESHOLDS.over}{" "}
        open → over, ≥{DEFAULT_WORKLOAD_THRESHOLDS.near} → near). True
        hours-vs-capacity and reassign-from-view arrive with effort estimates and{" "}
        <code className="text-text">user_capacity</code> (D1,{" "}
        <Link
          href="https://github.com/markdconnelly/ImperionCRM/issues/346"
          className="text-accent hover:underline"
        >
          #346
        </Link>
        ). Reassign a person&apos;s tasks today from each task&apos;s assignees control.
      </p>

      <WorkloadBoard rows={rows} />
    </div>
  );
}
