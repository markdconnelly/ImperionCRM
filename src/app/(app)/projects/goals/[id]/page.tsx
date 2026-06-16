import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { GoalForm } from "@/components/projects/goal-form";
import { GoalLinkManager } from "@/components/projects/goal-link-manager";
import { updateGoalAction, deleteGoalAction } from "../actions";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";

export const metadata = { title: "Edit goal · Projects" };

/**
 * Edit a goal + manage its links (ADR-0069 D3, issue #621). One page: the authoring
 * form, the live rolled-up progress (projects AND tasks), the link manager, and a
 * delete. Delivery-management only (`canManageProjects`). The `GoalRow` (with its
 * derived rollup + links) and the editable `GoalEditable` are read separately — the
 * former drives the link manager, the latter binds the form.
 */
export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Goal" description="Objectives above projects" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to goals — delivery-management only (ADR-0069).
        </div>
      </div>
    );
  }

  const { crm } = getRepositories();
  const [goal, goals, owners, candidates] = await Promise.all([
    crm.getGoal(id),
    crm.listGoals(),
    crm.userOptions(),
    crm.goalLinkCandidates(),
  ]);
  if (!goal) notFound();
  const goalRow = goals.find((g) => g.id === id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={goal.name} description="Edit the goal and manage its linked work (ADR-0069 D3)">
        <Link href="/projects/goals" className="text-sm text-dim transition-colors hover:text-text">
          ← Goals
        </Link>
      </PageHeader>

      {goalRow && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-panel p-4">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-panel-2">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.max(goalRow.displayPercent, goalRow.displayPercent > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums text-text">
            {goalRow.displayPercent}%
          </span>
        </div>
      )}

      <GoalForm action={updateGoalAction} goal={goal} owners={owners} />

      {goalRow && <GoalLinkManager goal={goalRow} candidates={candidates} />}

      <form action={deleteGoalAction} className="rounded-xl border border-red/30 bg-red/5 p-5">
        <input type="hidden" name="id" value={goal.id} />
        <p className="mb-3 text-sm text-dim">
          Deleting a goal removes it and all of its links. This can&apos;t be undone.
        </p>
        <button
          type="submit"
          className="rounded-md border border-red/50 px-4 py-2 text-sm text-red transition-colors hover:bg-red/10"
        >
          Delete goal
        </button>
      </form>
    </div>
  );
}
