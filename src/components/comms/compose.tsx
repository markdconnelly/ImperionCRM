import { TextInput, TextArea, Select } from "@/components/ui/form";

/**
 * Consent-gated message composer (ADR-0014). Only channels with current opt-in are
 * offered; if none are, the composer is replaced by a notice. The actual provider
 * send is stubbed — submitting logs an outbound entry to the timeline.
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
      <div>
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Send (logged to timeline)
        </button>
      </div>
    </form>
  );
}
