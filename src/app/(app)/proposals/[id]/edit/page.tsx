import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ProposalForm } from "@/components/proposals/proposal-form";
import { updateProposalAction } from "../../actions";
import { getRepositories } from "@/lib/data";

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm } = getRepositories();
  const [proposal, opportunities] = await Promise.all([
    crm.getProposal(id),
    crm.opportunityOptions(),
  ]);
  if (!proposal) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Edit proposal" description={proposal.title} />
      <ProposalForm
        action={updateProposalAction}
        proposal={proposal}
        opportunities={opportunities}
      />
    </div>
  );
}
