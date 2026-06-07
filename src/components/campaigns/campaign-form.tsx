import { Field, TextInput, Select, FormActions } from "@/components/ui/form";

export function CampaignForm({
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
        <Field label="Platform">
          <Select name="platform" defaultValue="facebook">
            <option value="facebook">Facebook</option>
            <option value="google">Google</option>
            <option value="youtube">YouTube</option>
            <option value="linkedin">LinkedIn</option>
            <option value="email">Email</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue="draft">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </Select>
        </Field>
      </div>

      <Field label="Objective">
        <TextInput name="objective" placeholder="e.g. lead generation" />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Budget (USD)">
          <TextInput type="number" name="budget" min="0" step="1" />
        </Field>
        <Field label="Start">
          <TextInput type="date" name="startAt" />
        </Field>
        <Field label="End">
          <TextInput type="date" name="endAt" />
        </Field>
      </div>

      <FormActions cancelHref="/campaigns" />
    </form>
  );
}
