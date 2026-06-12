import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SbrForm } from "@/components/sbr/sbr-form";
import { ProvenancePanel, SpawnButton } from "@/components/engagements/provenance-panel";
import {
  updateSbrAction,
  spawnOpportunityFromSbr,
  spawnTicketFromSbr,
  createSbrTicketAction,
} from "../../actions";
import { getRepositories } from "@/lib/data";

export default async function EditSbrPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { id } = await params;
  const { ticket } = await searchParams;
  const { crm, engagements } = getRepositories();
  const [sbr, accounts, contacts, assessments, tickets] = await Promise.all([
    engagements.getSbr(id),
    crm.accountOptions(),
    crm.contactOptions(),
    crm.assessmentOptions(),
    engagements.listTickets(),
  ]);
  if (!sbr) notFound();

  const scoreValues = Object.fromEntries(
    sbr.dimensionScores.map((s) => [s.dimension, s.rating]),
  );
  const checkedTicketIds = sbr.tickets.map((t) => t.id);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Edit SBR" description={`${sbr.reviewDate} · ${sbr.status}`} />
      {ticket === "failed" && (
        <p className="rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
          The business-review queue ticket could not be filed (backend unavailable or the
          account isn&apos;t linked to an Autotask company). The review is saved — retry
          below when ready; retries never create duplicates.
        </p>
      )}
      <SbrForm
        action={updateSbrAction}
        sbr={sbr}
        accounts={accounts}
        contacts={contacts}
        assessments={assessments}
        tickets={tickets}
        scoreValues={scoreValues}
        checkedTicketIds={checkedTicketIds}
      />
      <ProvenancePanel>
        <SpawnButton
          action={spawnOpportunityFromSbr}
          hidden={{ sbrId: sbr.id, accountId: sbr.accountId }}
          label="Create expansion opportunity"
        />
        <SpawnButton
          action={spawnTicketFromSbr}
          hidden={{ sbrId: sbr.id, accountId: sbr.accountId }}
          label="Create ticket"
        />
        {/* Idempotent retry of the business-review queue ticket (#99/backend #19). */}
        <SpawnButton
          action={createSbrTicketAction}
          hidden={{ sbrId: sbr.id }}
          label="File business-review queue ticket"
        />
      </ProvenancePanel>
    </div>
  );
}
