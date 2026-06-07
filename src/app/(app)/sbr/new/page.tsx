import { PageHeader } from "@/components/ui/page-header";
import { SbrForm } from "@/components/sbr/sbr-form";
import { createSbrAction } from "../actions";
import { getRepositories } from "@/lib/data";

export default async function NewSbrPage() {
  const { crm, engagements } = getRepositories();
  const [accounts, contacts, assessments, tickets] = await Promise.all([
    crm.accountOptions(),
    crm.contactOptions(),
    crm.assessmentOptions(),
    engagements.listTickets(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Schedule SBR" description="Benchmark a managed client and capture concerns." />
      <SbrForm
        action={createSbrAction}
        accounts={accounts}
        contacts={contacts}
        assessments={assessments}
        tickets={tickets}
      />
    </div>
  );
}
