import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import { updateAssessmentAction } from "../../actions";
import { getRepositories } from "@/lib/data";

export default async function EditAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm } = getRepositories();
  const [assessment, accounts, opportunities] = await Promise.all([
    crm.getAssessment(id),
    crm.accountOptions(),
    crm.opportunityOptions(),
  ]);
  if (!assessment) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Edit assessment" description={assessment.name} />
      <AssessmentForm
        action={updateAssessmentAction}
        assessment={assessment}
        accounts={accounts}
        opportunities={opportunities}
      />
    </div>
  );
}
