import { cn } from "@/lib/cn";
import { weekDays, weekdayName, weekLabel } from "@/lib/week";
import { DeviationList } from "@/components/timesheets/deviation-list";
import { diffAgainstSnapshot, type EntryCorrectionStatus } from "@/lib/timesheets/corrections";
import type {
  AdminTimesheetReview,
  ReconciliationVerdict,
  TimeDeviation,
  TimeEntryRow,
} from "@/types";

function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
const fmtTime = (iso: string) => iso.slice(11, 16);

const VERDICT: Record<ReconciliationVerdict, { label: string; cls: string }> = {
  balanced: { label: "Balanced", cls: "text-green" },
  under_logged: { label: "Under-logged", cls: "text-amber" },
  over_logged: { label: "Over-logged", cls: "text-red" },
};

const STATUS_BADGE: Record<Exclude<EntryCorrectionStatus, "unchanged">, { label: string; cls: string }> = {
  added: { label: "Added", cls: "border-green/40 bg-green/10 text-green" },
  edited: { label: "Edited", cls: "border-amber/40 bg-amber/10 text-amber" },
};

const inputCls = "rounded border border-border bg-panel-2 px-2 py-1 text-sm text-text";

type FormAction = (formData: FormData) => void | Promise<void>;

/** One attested entry rendered as an inline correction form (edit in place) + Remove. */
function EntryRow({
  timesheetId,
  day,
  entry,
  status,
  updateAction,
  deleteAction,
}: {
  timesheetId: string;
  day: string;
  entry: TimeEntryRow;
  status: EntryCorrectionStatus;
  updateAction: FormAction;
  deleteAction: FormAction;
}) {
  const badge = status === "unchanged" ? null : STATUS_BADGE[status];
  return (
    <li className="flex flex-wrap items-end gap-2 px-3 py-2">
      <form action={updateAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={timesheetId} />
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="workDate" value={day} />
        <label className="flex flex-col gap-0.5 text-[11px] text-dim">
          Start
          <input type="time" name="startTime" defaultValue={fmtTime(entry.startedAt)} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] text-dim">
          End
          <input type="time" name="endTime" defaultValue={fmtTime(entry.endedAt)} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] text-dim">
          Category
          <select name="category" defaultValue={entry.category} className={inputCls}>
            <option value="billable">Billable</option>
            <option value="internal">Internal</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] text-dim">
          Ticket #
          <input type="text" name="ancillaryTicketRef" defaultValue={entry.ancillaryTicketRef ?? ""} placeholder="optional" className={cn(inputCls, "w-20")} />
        </label>
        <label className="flex flex-1 flex-col gap-0.5 text-[11px] text-dim">
          Notes
          <input type="text" name="notes" defaultValue={entry.notes ?? ""} placeholder="optional" className={cn(inputCls, "w-full")} />
        </label>
        <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-xs text-dim transition-colors hover:text-text">
          Save
        </button>
      </form>
      {badge && (
        <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-medium", badge.cls)}>{badge.label}</span>
      )}
      <form action={deleteAction}>
        <input type="hidden" name="id" value={timesheetId} />
        <input type="hidden" name="entryId" value={entry.id} />
        <button type="submit" className="text-xs text-dim transition-colors hover:text-red" aria-label="Remove entry">
          Remove
        </button>
      </form>
    </li>
  );
}

/**
 * Admin review of one Submitted timesheet (ADR-0082, #465 + #477): the entries day by day
 * with **inline correction** (add/edit/remove), the Reconciliation read model, and
 * Approve / Reopen. Every correction is audited against the employee's **immutable attested
 * original** (`attestedSnapshot`) — the diff badges (Added/Edited/Removed) make each change
 * visible, and the repo writes the `audit_log` row. Correcting keeps the sheet Submitted; a
 * sheet that should go back to the employee is Reopened instead (re-attest required).
 */
