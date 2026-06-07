import { PageHeader } from "@/components/ui/page-header";
import { WorkflowsTable } from "@/components/workflows/workflows-table";
import { EnrollmentsTable } from "@/components/workflows/enrollments-table";
import { getRepositories } from "@/lib/data";
import { exitEnrollmentAction } from "./actions";

export default async function WorkflowsPage() {
  const { workflows } = getRepositories();
  const [list, enrollments] = await Promise.all([
    workflows.listWorkflows(),
    workflows.listEnrollments(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <PageHeader
          title="Workflows"
          description="Nurture and pre-discovery automation. Steps run in-app; Power Automate only fires the send/notify."
        />
        <WorkflowsTable workflows={list} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-display text-base font-semibold tracking-tight">Enrollments</h3>
        <EnrollmentsTable enrollments={enrollments} exitAction={exitEnrollmentAction} />
      </section>
    </div>
  );
}
