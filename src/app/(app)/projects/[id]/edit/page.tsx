import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { CustomFields } from "@/components/work/custom-fields";
import { updateProjectAction } from "../../actions";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm } = getRepositories();
  const [project, accounts, opportunities, types, owners, roles] = await Promise.all([
    crm.getProject(id),
    crm.accountOptions(),
    crm.opportunityOptions(),
    crm.listProjectTypes(),
    crm.userOptions(),
    getSessionRoles(),
  ]);
  if (!project) notFound();
  const canManage = canManageProjects(roles);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Edit project" description={project.name} />
      <ProjectForm
        action={updateProjectAction}
        project={project}
        accounts={accounts}
        opportunities={opportunities}
        types={types}
        owners={owners}
        returnTo="/projects"
      />

      {/* Custom fields (ADR-0065 B4, #614): admin-defined values on the project,
          scoped by its project_type; editable on `delivery:write`. */}
      <CustomFields
        parentType="project"
        parentId={project.id}
        projectTypeId={project.projectTypeId}
        canManage={canManage}
      />
    </div>
  );
}
