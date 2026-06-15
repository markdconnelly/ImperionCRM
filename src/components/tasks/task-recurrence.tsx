import { getRepositories } from "@/lib/data";
import { Field, TextInput, Select } from "@/components/ui/form";
import { setTaskRecurrenceAction } from "@/app/(app)/tasks/actions";
import { parseRRule, describeRRule } from "@/lib/recurrence";
import type { TaskEditable } from "@/lib/data/repositories";

/**
 * Recurrence on a task (ADR-0070 E2, #353).
 *
 * The GUI defines the schedule; the backend/app materialises the next occurrence
 * when the task is completed (see `advanceTaskRecurrence` / `moveTaskAction`). This
 * section shows the current series (if any) and a single form to set / edit / clear
 * it: a frequency + interval, and an end condition (never / on a date / after N
 * more occurrences). Selecting "Does not repeat" clears the series.
 *
 * v1 deliberately offers only daily/weekly/monthly + interval (the RRULE subset the
 * MSP needs) and edits the whole SERIES (edit-this-vs-edit-series for a single
 * spawned instance is a documented follow-up). Same `delivery:write` audited path
 * as the rest of task mutation.
 */
export async function TaskRecurrence({ task }: { task: TaskEditable }) {
  const { crm } = getRepositories();
  const rec = await crm.getTaskRecurrence(task.id);
  const rule = rec ? parseRRule(rec.rule) : null;
  const endMode = rec?.endsAt ? "date" : rec?.countRemaining != null ? "count" : "never";

  return (
    <section className="max-w-lg rounded-xl border border-border bg-panel p-5">
      <h3 className="font-display text-sm font-semibold tracking-tight">Recurrence</h3>

      {rec && rule ? (
        <p className="mt-2 text-sm">
          <span className="text-text">{describeRRule(rule)}</span>
          <span className="text-dim"> · next on </span>
          <span className="text-text">{rec.nextRunAt}</span>
          {rec.endsAt && <span className="text-dim"> · until {rec.endsAt}</span>}
          {rec.countRemaining != null && (
            <span className="text-dim"> · {rec.countRemaining} more</span>
          )}
        </p>
      ) : (
        <p className="mt-2 text-sm text-dim">This task does not repeat.</p>
      )}

      <form action={setTaskRecurrenceAction} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="taskId" value={task.id} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Repeat">
            <Select name="repeat" defaultValue={rule?.freq ?? "NONE"}>
              <option value="NONE">Does not repeat</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </Select>
          </Field>
          <Field label="Every (interval)">
            <TextInput
              type="number"
              name="interval"
              min="1"
              step="1"
              defaultValue={String(rule?.interval ?? 1)}
            />
          </Field>
        </div>

        <Field label="Ends">
          <Select name="endMode" defaultValue={endMode}>
            <option value="never">Never</option>
            <option value="date">On date</option>
            <option value="count">After N more occurrences</option>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="End date (if “On date”)">
            <TextInput type="date" name="endDate" defaultValue={rec?.endsAt ?? ""} />
          </Field>
          <Field label="Occurrences (if “After N”)">
            <TextInput
              type="number"
              name="endCount"
              min="1"
              step="1"
              defaultValue={rec?.countRemaining != null ? String(rec.countRemaining) : ""}
            />
          </Field>
        </div>

        <div>
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
          >
            Save recurrence
          </button>
          <p className="mt-2 text-[11px] text-dim">
            The next instance spawns when this task is marked done, due one period after
            its due date (or today). Ending the series stops generation (ADR-0070 E2).
          </p>
        </div>
      </form>
    </section>
  );
}
