import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ProposalsTable } from "@/components/proposals/proposals-table";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeRevenue, REDACTED_MONEY } from "@/lib/auth/roles";
import { deleteProposalAction } from "./actions";

export default async function ProposalsPage() {
  const { crm } = getRepositories();
  const [roles, raw] = await Promise.all([getSessionRoles(), crm.listProposals()]);
  // Support cannot see revenue (ADR-0030): blank proposal amounts server-side.
  const proposals = canSeeRevenue(roles)
    ? raw
    : raw.map((p) => ({ ...p, amount: REDACTED_MONEY }));

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
