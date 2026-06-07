import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { DiscoveryForm } from "@/components/discovery/discovery-form";
import { ProvenancePanel, SpawnButton } from "@/components/engagements/provenance-panel";
import { AgentAnswersReview } from "@/components/discovery/agent-answers-review";
import { DecisionPanel } from "@/components/discovery/decision-panel";
import {
  updateDiscoveryAction,
  spawnOpportunityFromDiscovery,
  confirmAnswerAction,
  rejectAnswerAction,
  advanceToAssessmentAction,
  dropToNurtureAction,
} from "../../actions";
import { getRepositories } from "@/lib/data";

export default async function EditDiscoveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm, engagements } = getRepositories();
  const [discovery, accounts, opportunities, contacts, questions, review] = await Promise.all([
    engagements.getDiscoveryCall(id),
    crm.accountOptions(),
    crm.opportunityOptions(),
    crm.contactOptions(),
    engagements.getQuestions("discovery"),
    engagements.listAnswersForReview("discovery", id),
  ]);
  if (!discovery) notFound();

  const answerValues = Object.fromEntries(
    discovery.answers.map((a) => [a.questionId, a.value]),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Edit discovery call" description={`${discovery.status} · captured findings`} />
      <DiscoveryForm
        action={updateDiscoveryAction}
        discovery={discovery}
        accounts={accounts}
        opportunities={opportunities}
        contacts={contacts}
        questions={questions}
        answerValues={answerValues}
      />

      {/* Pre-discovery agent-gathered answers awaiting the human stamp (ADR-0027) */}
      <div className="max-w-2xl rounded-xl border border-border bg-panel p-5">
        <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">
          Agent-gathered data — confirm before the verdict
        </h3>
        <AgentAnswersReview
          answers={review}
          discoveryId={discovery.id}
          confirmAction={confirmAnswerAction}
          rejectAction={rejectAnswerAction}
        />
      </div>

      <DecisionPanel
        accountId={discovery.accountId}
        contactId={discovery.contactId}
        advanceAction={advanceToAssessmentAction}
        nurtureAction={dropToNurtureAction}
      />

      <ProvenancePanel>
        <SpawnButton
          action={spawnOpportunityFromDiscovery}
          hidden={{ discoveryId: discovery.id, accountId: discovery.accountId }}
          label="Create opportunity"
        />
      </ProvenancePanel>
    </div>
  );
}
