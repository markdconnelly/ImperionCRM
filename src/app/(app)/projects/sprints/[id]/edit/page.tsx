import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SprintForm } from "@/components/projects/sprint-form";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { updateSprintAction } from "../../actions";

export const metadata = { title: "Edit sprint · Projects" };

/** Edit a sprint's name / scope / window / status (ADR-0069 D4, #349). */
export default async function EditSprintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Edit sprint" description="Time-boxed iteration" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to sprints (admin / project manager, ADR-0069).
        </div>
      </div>
    );
  }

  const { crm } = getRepositories();
  const [sprint, projects] = await Promise.all([crm.getSprint(id), crm.listProjects()]);
  if (!sprint) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Edit ${sprint.name}`} description="Sprint settings (ADR-0069 D4)" />
      <SprintForm
        action={updateSprintAction}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        sprint={sprint}
        cancelHref={`/projects/sprints/${id}`}
      />
    </div>
  );
}
