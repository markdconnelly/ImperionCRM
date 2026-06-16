import { Field, TextInput, TextArea, Select, FormActions } from "@/components/ui/form";
import type { Option } from "@/lib/data/repositories";
import type { GoalEditable } from "@/types";

/**
 * Goal / OKR authoring form (ADR-0069 D3, issue #621) — create or edit a goal's
 * name, owner, free-text period, numeric target/current, progress mode, and notes.
 * A server-component form posting to the `delivery:write`-gated goal actions. The
 * rollup is always DERIVED (never stored), so `current` only matters in manual mode
 * — the helper text says so rather than hiding the field.
 */
export function GoalForm({
  action,
  goal,
  owners,
}: {
  action: (formData: FormData) => void | Promise<void>;
  goal?: GoalEditable | null;
  owners: Option[];
}) {
  return (
    <form
      action={action}
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-panel p-5"
    >
      {goal && <input type="hidden" name="id" value={goal.id} />}

      <Field label="Name">
        <TextInput name="name" defaultValue={goal?.name ?? ""} required placeholder="e.g. Onboard 8 new clients this quarter" />
      </Field>

      <Field label="Owner">
        <Select name="ownerUserId" defaultValue={goal?.ownerUserId ?? ""}>
          <option value="">— Unassigned —</option>
          {owners.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Period">
        <TextInput name="period" defaultValue={goal?.period ?? ""} placeholder="e.g. Q3 2026 · FY26 H2" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Target">
          <TextInput type="number" name="target" defaultValue={String(goal?.target ?? 100)} min={0} />
        </Field>
        <Field label="Current (manual)">
          <TextInput type="number" name="current" defaultValue={String(goal?.current ?? 0)} min={0} />
        </Field>
      </div>

      <Field label="Progress mode">
        <Select name="progressMode" defaultValue={goal?.progressMode ?? "rollup"}>
          <option value="rollup">Rollup — weighted average of linked work</option>
          <option value="manual">Manual — use the current/target figure</option>
        </Select>
      </Field>
      <p className="-mt-2 text-xs text-dim">
        In <span className="text-text">rollup</span> mode the percent is the weighted
        average of the goal&apos;s linked projects and tasks; the manual{" "}
        <span className="text-text">current</span> figure is used only when no work is
        linked or the mode is <span className="text-text">manual</span>.
      </p>

      <Field label="Notes">
        <TextArea name="notes" rows={3} defaultValue={goal?.notes ?? ""} />
      </Field>

      <FormActions cancelHref="/projects/goals" />
    </form>
  );
}
