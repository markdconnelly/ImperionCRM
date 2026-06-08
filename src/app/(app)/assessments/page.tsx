import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { AssessmentsTable } from "@/components/assessments/assessments-table";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeRevenue, REDACTED_MONEY } from "@/lib/auth/roles";
import { deleteAssessmentAction } from "./actions";

export default async function AssessmentsPage() {
  const { crm } = getRepositories();
  const [roles, raw] = await Promise.all([getSessionRoles(), crm.listAssessments()]);
  // Support cannot see revenue (ADR-0030): blank the one-time fee server-side.
  const assessments = canSeeRevenue(roles)
    ? raw
    : raw.map((a) => ({ ...a, fee: REDACTED_MONEY }));

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
