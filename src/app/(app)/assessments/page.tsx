import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { AssessmentsTable } from "@/components/assessments/assessments-table";
import { getRepositories } from "@/lib/data";
import { deleteAssessmentAction } from "./actions";

export default async function AssessmentsPage() {
  const { crm } = getRepositories();
  const assessments = await crm.listAssessments();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Assessments"
        description="AI Security Readiness Assessments — the paid engagement that gates managed services."
      >
        <Link
          href="/assessments/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          + New assessment
        </Link>
      </PageHeader>
      <AssessmentsTable assessments={assessments} deleteAction={deleteAssessmentAction} />
    </div>
  );
}
