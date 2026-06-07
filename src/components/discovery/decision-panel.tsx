import { Icon } from "@/components/ui/icon";

/**
 * The fit/nurture decision at the close of discovery (ADR-0027). After the rep has
 * confirmed the gathered data, a fit advances to the assessment; a not-fit drops the
 * contact back into nurture.
 */
export function DecisionPanel({
  accountId,
  contactId,
  advanceAction,
  nurtureAction,
}: {
  accountId: string;
  contactId: string | null;
  advanceAction: (formData: FormData) => void | Promise<void>;
  nurtureAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="max-w-2xl rounded-xl border border-border bg-panel p-5">
      <div className="mb-1 flex items-center gap-2">
        <Icon name="GitFork" size={15} className="text-accent" />
        <h3 className="font-display text-sm font-semibold tracking-tight">Fit decision</h3>
      </div>
      <p className="mb-3 text-xs text-dim">
        Confirm the gathered data above, then route the prospect. Fit → assessment;
        not a fit → nurture.
      </p>
      <div className="flex flex-wrap gap-2">
        <form action={advanceAction}>
          <input type="hidden" name="accountId" value={accountId} />
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Fit → create assessment
          </button>
        </form>
        <form action={nurtureAction}>
          <input type="hidden" name="accountId" value={accountId} />
          {contactId && <input type="hidden" name="contactId" value={contactId} />}
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-panel-2"
          >
            Not a fit → drop to nurture
          </button>
        </form>
      </div>
    </div>
  );
}
