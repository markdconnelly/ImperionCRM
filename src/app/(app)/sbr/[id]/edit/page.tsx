import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SbrForm } from "@/components/sbr/sbr-form";
import { ProvenancePanel, SpawnButton } from "@/components/engagements/provenance-panel";
import { updateSbrAction, spawnOpportunityFromSbr, spawnTicketFromSbr } from "../../actions";
import { getRepositories } from "@/lib/data";

export default async function EditSbrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      </ProvenancePanel>
    </div>
  );
}
