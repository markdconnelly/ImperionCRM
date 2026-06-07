import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { AssessmentForm } from "@/components/assessments/assessment-form";
import { ProvenancePanel, SpawnButton } from "@/components/engagements/provenance-panel";
import {
  updateAssessmentAction,
  spawnProjectFromAssessment,
  spawnOpportunityFromAssessment,
  spawnTicketFromAssessment,
} from "../../actions";
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
      <ProvenancePanel>
        <SpawnButton
          action={spawnProjectFromAssessment}
          hidden={{ assessmentId: assessment.id, accountId: assessment.accountId }}
          label="Create remediation project"
        />
        <SpawnButton
          action={spawnOpportunityFromAssessment}
          hidden={{ assessmentId: assessment.id, accountId: assessment.accountId }}
          label="Create managed-services opportunity"
        />
        <SpawnButton
          action={spawnTicketFromAssessment}
          hidden={{ assessmentId: assessment.id, accountId: assessment.accountId }}
          label="Create ticket"
        />
      </ProvenancePanel>
    </div>
  );
}
