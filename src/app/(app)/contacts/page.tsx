import { PageHeader } from "@/components/ui/page-header";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { getRepositories } from "@/lib/data";

export default async function ContactsPage() {
  const { crm } = getRepositories();
  const contacts = await crm.listContacts();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Contacts"
        description={`${contacts.length} people across your accounts`}
      />
      <ContactsTable contacts={contacts} />
    </div>
  );
}
