import { PageHeader } from "@/components/ui/page-header";
import { ConsentLedger } from "@/components/consent/consent-ledger";
import { RecordConsent } from "@/components/consent/record-consent";
import { getRepositories } from "@/lib/data";
import { recordConsentAction } from "./actions";
import type { ConsentEventRow, CurrentConsentRow } from "@/types";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string }>;
}) {
  const { contactId } = await searchParams;
  const { crm, consent } = getRepositories();
  const contactOptions = await crm.contactOptions();

  const selected = contactId
    ? (contactOptions.find((c) => c.id === contactId) ?? null)
    : null;

  let events: ConsentEventRow[] = [];
  let current: CurrentConsentRow[] = [];
  if (selected) {
    [events, current] = await Promise.all([
      consent.listConsent(selected.id),
      consent.currentConsent(selected.id),
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Consent"
        description="The append-only consent ledger. Current consent is derived; outbound sends and ad targeting are gated on it (ADR-0014)."
      />

      {/* Contact picker — native GET form, no client JS */}
      <form method="get" className="flex items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-dim">Contact</span>
          <select
            name="contactId"
            defaultValue={contactId ?? ""}
            className="w-72 rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          >
            <option value="">— Choose a contact —</option>
            {contactOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-2 text-sm text-dim hover:text-text"
        >
          View ledger
        </button>
      </form>

      {selected ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ConsentLedger current={current} events={events} />
          </div>
          <div>
            <h3 className="mb-2 font-display text-sm font-semibold tracking-tight">
              Record consent — {selected.name}
            </h3>
            <RecordConsent contactId={selected.id} action={recordConsentAction} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-dim">
          Choose a contact to view and manage their consent history.
        </p>
      )}
    </div>
  );
}
