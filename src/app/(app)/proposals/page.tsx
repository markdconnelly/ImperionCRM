import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ProposalsTable } from "@/components/proposals/proposals-table";
import { getRepositories } from "@/lib/data";
import { deleteProposalAction } from "./actions";

export default async function ProposalsPage() {
  const { crm } = getRepositories();
  const proposals = await crm.listProposals();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Proposals"
        description={`${proposals.length} proposals tied to opportunities`}
      >
        <Link
          href="/proposals/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          + New proposal
        </Link>
      </PageHeader>
      <ProposalsTable proposals={proposals} deleteAction={deleteProposalAction} />
    </div>
  );
}
