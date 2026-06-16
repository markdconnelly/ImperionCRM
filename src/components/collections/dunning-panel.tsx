import { DUNNING_STATUSES, type CollectionsActivity, type DunningStatus, type InvoiceMirrorRow } from "@/types";
import {
  escalateCollectionsAction,
  recordCollectionsActivityAction,
  setDunningStatusAction,
} from "@/app/(app)/collections/actions";

/**
 * Per-invoice dunning panel (#678, parent #668; ADR-0085 QBO read-only / ADR-0087).
 *
 * Reads the app-native dunning overlay (`collections_activity`, migration 0122): reminder
 * history (oldest first, from the JSONB log), escalation level, and current status. Write
 * controls — change status, escalate, record activity (a logged reminder + note) — post the
 * `collections:write`-gated server actions; they are only rendered when `canWrite` (ADR-0030
 * GUI gate; the server re-checks fail-closed). App-native: NONE of this writes QuickBooks or
 * moves money. The drafted-reminder SEND is the send slice (#679) — surfaced here only as a
 * disabled placeholder so the worklist reads honestly.
 */
export function DunningPanel({
  invoice,
  activity,
  canWrite,
  balanceLabel,
  statusLabel,
}: {
  invoice: InvoiceMirrorRow;
  activity: CollectionsActivity;
  canWrite: boolean;
  balanceLabel: string;
  statusLabel: Record<DunningStatus, string>;
}) {
  const invId = invoice.qboInvoiceId;
  const reminders = [...activity.reminders].reverse(); // newest first for display

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-panel p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-medium text-text">
            Dunning · {invoice.docNumber ? `#${invoice.docNumber}` : invId}
          </h2>
          <p className="text-xs text-dim">
            {invoice.accountName ?? invoice.qboCustomerName ?? "—"} · {balanceLabel} open ·{" "}
            {invoice.agingBucket} ({invoice.daysOverdue ?? "—"}d) ·{" "}
            <span className="text-text">{statusLabel[activity.status]}</span>
            {activity.escalationLevel > 0 && ` · escalation L${activity.escalationLevel}`}
          </p>
        </div>
      </div>

      {/* ── Reminder history (read-only) ──────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-dim">Reminder history</h3>
        {reminders.length === 0 ? (
          <p className="text-sm text-dim">No reminders logged yet for this invoice.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {reminders.map((rm, i) => (
              <li
                key={`${rm.at}-${i}`}
                className="flex flex-wrap items-baseline gap-2 rounded-md border border-border bg-panel-2 px-3 py-2 text-sm"
              >
                <span className="text-dim">{rm.at.slice(0, 10)}</span>
                <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-dim">
                  {rm.channel}
                </span>
                <span className="text-text">{rm.kind}</span>
                {rm.note && <span className="text-dim">— {rm.note}</span>}
              </li>
            ))}
          </ul>
        )}
        {activity.notes && (
          <p className="mt-1 rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-dim">
            <span className="text-dim">Notes:</span> {activity.notes}
          </p>
        )}
      </div>

      {canWrite ? (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          {/* Status + escalate */}
          <div className="flex flex-wrap items-end gap-3">
            <form action={setDunningStatusAction} className="flex items-end gap-2">
              <input type="hidden" name="qboInvoiceId" value={invId} />
              <label className="flex flex-col gap-1 text-xs text-dim">
                Set status
                <select
                  name="status"
                  defaultValue={activity.status}
                  className="w-40 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
                >
                  {DUNNING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel[s]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-md border border-border px-3 py-1.5 text-sm text-text transition-colors hover:border-accent hover:text-accent"
              >
                Update
              </button>
            </form>

            <form action={escalateCollectionsAction}>
              <input type="hidden" name="qboInvoiceId" value={invId} />
              <button
                type="submit"
                className="rounded-md border border-amber/60 bg-amber/10 px-3 py-1.5 text-sm text-amber transition-colors hover:bg-amber/20"
              >
                Escalate (→ L{Math.min(activity.escalationLevel + 1, 5)})
              </button>
            </form>
          </div>

          {/* Record activity — a logged reminder + optional note (NOT a send) */}
          <form
            action={recordCollectionsActivityAction}
            className="flex flex-col gap-3 rounded-md border border-border bg-panel-2 p-3"
          >
            <input type="hidden" name="qboInvoiceId" value={invId} />
            <h3 className="text-xs font-medium uppercase tracking-wide text-dim">
              Record collections activity
            </h3>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-xs text-dim">
                Channel
                <select
                  name="channel"
                  defaultValue="call"
                  className="w-32 rounded-md border border-border bg-panel px-2 py-1 text-sm text-text outline-none focus:border-accent"
                >
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="letter">Letter</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-dim">
                Kind
                <select
                  name="kind"
                  defaultValue="standard"
                  className="w-36 rounded-md border border-border bg-panel px-2 py-1 text-sm text-text outline-none focus:border-accent"
                >
                  <option value="courtesy">Courtesy</option>
                  <option value="standard">Standard</option>
                  <option value="demand">Demand</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-dim">
              Note (internal — no client PII)
              <input
                type="text"
                name="reminderNote"
                placeholder="Spoke with AP, payment promised by Friday…"
                className="w-full rounded-md border border-border bg-panel px-2 py-1 text-sm text-text outline-none focus:border-accent"
              />
            </label>
            <button
              type="submit"
              className="w-fit rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
            >
              Log activity
            </button>
          </form>

          {/* Send placeholder — the drafted-reminder SEND is the send slice (#679). */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled
              title="Drafting + sending a reminder is the send slice (#679) — not yet available."
              className="cursor-not-allowed rounded-md border border-border px-3 py-1.5 text-sm text-dim opacity-60"
            >
              Send drafted reminder
            </button>
            <span className="text-xs text-dim">Coming in the send slice (#679).</span>
          </div>
        </div>
      ) : (
        <p className="border-t border-border pt-4 text-sm text-dim">
          You have read-only access to Collections. Working the dunning overlay (escalate /
          record activity / change status) requires the finance / admin write capability.
        </p>
      )}
    </div>
  );
}
