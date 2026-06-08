import { PageHeader } from "@/components/ui/page-header";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { ContactPipelineBoard } from "@/components/pipeline/contact-pipeline-board";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeRevenue, REDACTED_MONEY } from "@/lib/auth/roles";
import { moveOpportunityAction, moveContactStageAction } from "./actions";

// Pipeline is primarily the CONTACT lifecycle (ADR-0030): a management view of
// the book of business from Audience → Lead → Prospect → Managed Services
// Client. The opportunity/deal board is kept below as a secondary view.
export default async function PipelinePage() {
  const { crm } = getRepositories();
  const [roles, contacts, rawDeals] = await Promise.all([
    getSessionRoles(),
    crm.listContactsByStage(),
    crm.listOpportunities(),
  ]);
  // Support cannot see revenue (ADR-0030): blank deal MRR server-side.
  const opportunities = canSeeRevenue(roles)
    ? rawDeals
    : rawDeals.map((o) => ({ ...o, mrr: REDACTED_MONEY }));

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <PageHeader
          title="Pipeline"
          description={`${contacts.length} contacts by lifecycle stage · use ◀ ▶ to advance a contact`}
        />
        <ContactPipelineBoard contacts={contacts} moveAction={moveContactStageAction} />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">
            Deals by sales stage
          </h3>
          <p className="mt-0.5 text-sm text-dim">
            {opportunities.length} opportunities · use ◀ ▶ to move a deal
          </p>
        </div>
        <PipelineBoard opportunities={opportunities} moveAction={moveOpportunityAction} />
      </section>
    </div>
  );
}
