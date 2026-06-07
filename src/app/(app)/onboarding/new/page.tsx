import { PageHeader } from "@/components/ui/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { createProjectAction } from "../actions";
import { getRepositories } from "@/lib/data";

export default async function NewProjectPage() {
  const { crm } = getRepositories();
  const [accounts, opportunities] = await Promise.all([
    crm.accountOptions(),
    crm.opportunityOptions(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="New project" description="Start an onboarding or implementation project." />
      <ProjectForm
        action={createProjectAction}
        accounts={accounts}
        opportunities={opportunities}
      />
    </div>
  );
}
