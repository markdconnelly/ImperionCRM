import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { DiscoveryForm } from "@/components/discovery/discovery-form";
import { updateDiscoveryAction } from "../../actions";
import { getRepositories } from "@/lib/data";

export default async function EditDiscoveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm, engagements } = getRepositories();
  const [discovery, accounts, opportunities, contacts, questions] = await Promise.all([
    engagements.getDiscoveryCall(id),
    crm.accountOptions(),
    crm.opportunityOptions(),
    crm.contactOptions(),
    engagements.getQuestions("discovery"),
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
    </div>
  );
}
