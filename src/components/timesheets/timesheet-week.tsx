import { cn } from "@/lib/cn";
import { weekDays, weekdayName } from "@/lib/week";
import type {
  ReconciliationDay,
  ReconciliationVerdict,
  TimeEntryRow,
  TimesheetState,
} from "@/types";

/** Minutes → "8h 0m" / "45m". */
function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** A UTC ISO timestamp → "HH:MM" wall clock (stored + shown in UTC, ADR-0082 v1). */
function fmtTime(iso: string): string {
  return iso.slice(11, 16);
}

const CATEGORY_LABEL: Record<string, string> = {
  billable: "Billable",
  internal: "Internal",
  admin: "Admin",
};

const VERDICT: Record<ReconciliationVerdict, { label: string; cls: string }> = {
  balanced: { label: "Balanced", cls: "text-green" },
  under_logged: { label: "Under-logged", cls: "text-amber" },
  over_logged: { label: "Over-logged", cls: "text-red" },
};

type FormAction = (formData: FormData) => void | Promise<void>;

/**
 * The employee's weekly timesheet surface (ADR-0082, #464): day-by-day attendance
 * entry, the memory-jogger Reconciliation panel (attended vs Autotask allocation,
 * daily verdict), and the Attest control. A server component — every mutation is a
 * `<form action={…}>` to a self-scoped server action; the page revalidates after.
 * Once attested (state ≠ open) the employee is locked out (only an admin edits).
 */
