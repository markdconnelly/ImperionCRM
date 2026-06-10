import { PageHeader } from "@/components/ui/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { createProjectAction } from "../../projects/actions";
import { getRepositories } from "@/lib/data";

export default async function NewProjectPage() {
  const { crm } = getRepositories();
  const [accounts, opportunities, types, owners] = await Promise.all([
    crm.accountOptions(),
    crm.opportunityOptions(),
    crm.listProjectTypes(),
    crm.userOptions(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="New project" description="Start an onboarding project." />
      <ProjectForm
        action={createProjectAction}
        accounts={accounts}
        opportunities={opportunities}
        types={types}
        owners={owners}
        defaultTypeId={types.find((t) => t.key === "onboarding")?.id}
        returnTo="/onboarding"
      />
    </div>
  );
}
