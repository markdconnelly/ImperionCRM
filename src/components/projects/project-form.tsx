import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import type { Option, ProjectEditable } from "@/lib/data/repositories";
import type { ProjectTypeRow } from "@/types";

export function ProjectForm({
  action,
  project,
  accounts,
  opportunities,
  types,
  owners,
  defaultTypeId,
  returnTo = "/projects",
}: {
  action: (formData: FormData) => void | Promise<void>;
  project?: ProjectEditable | null;
  accounts: Option[];
  opportunities: Option[];
  types: ProjectTypeRow[];
  owners: Option[];
  /** Preselected project type for create flows (e.g. Onboarding's New project). */
  defaultTypeId?: string;
  /** Allowlisted surface to return to after save/cancel (see projects/actions.ts). */
  returnTo?: string;
}) {
  return (
    <form
      action={action}
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      {project && <input type="hidden" name="id" value={project.id} />}
      <input type="hidden" name="returnTo" value={returnTo} />

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
        <Select
          name="projectTypeId"
          defaultValue={project?.projectTypeId ?? defaultTypeId ?? types[0]?.id ?? ""}
          required
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Owner">
        <Select name="ownerUserId" defaultValue={project?.ownerUserId ?? ""}>
          <option value="">— Unassigned —</option>
          {owners.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
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

      <FormActions cancelHref={returnTo} />
    </form>
  );
}
