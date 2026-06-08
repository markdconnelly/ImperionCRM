import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { PeopleToggle } from "@/components/contacts/people-toggle";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { getRepositories } from "@/lib/data";
import { deleteContactAction } from "./actions";

// Contacts = signed clients (ADR-0030): the client-side filter of the one
// normalized contact object. Leads (/leads) is the opposite filter; the toggle
// at the top flips between them.
export default async function ContactsPage() {
  const { crm } = getRepositories();
  const contacts = await crm.listContacts({ client: true });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Contacts"
        description={`${contacts.length} signed client contacts`}
      >
        <Link
          href="/contacts/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          + New contact
        </Link>
      </PageHeader>
      <PeopleToggle current="contacts" />
      <ContactsTable contacts={contacts} deleteAction={deleteContactAction} />
    </div>
  );
}
