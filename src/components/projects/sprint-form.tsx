import { Field, TextInput, Select, FormActions } from "@/components/ui/form";
import type { SprintRow } from "@/types";

/**
 * Create / edit a sprint (ADR-0069 D4, #349). A server-rendered form posting to a
 * `delivery:write`-guarded action (mirrors TaskForm). `project` empty = a
 * cross-project (team) sprint — project_id stays NULL. Reused for create (no
 * `sprint`) and edit (hidden id + prefilled fields).
 */
export function SprintForm({
  action,
  projects,
  sprint,
  cancelHref,
}: {
  action: (formData: FormData) => void | Promise<void>;
  projects: { id: string; name: string }[];
  sprint?: SprintRow | null;
  cancelHref: string;
}) {
  return (
    <form
      action={action}
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      {sprint && <input type="hidden" name="id" value={sprint.id} />}

      <Field label="Name">
        <TextInput name="name" defaultValue={sprint?.name ?? ""} placeholder="e.g. Sprint 7" required />
      </Field>

      <Field label="Project (leave blank for a cross-project sprint)">
        <Select name="projectId" defaultValue={sprint?.projectId ?? ""}>
          <option value="">— Cross-project —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Starts">
          <TextInput type="date" name="startsAt" defaultValue={sprint?.startsAt ?? ""} />
        </Field>
        <Field label="Ends">
          <TextInput type="date" name="endsAt" defaultValue={sprint?.endsAt ?? ""} />
        </Field>
      </div>

      <Field label="Status">
        <Select name="status" defaultValue={sprint?.status ?? "planned"}>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </Select>
      </Field>

      <FormActions cancelHref={cancelHref} />
    </form>
  );
}
