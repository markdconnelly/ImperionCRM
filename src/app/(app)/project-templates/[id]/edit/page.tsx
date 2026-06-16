import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import {
  ProjectTemplateForm,
  type ProjectTemplateDraft,
} from "@/components/projects/project-template-form";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { updateProjectTemplateAction } from "../../actions";

/**
 * In-place edit of an existing project template (ADR-0070 E1, #634). Loads the
 * template tree, rebuilds it into the form's draft shape, and re-snapshots it
 * through `updateProjectTemplateAction`. Gated to `canManageProjects`
 * (`delivery:write`) — the same gate the update action re-checks server-side.
 *
 * The seeded protected default is uneditable (it delegates to the hard-coded
 * onboarding playbook, ADR-0037); we redirect back to the read-only detail view.
 * Editing a template never retro-mutates live projects (apply is a snapshot).
 */
export default async function EditProjectTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) redirect(`/project-templates/${id}`);

  const { crm } = getRepositories();
  const [t, types] = await Promise.all([crm.getProjectTemplate(id), crm.listProjectTypes()]);
  if (!t) notFound();
  if (t.isProtected) redirect(`/project-templates/${id}`);

  // Rebuild the flat, ordered item list into the form's milestone/item tree.
  const milestones = t.items
    .filter((i) => i.kind === "milestone")
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((m) => ({
      name: m.title,
      offsetDays: m.offsetDays,
      durationDays: m.durationDays,
      items: t.items
        .filter((c) => c.parentId === m.id)
        .sort((a, b) => a.ordinal - b.ordinal)
        .map((c) => ({
          kind: (c.kind === "task" ? "task" : "step") as "step" | "task",
          title: c.title,
          offsetDays: c.offsetDays,
          durationDays: c.durationDays,
        })),
    }));

  const initial: ProjectTemplateDraft = {
    name: t.name,
    description: t.description ?? "",
    projectTypeId: t.projectTypeId ?? "",
    milestones,
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Edit ${t.name}`}
        description="Change the milestones and tasks a project is created with. Saving re-snapshots the template — already-created projects are never changed."
      />
      <ProjectTemplateForm
        types={types}
        action={updateProjectTemplateAction}
        initial={initial}
        templateId={t.id}
        submitLabel="Save changes"
      />
    </div>
  );
}
