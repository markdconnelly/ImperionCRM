import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PeopleToggle } from "@/components/contacts/people-toggle";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { HooksTable } from "@/components/leads/hooks-table";
import { CaptureInbox } from "@/components/leads/capture-inbox";
import { getRepositories } from "@/lib/data";
import { deleteContactAction } from "../contacts/actions";
import { resolveEventAction } from "./actions";

// Leads = not-yet-signed people (ADR-0030): the non-client filter of the one
// normalized contact object. Contacts (/contacts) is the opposite filter; the
// toggle flips between them. Lead-generation tooling (capture inbox + hooks)
// lives here.
export default async function LeadsPage() {
  const { crm, leads: leadsRepo } = getRepositories();
  const [leads, hooks, captures] = await Promise.all([
    crm.listContacts({ client: false }),
    leadsRepo.listHooks(),
    leadsRepo.listCaptureEvents(),
  ]);
  const newCount = captures.filter((c) => c.status === "new").length;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <PageHeader title="Leads" description={`${leads.length} people not yet signed`}>
          <Link
            href="/contacts/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            + New lead
          </Link>
        </PageHeader>
        <PeopleToggle current="leads" />
        <ContactsTable contacts={leads} deleteAction={deleteContactAction} />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">
            Capture inbox{newCount > 0 ? ` (${newCount} new)` : ""}
          </h3>
          <p className="mt-0.5 text-sm text-dim">
            Inbound captures from hooks. Resolve one to start a contact profile + nurture.
          </p>
        </div>
        <CaptureInbox events={captures} resolveAction={resolveEventAction} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-base font-semibold tracking-tight">Capture hooks</h3>
          <Link
            href="/leads/hooks/new"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
          >
            + New hook
          </Link>
        </div>
        <HooksTable hooks={hooks} />
      </section>
    </div>
  );
}
