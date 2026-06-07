import { PageHeader } from "@/components/ui/page-header";
import { ProposalForm } from "@/components/proposals/proposal-form";
import { createProposalAction } from "../actions";
import { getRepositories } from "@/lib/data";

export default async function NewProposalPage() {
  const { crm } = getRepositories();
  const opportunities = await crm.opportunityOptions();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="New proposal" description="Draft a proposal for an opportunity." />
      <ProposalForm action={createProposalAction} opportunities={opportunities} />
    </div>
  );
}
