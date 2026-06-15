import { getRepositories } from "@/lib/data";
import { Field, TextInput, TextArea } from "@/components/ui/form";
import { logTimeAction } from "@/app/(app)/tasks/actions";
import { fmtMinutes } from "@/lib/timesheets/overview";
import type { TaskEditable } from "@/lib/data/repositories";

/**
 * Time tracking on a task (ADR-0069 D1, #346).
 *
 * Lists the task's logged blocks (newest-first) with the per-task logged-vs-estimate
 * rollup, plus a manual "log time" form (hours + minutes → a single positive
 * `minutes` int, optional date / note / billable). The start/stop timer is
 * deliberately out of scope for v1 — manual entry is the acceptance. Same
 * `delivery:write` audited path as the rest of task mutation; the logger is the
 * signed-in employee, resolved server-side.
 *
 * The remaining figure converts an `hours`-unit estimate to minutes (estimate×60);
 * a points-based estimate shows the raw estimate without a time remaining (points
 * don't convert to time).
 */
export async function TaskTimeLog({ task }: { task: TaskEditable }) {
  const { crm } = getRepositories();
  const entries = await crm.listTaskTimeEntries(task.id);
  const loggedMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);

  const estimateNum = task.estimate != null ? Number(task.estimate) : null;
  const isHours = (task.estimateUnit ?? "").toLowerCase() === "hours";
  const estimateMinutes = estimateNum != null && isHours ? estimateNum * 60 : null;
  const remainingMinutes = estimateMinutes != null ? estimateMinutes - loggedMinutes : null;

  return (
    <section className="max-w-lg rounded-xl border border-border bg-panel p-5">
      <h3 className="font-display text-sm font-semibold tracking-tight">Time tracking</h3>

      {/* Logged-vs-estimate rollup (acceptance: shows remaining vs estimate). */}
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div>
          <span className="text-dim">Logged </span>
          <span className="text-text">{fmtMinutes(loggedMinutes)}</span>
        </div>
        {estimateNum != null && (
          <div>
            <span className="text-dim">Estimate </span>
            <span className="text-text">
              {estimateMinutes != null ? fmtMinutes(estimateMinutes) : `${estimateNum} ${task.estimateUnit}`}
            </span>
          </div>
        )}
        {remainingMinutes != null && (
          <div>
            <span className="text-dim">Remaining </span>
            <span className={remainingMinutes < 0 ? "text-red" : "text-green"}>
              {remainingMinutes < 0 ? `-${fmtMinutes(-remainingMinutes)}` : fmtMinutes(remainingMinutes)}
            </span>
          </div>
        )}
      </div>

      {/* Manual log form. Hours + minutes fold into one positive minutes int. */}
      <form action={logTimeAction} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="taskId" value={task.id} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hours">
            <TextInput type="number" name="hours" min="0" step="1" placeholder="0" />
          </Field>
          <Field label="Minutes">
            <TextInput type="number" name="minutes" min="0" max="59" step="1" placeholder="0" />
          </Field>
        </div>
        <Field label="Date (optional)">
          <TextInput type="date" name="startedAt" />
        </Field>
        <Field label="Note (optional)">
          <TextArea name="note" rows={2} placeholder="What did you work on?" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-dim">
          <input type="checkbox" name="billable" className="accent-accent" />
          Billable
        </label>
        <div>
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
          >
            Log time
          </button>
        </div>
      </form>

      {/* Entry list, newest-first. */}
      <div className="mt-4">
        {entries.length === 0 ? (
          <p className="text-sm text-dim">No time logged on this task yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm"
              >
                <span className="min-w-16 font-medium text-text">{fmtMinutes(e.minutes)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-x-2 text-xs text-dim">
                    {e.user && <span className="text-text">{e.user}</span>}
                    {e.startedAt && <span>{e.startedAt}</span>}
                    {e.billable && <span className="text-green">billable</span>}
                  </div>
                  {e.note && <p className="mt-0.5 whitespace-pre-wrap text-dim">{e.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
