import { PageHeader } from "@/components/ui/page-header";
import { SprintForm } from "@/components/projects/sprint-form";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { createSprintAction } from "../actions";

export const metadata = { title: "New sprint · Projects" };

/** Create a sprint (ADR-0069 D4, #349). Delivery-management only (canManageProjects). */
export default async function NewSprintPage() {
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="New sprint" description="Time-boxed iteration" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to sprints (admin / project manager, ADR-0069).
        </div>
      </div>
    );
  }

  const { crm } = getRepositories();
  const projects = await crm.listProjects();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New sprint" description="Scope a board to a window of work (ADR-0069 D4)" />
      <SprintForm
        action={createSprintAction}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        cancelHref="/projects/sprints"
      />
    </div>
  );
}
