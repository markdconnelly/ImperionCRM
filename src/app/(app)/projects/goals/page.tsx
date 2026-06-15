import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { GoalsList } from "@/components/projects/goals-list";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";

export const metadata = { title: "Goals & OKRs · Projects" };

/**
 * Goals / OKRs (ADR-0069 D3, #348) — measurable objectives that sit ABOVE projects,
 * each showing its rolled-up progress from the linked contributing projects. A goal
 * in 'rollup' mode derives its percent as the weighted average of its linked
 * projects' completion (the AC: "a goal shows rolled-up progress from its linked
 * projects"); a 'manual' goal shows the owner's current/target figure. Pure read
 * model over `goal` + `goal_link` + `project_milestone` (no writes) — the GUI repo
 * reads directly for rendering (ADR-0042).
 *
 * RBAC: goals are a delivery-planning surface alongside Workload/Portfolio, so this
 * view is delivery-management only (admin | project_manager, `canManageProjects`) —
 * the same gate as the rest of the project-board planning surface (ADR-0069).
 *
 * SCOPE (this slice): READ-ONLY list. Authoring goals and managing their links is a
 * tracked follow-up (#348 comment) — the schema + rollup land here with the first
 * consuming slice (ADR-0069's "land each table with its first UI slice").
 */
export default async function GoalsPage() {
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Goals & OKRs" description="Objectives above projects" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to goals — the planning surface is
          delivery-management only (admin / project manager, ADR-0069).
        </div>
      </div>
    );
  }

  const { crm } = getRepositories();
  const goals = await crm.listGoals();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Goals & OKRs"
        description={`${goals.length} ${goals.length === 1 ? "goal" : "goals"} — progress rolled up from linked projects (ADR-0069 D3)`}
      >
        <Link
          href="/projects"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          ← Project board
        </Link>
      </PageHeader>

      <p className="rounded-lg border border-amber/30 bg-amber/5 px-4 py-2.5 text-xs text-dim">
        This is a <span className="text-text">read-only</span> view. Goals in
        rollup mode show the <span className="text-text">weighted average</span> of
        their linked projects&apos; completion; manual goals show the owner&apos;s
        current-vs-target figure. Authoring goals and editing their project links is
        a tracked follow-up on{" "}
        <Link
          href="https://github.com/markdconnelly/ImperionCRM/issues/348"
          className="text-accent hover:underline"
        >
          #348
        </Link>
        .
      </p>

      <GoalsList goals={goals} />
    </div>
  );
}