export function ApprovalReview({
  employeeName,
  detail,
  deviations = [],
  approveAction,
  reopenAction,
  addCorrectionAction,
  updateCorrectionAction,
  deleteCorrectionAction,
}: {
  employeeName: string;
  detail: AdminTimesheetReview;
  /** The backend's full typed deviation list (ADR-0046); empty when the backend is off. */
  deviations?: TimeDeviation[];
  approveAction: FormAction;
  reopenAction: FormAction;
  addCorrectionAction: FormAction;
  updateCorrectionAction: FormAction;
  deleteCorrectionAction: FormAction;
}) {
  const days = weekDays(detail.weekStart);
  const correctable = detail.state === "submitted";
  const diff = diffAgainstSnapshot(detail.entries, detail.attestedSnapshot);

  const reconByDay = new Map(detail.reconciliation.map((r) => [r.workDate, r]));
  const entriesByDay = new Map<string, TimeEntryRow[]>();
  for (const e of detail.entries) {
    const list = entriesByDay.get(e.workDate) ?? [];
    list.push(e);
    entriesByDay.set(e.workDate, list);
  }
  const removedByDay = new Map<string, TimeEntryRow[]>();
  for (const e of diff.removed) {
    const list = removedByDay.get(e.workDate) ?? [];
    list.push(e);
    removedByDay.set(e.workDate, list);
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-panel p-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">{employeeName}</h3>
          <p className="mt-0.5 text-sm text-dim">
            {weekLabel(detail.weekStart)} · {fmtMinutes(detail.totalMinutes)} attended ·{" "}
            {detail.attestedAt ? `attested ${detail.attestedAt.slice(0, 10)}` : "not attested"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <form action={reopenAction}>
            <input type="hidden" name="id" value={detail.id} />
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-sm text-dim transition-colors hover:text-text"
            >
              Reopen
            </button>
          </form>
          <form action={approveAction}>
            <input type="hidden" name="id" value={detail.id} />
            <button
              type="submit"
              className="rounded-md bg-green px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green/90"
            >
              Approve &amp; document
            </button>
          </form>
        </div>
      </header>

      {diff.changed && (
        <p className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-2 text-xs text-accent">
          Corrected — this week differs from the employee&apos;s attested original (each change is
          audited; the attested original is preserved unchanged).
        </p>
      )}

      {detail.hasHardDeviation && (
        <p className="rounded-md border border-amber/40 bg-amber/10 px-2.5 py-2 text-xs text-amber">
          This week still shows a Hard deviation — correct it below before approving, or Reopen for
          the employee to fix.
        </p>
      )}

      <DeviationList deviations={deviations} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {days.map((day) => {
          const dayEntries = entriesByDay.get(day) ?? [];
          const dayRemoved = removedByDay.get(day) ?? [];
          const r = reconByDay.get(day);
          const v = r ? VERDICT[r.verdict] : null;
          return (
            <div key={day} className="rounded-md border border-border bg-panel-2 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{weekdayName(day)}</span>
                {r ? (
                  <span className={cn("text-xs font-medium", v?.cls)}>
                    {fmtMinutes(r.attendedMinutes)} vs {fmtMinutes(r.loggedMinutes)} · {v?.label}
                  </span>
                ) : (
                  <span className="text-xs text-dim">No allocation</span>
                )}
              </div>

              <ul className="mt-2 flex flex-col divide-y divide-border rounded border border-border bg-panel">
                {dayEntries.map((e) =>
                  correctable ? (
                    <EntryRow
                      key={e.id}
                      timesheetId={detail.id}
                      day={day}
                      entry={e}
                      status={diff.status.get(e.id) ?? "unchanged"}
                      updateAction={updateCorrectionAction}
                      deleteAction={deleteCorrectionAction}
                    />
                  ) : (
                    <li key={e.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                      <span className="tabular-nums text-text">
                        {fmtTime(e.startedAt)}–{fmtTime(e.endedAt)}
                      </span>
                      <span className="text-dim">{e.category}</span>
                      {e.ancillaryTicketRef && <span className="text-accent">#{e.ancillaryTicketRef}</span>}
                      {e.notes && <span className="truncate text-dim">{e.notes}</span>}
                    </li>
                  ),
                )}
                {dayEntries.length === 0 && dayRemoved.length === 0 && (
                  <li className="px-3 py-2 text-xs text-dim">—</li>
                )}
                {dayRemoved.map((e) => (
                  <li key={`rm-${e.id}`} className="flex items-center gap-2 px-3 py-2 text-xs text-dim line-through">
                    <span className="tabular-nums">
                      {fmtTime(e.startedAt)}–{fmtTime(e.endedAt)}
                    </span>
                    <span>{e.category}</span>
                    <span className="rounded border border-red/40 bg-red/10 px-1.5 py-0.5 text-[10px] font-medium text-red no-underline">
                      Removed
                    </span>
                  </li>
                ))}
              </ul>

              {correctable && (
                <form action={addCorrectionAction} className="mt-2 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={detail.id} />
                  <input type="hidden" name="workDate" value={day} />
                  <label className="flex flex-col gap-0.5 text-[11px] text-dim">
                    Start
                    <input type="time" name="startTime" required className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-0.5 text-[11px] text-dim">
                    End
                    <input type="time" name="endTime" required className={inputCls} />
                  </label>
                  <label className="flex flex-col gap-0.5 text-[11px] text-dim">
                    Category
                    <select name="category" defaultValue="internal" className={inputCls}>
                      <option value="billable">Billable</option>
                      <option value="internal">Internal</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-0.5 text-[11px] text-dim">
                    Ticket #
                    <input type="text" name="ancillaryTicketRef" placeholder="optional" className={cn(inputCls, "w-20")} />
                  </label>
                  <label className="flex flex-1 flex-col gap-0.5 text-[11px] text-dim">
                    Notes
                    <input type="text" name="notes" placeholder="optional" className={cn(inputCls, "w-full")} />
                  </label>
                  <button
                    type="submit"
                    className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent/90"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
