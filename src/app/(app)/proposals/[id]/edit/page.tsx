import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ProposalForm } from "@/components/proposals/proposal-form";
import { SignatureStatusPanel } from "@/components/proposals/signature-status-panel";
import { updateProposalAction } from "../../actions";
import { getRepositories } from "@/lib/data";

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm } = getRepositories();
  const [proposal, opportunities, envelopes] = await Promise.all([
    crm.getProposal(id),
    crm.opportunityOptions(),
    crm.listEsignEnvelopesForProposal(id),
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
      {/* E-signature status surface (ADR-0071, #395) — read-only DocuSign envelope state. */}
      <SignatureStatusPanel envelopes={envelopes} />
    </div>
  );
}
