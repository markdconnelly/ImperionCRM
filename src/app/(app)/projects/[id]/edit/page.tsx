import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { updateProjectAction } from "../../actions";
import { getRepositories } from "@/lib/data";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm } = getRepositories();
  const [project, accounts, opportunities, types, owners] = await Promise.all([
    crm.getProject(id),
    crm.accountOptions(),
    crm.opportunityOptions(),
    crm.listProjectTypes(),
    crm.userOptions(),
  ]);
  if (!project) notFound();

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
    </div>
  );
}
