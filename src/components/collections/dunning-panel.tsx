import {
  DUNNING_STATUSES,
  type CollectionsActivity,
  type ContactRow,
  type DunningStatus,
  type InvoiceMirrorRow,
} from "@/types";
import {
  escalateCollectionsAction,
  recordCollectionsActivityAction,
  sendDunningReminderAction,
  setDunningStatusAction,
} from "@/app/(app)/collections/actions";

/** The send disposition the panel surfaces after an approve-to-send round-trip (#679). */
export type SendNotice =
  | { kind: "real" }
  | { kind: "logged"; reason: string }
  | { kind: "blocked" }
  | { kind: "error" }
  | null;

/** A short, honest line describing what happened on the last send (no amounts/PII). */
const STUB_REASON_LABEL: Record<string, string> = {
  backend_unconfigured: "the M365 send backend isn't configured yet",
  no_connection: "you have no active M365 connection",
  no_app_user: "your employee record isn't resolvable here",
  no_address: "the recipient has no email address",
};

/**
 * Per-invoice dunning panel (#678 worklist + #679 SEND; parent #668; ADR-0085 QBO read-only
 * / ADR-0087 orchestration; send via ADR-0058 approval-gated path).
 *
 * Reads the app-native dunning overlay (`collections_activity`, migration 0122): reminder
 * history (oldest first, from the JSONB log), escalation level, and current status. Write
 * controls — change status, escalate, record activity, and APPROVE-TO-SEND a drafted reminder
 * — post the `collections:write`-gated server actions; rendered only when `canWrite` (ADR-0030
 * GUI gate; the server re-checks fail-closed). The send routes through the employee's own M365
 * mailbox (ADR-0058) and is HUMAN-GATED every time. App-native: NONE of this writes QuickBooks
 * or moves money — the send is a reminder email only, and it degrades to an honest logged-stub
 * with a visible notice when the M365 send backend is unconfigured.
 */
export function DunningPanel({
  invoice,
  activity,
  canWrite,
  balanceLabel,
  statusLabel,
  recipients = [],
  notice = null,
}: {
  invoice: InvoiceMirrorRow;
  activity: CollectionsActivity;
  canWrite: boolean;
  balanceLabel: string;
  statusLabel: Record<DunningStatus, string>;
  /** Contacts on the invoice's account that have an email — the send recipient choices. */
  recipients?: ContactRow[];
  /** Disposition of the last approve-to-send round-trip (drives the visible notice). */
  notice?: SendNotice;
}) {
  const invId = invoice.qboInvoiceId;
  const reminders = [...activity.reminders].reverse(); // newest first for display
  const draftSubject = `Payment reminder${invoice.docNumber ? ` — invoice #${invoice.docNumber}` : ""}`;

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

          {/* ── Approve-to-send a drafted reminder (#679, ADR-0058 gated send) ──── */}
          <form
            action={sendDunningReminderAction}
            className="flex flex-col gap-3 rounded-md border border-accent/40 bg-accent/5 p-3"
          >
            <input type="hidden" name="qboInvoiceId" value={invId} />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-dim">
                Send dunning reminder
              </h3>
              <span className="text-[11px] text-dim">
                Sends as your own M365 mailbox · approval required every send
              </span>
            </div>

            {/* The send-disposition notice from the last round-trip (honest about logged-stub). */}
            {notice && (
              <p
                className={
                  notice.kind === "real"
                    ? "rounded-md border border-green/50 bg-green/10 px-3 py-2 text-sm text-green"
                    : notice.kind === "error" || notice.kind === "blocked"
                      ? "rounded-md border border-red/50 bg-red/10 px-3 py-2 text-sm text-red"
                      : "rounded-md border border-amber/50 bg-amber/10 px-3 py-2 text-sm text-amber"
                }
              >
                {notice.kind === "real" && "Reminder sent from your M365 mailbox and logged."}
                {notice.kind === "logged" &&
                  `Reminder logged to the dunning history but NOT sent — ${
                    STUB_REASON_LABEL[notice.reason] ?? "the send backend is unavailable"
                  }.`}
                {notice.kind === "blocked" &&
                  "Send blocked — the recipient has no current consent for email."}
                {notice.kind === "error" &&
                  "The send failed at the backend — nothing was sent. Try again or check the connection."}
              </p>
            )}

            {recipients.length === 0 ? (
              <p className="text-sm text-dim">
                No emailable contact on this account. Add a billing/AP contact with an email to
                send a reminder.
              </p>
            ) : (
              <>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Recipient (account contact)
                  <select
                    name="recipientContactId"
                    required
                    defaultValue=""
                    className="w-full rounded-md border border-border bg-panel px-2 py-1 text-sm text-text outline-none focus:border-accent"
                  >
                    <option value="" disabled>
                      Choose a contact…
                    </option>
                    {recipients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Subject
                  <input
                    type="text"
                    name="subject"
                    defaultValue={draftSubject}
                    className="w-full rounded-md border border-border bg-panel px-2 py-1 text-sm text-text outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-dim">
                  Message (no client PII beyond what the recipient already knows)
                  <textarea
                    name="body"
                    required
                    rows={4}
                    defaultValue={`Hello,\n\nOur records show invoice ${
                      invoice.docNumber ? `#${invoice.docNumber}` : invId
                    } (${balanceLabel}) is past due. Please arrange payment at your earliest convenience, or reply if you have any questions.\n\nThank you.`}
                    className="w-full rounded-md border border-border bg-panel px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-dim">
                  <input type="checkbox" name="escalate" className="accent-accent" />
                  Escalate on send (bump escalation level → demand tone)
                </label>
                <button
                  type="submit"
                  className="w-fit rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
                >
                  Approve &amp; send reminder
                </button>
                <p className="text-[11px] text-dim">
                  Consent is re-checked at send; this never moves money — it is a reminder email
                  only.
                </p>
              </>
            )}
          </form>
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
