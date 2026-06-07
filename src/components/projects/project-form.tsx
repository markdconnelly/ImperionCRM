import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import type { Option, ProjectEditable } from "@/lib/data/repositories";

export function ProjectForm({
  action,
  project,
  accounts,
  opportunities,
}: {
  action: (formData: FormData) => void | Promise<void>;
  project?: ProjectEditable | null;
  accounts: Option[];
  opportunities: Option[];
}) {
  return (
    <form
      action={action}
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      {project && <input type="hidden" name="id" value={project.id} />}

      <Field label="Name">
        <TextInput name="name" defaultValue={project?.name ?? ""} required />
      </Field>

      <Field label="Account">
        <Select name="accountId" defaultValue={project?.accountId ?? ""} required>
          <option value="" disabled>
            — Select an account —
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Opportunity">
        <Select name="opportunityId" defaultValue={project?.opportunityId ?? ""}>
          <option value="">— None —</option>
          {opportunities.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Type">
        <Select name="type" defaultValue={project?.type ?? "onboarding"}>
          <option value="onboarding">Onboarding</option>
          <option value="implementation">Implementation</option>
        </Select>
      </Field>

      <Field label="Status">
        <Select name="status" defaultValue={project?.status ?? "not_started"}>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="blocked">Blocked</option>
          <option value="complete">Complete</option>
        </Select>
      </Field>

      <Field label="Target go-live">
        <TextInput type="date" name="targetLiveDate" defaultValue={project?.targetLiveDate ?? ""} />
      </Field>

      <Field label="Notes">
        <TextArea name="notes" rows={3} defaultValue={project?.notes ?? ""} />
      </Field>

      <FormActions cancelHref="/onboarding" />
    </form>
  );
}
