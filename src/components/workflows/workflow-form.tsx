import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";

export function WorkflowForm({
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
        <TextInput name="name" required />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Kind">
          <Select name="kind" defaultValue="nurture">
            <option value="nurture">Nurture</option>
            <option value="pre_discovery">Pre-discovery</option>
            <option value="re_engagement">Re-engagement</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue="active">
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
      </div>

      <Field label="Trigger (when it enrolls)">
        <TextArea name="trigger" rows={2} placeholder="e.g. discovery verdict = not_fit" />
      </Field>

      <FormActions cancelHref="/workflows" />
    </form>
  );
}
