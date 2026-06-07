import { PageHeader } from "@/components/ui/page-header";
import { DiscoveryForm } from "@/components/discovery/discovery-form";
import { createDiscoveryAction } from "../actions";
import { getRepositories } from "@/lib/data";

export default async function NewDiscoveryPage() {
  const { crm, engagements } = getRepositories();
  const [accounts, opportunities, contacts, questions] = await Promise.all([
    crm.accountOptions(),
    crm.opportunityOptions(),
    crm.contactOptions(),
    engagements.getQuestions("discovery"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Log discovery call" description="Capture the eight discovery points and the verdict." />
      <DiscoveryForm
        action={createDiscoveryAction}
        accounts={accounts}
        opportunities={opportunities}
        contacts={contacts}
        questions={questions}
      />
    </div>
  );
}
