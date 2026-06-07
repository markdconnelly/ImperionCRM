import { PageHeader } from "@/components/ui/page-header";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import { createAssessmentAction } from "../actions";
import { getRepositories } from "@/lib/data";

export default async function NewAssessmentPage() {
  const { crm } = getRepositories();
  const [accounts, opportunities] = await Promise.all([
    crm.accountOptions(),
    crm.opportunityOptions(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New assessment"
        description="Scope an AI Security Readiness Assessment for an account."
      />
      <AssessmentForm
        action={createAssessmentAction}
        accounts={accounts}
        opportunities={opportunities}
      />
    </div>
  );
}
