import { cn } from "@/lib/cn";
import { weekDays, weekdayName, weekLabel } from "@/lib/week";
import type { ReconciliationVerdict, TimesheetDetail } from "@/types";

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

type FormAction = (formData: FormData) => void | Promise<void>;

/**
 * Admin review of one Submitted timesheet (ADR-0082, #465): the attested entries +
 * the Reconciliation read model, read-only, with Approve / Reopen. Approving moves
 * the week to Approved and requests the backend Time Ticket write; Reopen sends it
 * back to the employee (re-attest required). Inline admin correction is a follow-up
 * (#477) — for now a sheet needing changes is reopened.
 */
export function ApprovalReview({
  employeeName,
  detail,
  approveAction,
  reopenAction,
}: {
  employeeName: string;
  detail: TimesheetDetail;
  approveAction: FormAction;
  reopenAction: FormAction;
}) {
  const days = weekDays(detail.weekStart);
  const reconByDay = new Map(detail.reconciliation.map((r) => [r.workDate, r]));
  const entriesByDay = new Map<string, typeof detail.entries>();
  for (const e of detail.entries) {
    const list = entriesByDay.get(e.workDate) ?? [];
    list.push(e);
    entriesByDay.set(e.workDate, list);
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-panel p-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">{employeeName}</h3>
          <p className="mt-0.5 text-sm text-dim">
            {weekLabel(detail.weekStart)} · {fmtMinutes(detail.totalMinutes)} attended ·{" "}
            {detail.attestedAt
              ? `attested ${detail.attestedAt.slice(0, 10)}`
              : "not attested"}
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

      {detail.hasHardDeviation && (
        <p className="rounded-md border border-amber/40 bg-amber/10 px-2.5 py-2 text-xs text-amber">
          This week still shows a Hard deviation — review before approving, or Reopen for the
          employee to correct.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {days.map((day) => {
          const dayEntries = entriesByDay.get(day) ?? [];
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
              <ul className="mt-2 flex flex-col gap-1">
                {dayEntries.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-xs">
                    <span className="tabular-nums text-text">
                      {fmtTime(e.startedAt)}–{fmtTime(e.endedAt)}
                    </span>
                    <span className="text-dim">{e.category}</span>
                    {e.ancillaryTicketRef && (
                      <span className="text-accent">#{e.ancillaryTicketRef}</span>
                    )}
                    {e.notes && <span className="truncate text-dim">{e.notes}</span>}
                  </li>
                ))}
                {dayEntries.length === 0 && <li className="text-xs text-dim">—</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
