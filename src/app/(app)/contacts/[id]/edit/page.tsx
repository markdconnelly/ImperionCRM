import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ContactForm } from "@/components/contacts/contact-form";
import { updateContactAction } from "../../actions";
import { getRepositories } from "@/lib/data";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { crm, contacts } = getRepositories();
  const [contact, accounts] = await Promise.all([
    contacts.getContact(id),
    crm.accountOptions(),
  ]);
  if (!contact) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Edit contact" description={contact.fullName} />
      <ContactForm action={updateContactAction} contact={contact} accounts={accounts} />
    </div>
  );
}
