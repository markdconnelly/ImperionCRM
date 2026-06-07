import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { getRepositories } from "@/lib/data";
import { deleteContactAction } from "./actions";

export default async function ContactsPage() {
  const { crm } = getRepositories();
  const contacts = await crm.listContacts();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Contacts"
        description={`${contacts.length} people across your accounts`}
      >
        <Link
          href="/contacts/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          + New contact
        </Link>
      </PageHeader>
      <ContactsTable contacts={contacts} deleteAction={deleteContactAction} />
    </div>
  );
}
