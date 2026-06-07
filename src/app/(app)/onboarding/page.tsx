import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectsTable } from "@/components/projects/projects-table";
import { getRepositories } from "@/lib/data";
import { deleteProjectAction } from "./actions";

export default async function OnboardingPage() {
  const { crm } = getRepositories();
  const projects = await crm.listProjects();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Onboarding"
        description={`${projects.length} onboarding & implementation projects`}
      >
        <Link
          href="/onboarding/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          + New project
        </Link>
      </PageHeader>
      <ProjectsTable projects={projects} deleteAction={deleteProjectAction} />
    </div>
  );
}
