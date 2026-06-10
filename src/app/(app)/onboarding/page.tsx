import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectsTable } from "@/components/projects/projects-table";
import { OnboardingBoard } from "@/components/onboarding/onboarding-board";
import { TasksTable } from "@/components/tasks/tasks-table";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageProjects } from "@/lib/auth/roles";
import {
  setMilestoneHealthAction,
  applyTemplateAction,
  toggleStepAction,
} from "./actions";
import { deleteProjectAction } from "../projects/actions";
import { deleteTaskAction } from "../tasks/actions";

// Onboarding is a full project-management dashboard (ADR-0034/0037): per-client
// R/Y/G phase status driven by the standard playbook checklist, the shared task
// object filtered to project/onboarding work, and the project list. Offloads
// Autotask PM.
export default async function OnboardingPage() {
  const { crm } = getRepositories();
  const [roles, onboarding, projects, tasks] = await Promise.all([
    getSessionRoles(),
    crm.listOnboarding(),
    crm.listProjects(),
    crm.listTasks(),
  ]);
  const canWrite = canManageProjects(roles);
  const pmTasks = tasks.filter((t) => t.category === "project" || t.category === "onboarding");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <PageHeader
          title="Onboarding"
          description={`${onboarding.length} clients onboarding · red/yellow/green per major step`}
        >
          <Link
            href="/onboarding/playbook"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
          >
            View playbook
          </Link>
          <Link
            href="/onboarding/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New project
          </Link>
        </PageHeader>
        <OnboardingBoard
          projects={onboarding}
          setHealthAction={setMilestoneHealthAction}
          applyTemplateAction={applyTemplateAction}
          toggleStepAction={toggleStepAction}
          today={today}
        />
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
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">
            Onboarding projects
          </h3>
          <p className="mt-0.5 text-sm text-dim">
            The foundational project type (ADR-0052). Every other type lives on the{" "}
            <Link href="/projects" className="text-accent hover:underline">
              project board
            </Link>
            .
          </p>
        </div>
        <ProjectsTable
          projects={projects.filter((p) => p.typeKey === "onboarding")}
          deleteAction={deleteProjectAction}
          showType={false}
          canWrite={canWrite}
        />
      </section>
    </div>
  );
}
