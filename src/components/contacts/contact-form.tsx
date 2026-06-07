import { Field, TextInput, Select, FormActions } from "@/components/ui/form";
import type { ContactEditable, Option } from "@/lib/data/repositories";

export function ContactForm({
  action,
  contact,
  accounts,
}: {
  action: (formData: FormData) => void | Promise<void>;
  contact?: ContactEditable | null;
  accounts: Option[];
}) {
  return (
    <form
      action={action}
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      {contact && <input type="hidden" name="id" value={contact.id} />}

      <Field label="Full name">
        <TextInput name="fullName" defaultValue={contact?.fullName ?? ""} required />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <TextInput name="email" type="email" defaultValue={contact?.email ?? ""} />
        </Field>
        <Field label="Phone">
          <TextInput name="phone" defaultValue={contact?.phone ?? ""} />
        </Field>
      </div>

      <Field label="Account">
        <Select name="accountId" defaultValue={contact?.accountId ?? ""}>
          <option value="">— None —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Title">
          <TextInput name="title" defaultValue={contact?.title ?? ""} />
        </Field>
        <Field label="Location">
          <TextInput name="location" defaultValue={contact?.location ?? ""} />
        </Field>
      </div>

      <Field label="Headline">
        <TextInput name="headline" defaultValue={contact?.headline ?? ""} />
      </Field>

      <Field label="Lifecycle status">
        <Select name="lifecycleStatus" defaultValue={contact?.lifecycleStatus ?? "stranger"}>
          <option value="stranger">Stranger</option>
          <option value="known">Known</option>
          <option value="engaged">Engaged</option>
          <option value="customer">Customer</option>
        </Select>
      </Field>

      <FormActions cancelHref={contact ? `/contacts/${contact.id}` : "/contacts"} />
    </form>
  );
}
