import { Field, TextInput, Select } from "@/components/ui/form";

/** Append a consent event for a contact (ADR-0014). */
export function RecordConsent({
  contactId,
  action,
}: {
  contactId: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-xl border border-border bg-panel p-4"
    >
      <input type="hidden" name="contactId" value={contactId} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Channel">
          <Select name="channel" defaultValue="email">
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="call_recording">Call recording</option>
            <option value="data_enrichment">Data enrichment</option>
            <option value="ad_targeting">Ad targeting</option>
          </Select>
        </Field>
        <Field label="State">
          <Select name="state" defaultValue="opt_in">
            <option value="opt_in">Opt-in</option>
            <option value="opt_out">Opt-out</option>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lawful basis">
          <Select name="lawfulBasis" defaultValue="consent">
            <option value="consent">Consent</option>
            <option value="legitimate_interest">Legitimate interest</option>
            <option value="contract">Contract</option>
            <option value="public_data">Public data</option>
          </Select>
        </Field>
        <Field label="Source">
          <TextInput name="source" placeholder="web_form, call, import…" />
        </Field>
      </div>
      <div>
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Record event
        </button>
      </div>
    </form>
  );
}