export function TimesheetWeek({
  weekStart,
  state,
  entries,
  reconciliation,
  hasHardDeviation,
  addAction,
  deleteAction,
  attestAction,
}: {
  weekStart: string;
  state: TimesheetState;
  entries: TimeEntryRow[];
  reconciliation: ReconciliationDay[];
  hasHardDeviation: boolean;
  addAction: FormAction;
  deleteAction: FormAction;
  attestAction: FormAction;
}) {
  const days = weekDays(weekStart);
  const editable = state === "open";
  const reconByDay = new Map(reconciliation.map((r) => [r.workDate, r]));
  const entriesByDay = new Map<string, TimeEntryRow[]>();
  for (const e of entries) {
    const list = entriesByDay.get(e.workDate) ?? [];
    list.push(e);
    entriesByDay.set(e.workDate, list);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* ── Day-by-day attendance ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {!editable && (
          <div className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-dim">
            This timesheet is <span className="text-text capitalize">{state.replace(/_/g, " ")}</span> —
            you attested it and are locked out. Only an admin can edit it now.
          </div>
        )}
        {days.map((day) => {
          const dayEntries = entriesByDay.get(day) ?? [];
          const dayMinutes = dayEntries.reduce((s, e) => s + e.minutes, 0);
          return (
            <section key={day} className="rounded-lg border border-border bg-panel">
              <header className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
                <h3 className="font-display text-sm font-semibold tracking-tight">
                  {weekdayName(day)}{" "}
                  <span className="font-normal text-dim">{day.slice(5)}</span>
                </h3>
                <span className="text-xs text-dim">
                  {dayEntries.length > 0 ? fmtMinutes(dayMinutes) : "—"}
                </span>
              </header>

              <ul className="divide-y divide-border">
                {dayEntries.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className="tabular-nums text-text">
                      {fmtTime(e.startedAt)}–{fmtTime(e.endedAt)}
                    </span>
                    <span className="text-dim">{fmtMinutes(e.minutes)}</span>
                    <span className="rounded bg-panel-2 px-1.5 py-0.5 text-xs text-dim">
                      {CATEGORY_LABEL[e.category] ?? e.category}
                    </span>
                    {e.ancillaryTicketRef && (
                      <span className="text-xs text-accent">#{e.ancillaryTicketRef}</span>
                    )}
                    {e.notes && <span className="truncate text-xs text-dim">{e.notes}</span>}
                    {editable && (
                      <form action={deleteAction} className="ml-auto">
                        <input type="hidden" name="weekStart" value={weekStart} />
                        <input type="hidden" name="entryId" value={e.id} />
                        <button
                          type="submit"
                          className="text-xs text-dim transition-colors hover:text-red"
                          aria-label="Delete entry"
                        >
                          Remove
                        </button>
                      </form>
                    )}
                  </li>
                ))}
                {dayEntries.length === 0 && (
                  <li className="px-4 py-2 text-xs text-dim">No time logged.</li>
                )}
              </ul>

              {editable && (
                <form
                  action={addAction}
                  className="flex flex-wrap items-end gap-2 border-t border-border px-4 py-2.5"
                >
                  <input type="hidden" name="weekStart" value={weekStart} />
                  <input type="hidden" name="workDate" value={day} />
                  <label className="flex flex-col gap-0.5 text-xs text-dim">
                    Start
                    <input
                      type="time"
                      name="startTime"
                      required
                      className="rounded border border-border bg-panel-2 px-2 py-1 text-sm text-text"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5 text-xs text-dim">
                    End
                    <input
                      type="time"
                      name="endTime"
                      required
                      className="rounded border border-border bg-panel-2 px-2 py-1 text-sm text-text"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5 text-xs text-dim">
                    Category
                    <select
                      name="category"
                      defaultValue="internal"
                      className="rounded border border-border bg-panel-2 px-2 py-1 text-sm text-text"
                    >
                      <option value="billable">Billable</option>
                      <option value="internal">Internal</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-0.5 text-xs text-dim">
                    Ticket #
                    <input
                      type="text"
                      name="ancillaryTicketRef"
                      placeholder="optional"
                      className="w-24 rounded border border-border bg-panel-2 px-2 py-1 text-sm text-text"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-0.5 text-xs text-dim">
                    Notes
                    <input
                      type="text"
                      name="notes"
                      placeholder="optional"
                      className="w-full rounded border border-border bg-panel-2 px-2 py-1 text-sm text-text"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
                  >
                    Add
                  </button>
                </form>
              )}
            </section>
          );
        })}
      </div>

      {/* ── Memory-jogger: Reconciliation + Attest ────────────────────────── */}
      <aside className="flex h-fit flex-col gap-3 rounded-lg border border-border bg-panel p-4">
        <div>
          <h3 className="font-display text-sm font-semibold tracking-tight">Reconciliation</h3>
          <p className="mt-0.5 text-xs text-dim">
            Your attended time vs the same day&apos;s Autotask ticket time — a memory-jogger
            before you attest.
          </p>
        </div>

        <ul className="flex flex-col gap-1">
          {days.map((day) => {
            const r = reconByDay.get(day);
            const v = r ? VERDICT[r.verdict] : null;
            return (
              <li
                key={day}
                className="flex items-center justify-between rounded border border-border bg-panel-2 px-2.5 py-1.5 text-xs"
              >
                <span className="text-dim">{weekdayName(day).slice(0, 3)}</span>
                {r ? (
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums text-dim">
                      {fmtMinutes(r.attendedMinutes)} vs {fmtMinutes(r.loggedMinutes)}
                    </span>
                    <span className={cn("font-medium", v?.cls)}>{v?.label}</span>
                  </span>
                ) : (
                  <span className="text-dim">No allocation</span>
                )}
              </li>
            );
          })}
        </ul>

        {hasHardDeviation && editable && (
          <p className="rounded-md border border-red/40 bg-red/10 px-2.5 py-2 text-xs text-red">
            A Hard deviation (over-logged day or overlapping blocks) must be cleared before you can
            attest.
          </p>
        )}

        {editable ? (
          <form action={attestAction}>
            <input type="hidden" name="weekStart" value={weekStart} />
            <button
              type="submit"
              disabled={hasHardDeviation || entries.length === 0}
              className={cn(
                "w-full rounded-md px-3 py-2 text-sm font-medium transition-colors",
                hasHardDeviation || entries.length === 0
                  ? "cursor-not-allowed bg-panel-2 text-dim"
                  : "bg-green text-white hover:bg-green/90",
              )}
            >
              Attest &amp; submit week
            </button>
          </form>
        ) : (
          <div className="rounded-md border border-green/40 bg-green/10 px-2.5 py-2 text-xs text-green">
            Attested — submitted for approval.
          </div>
        )}
        {editable && (
          <p className="text-[11px] leading-snug text-dim">
            Attesting affirms these are your true hours and locks the week to further edits by you.
          </p>
        )}
      </aside>
    </div>
  );
}
