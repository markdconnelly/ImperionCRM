import { PageHeader } from "@/components/ui/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { createProjectAction } from "../actions";
import { getRepositories } from "@/lib/data";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const { crm } = getRepositories();
  const [accounts, opportunities, types, owners] = await Promise.all([
    crm.accountOptions(),
    crm.opportunityOptions(),
    crm.listProjectTypes(),
    crm.userOptions(),
  ]);
  const defaultTypeId = types.find((t) => t.key === type)?.id;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="New project" description="Track a project of any type on the board." />
      <ProjectForm
        action={createProjectAction}
        accounts={accounts}
        opportunities={opportunities}
        types={types}
        owners={owners}
        defaultTypeId={defaultTypeId}
        returnTo="/projects"
      />
    </div>
  );
}
