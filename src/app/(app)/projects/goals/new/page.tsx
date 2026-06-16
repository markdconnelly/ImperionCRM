import { PageHeader } from "@/components/ui/page-header";
import { GoalForm } from "@/components/projects/goal-form";
import { createGoalAction } from "../actions";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";

export const metadata = { title: "New goal · Projects" };

/**
 * Create a goal / OKR (ADR-0069 D3, issue #621). Delivery-management only
 * (`canManageProjects`) — the same gate as the goals list and the project board.
 * Links are added after creation from the goal's detail page.
 */
export default async function NewGoalPage() {
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="New goal" description="Objectives above projects" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to author goals — delivery-management only (ADR-0069).
        </div>
      </div>
    );
  }

  const { crm } = getRepositories();
  const owners = await crm.userOptions();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New goal"
        description="A measurable objective above projects. Link contributing work after saving."
      />
      <GoalForm action={createGoalAction} owners={owners} />
    </div>
  );
}
