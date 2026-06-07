import { Field, TextInput, Select, FormActions } from "@/components/ui/form";

export function HookForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      <Field label="Name">
        <TextInput name="name" required placeholder="e.g. Website Contact Form" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Kind">
          <Select name="kind" defaultValue="web_form">
            <option value="web_form">Web form</option>
            <option value="facebook_lead">Facebook lead</option>
            <option value="youtube_comment">YouTube comment</option>
            <option value="linkedin_message">LinkedIn message</option>
            <option value="inbound_email">Inbound email</option>
            <option value="qr">QR</option>
            <option value="manual">Manual</option>
          </Select>
        </Field>
        <Field label="Active">
          <Select name="active" defaultValue="true">
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>
        </Field>
      </div>

      <Field label="Config (note / path)">
        <TextInput name="config" placeholder="e.g. /contact or ad set id" />
      </Field>

      <FormActions cancelHref="/leads" />
    </form>
  );
}
