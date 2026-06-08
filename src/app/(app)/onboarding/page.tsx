import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectsTable } from "@/components/projects/projects-table";
import { OnboardingBoard } from "@/components/onboarding/onboarding-board";
import { TasksTable } from "@/components/tasks/tasks-table";
import { getRepositories } from "@/lib/data";
import { deleteProjectAction, setMilestoneHealthAction } from "./actions";
import { deleteTaskAction } from "../tasks/actions";

// Onboarding is a full project-management dashboard (ADR-0034): per-client R/Y/G
// milestone status, the shared task object filtered to project/onboarding work,
// and the underlying project list. Offloads Autotask PM.
export default async function OnboardingPage() {
  const { crm } = getRepositories();
  const [onboarding, projects, tasks] = await Promise.all([
    crm.listOnboarding(),
    crm.listProjects(),
    crm.listTasks(),
  ]);
  const pmTasks = tasks.filter((t) => t.category === "project" || t.category === "onboarding");

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <PageHeader
          title="Onboarding"
          description={`${onboarding.length} clients onboarding · red/yellow/green per major step`}
        >
          <Link
            href="/onboarding/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New project
          </Link>
        </PageHeader>
        <OnboardingBoard projects={onboarding} setHealthAction={setMilestoneHealthAction} />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">Project tasks</h3>
          <p className="mt-0.5 text-sm text-dim">
            The shared task object, filtered to project & onboarding work.
          </p>
        </div>
        <TasksTable tasks={pmTasks} deleteAction={deleteTaskAction} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-display text-base font-semibold tracking-tight">All projects</h3>
        <ProjectsTable projects={projects} deleteAction={deleteProjectAction} />
      </section>
    </div>
  );
}
