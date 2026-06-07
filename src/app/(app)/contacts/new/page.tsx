import { PageHeader } from "@/components/ui/page-header";
import { ContactForm } from "@/components/contacts/contact-form";
import { createContactAction } from "../actions";
import { getRepositories } from "@/lib/data";

export default async function NewContactPage() {
  const { crm } = getRepositories();
  const accounts = await crm.accountOptions();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="New contact" description="Add a person to the system." />
      <ContactForm action={createContactAction} accounts={accounts} />
    </div>
  );
}
