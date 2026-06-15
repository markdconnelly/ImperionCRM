import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectTemplateForm } from "@/components/projects/project-template-form";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import { createProjectTemplateAction } from "../actions";

/**
 * Author a new project template (ADR-0070 E1, #352). Gated to canManageProjects
 * (`delivery:write`) — the same gate the create action re-checks server-side.
 */
export default async function NewProjectTemplatePage() {
  const roles = await getSessionRoles();
  if (!canManageProjects(roles)) redirect("/project-templates");
  const { crm } = getRepositories();
  const types = await crm.listProjectTypes();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New project template"
        description="Define the milestones and tasks a project is created with. Applying a template snapshots them — later edits never change live projects."
      />
      <ProjectTemplateForm types={types} action={createProjectTemplateAction} />
    </div>
  );
}
