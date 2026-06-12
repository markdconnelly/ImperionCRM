import { TextInput, TextArea, Select } from "@/components/ui/form";

/**
 * Consent-gated message composer (ADR-0014, #183). Only channels with current opt-in
 * are offered; if none are, the composer is replaced by a notice. Submitting IS the
 * approval (ADR-0055 T2 propose-only): the send executes through the backend's
 * approval-gated send path — email as your own M365 mailbox, SMS via ACS — with
 * consent re-asserted at execution. Where the backend isn't wired, it degrades to
 * logging the entry to the timeline (the notice says which happened).
 */
export function Compose({
  action,
  contactId,
  canEmail,
  canSms,
}: {
  action: (formData: FormData) => void | Promise<void>;
  contactId: string;
  canEmail: boolean;
  canSms: boolean;
}) {
  if (!canEmail && !canSms) {
    return (
      <p className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-amber">
        Outbound blocked — this contact has no current email or SMS consent.
        Record consent on the Consent page first.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="contactId" value={contactId} />
      <div className="flex gap-2">
        <Select name="channel" defaultValue={canEmail ? "email" : "sms"}>
          {canEmail && <option value="email">Email</option>}
          {canSms && <option value="sms">SMS</option>}
        </Select>
        <TextInput name="subject" placeholder="Subject (email)" />
      </div>
      <TextArea name="body" rows={3} placeholder="Message…" required />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Approve &amp; send
        </button>
        <span className="text-[11px] text-dim">
          Submitting approves the send — consent is re-checked at execution; every send
          is logged to the timeline.
        </span>
      </div>
    </form>
  );
}
