import type { ContactPipelineRow, ContactCrmStage } from "@/types";

// The customer-journey axis (ADR-0031). "Managed Services Client" is the
// crm_stage 'client'.
const COLUMNS: { key: ContactCrmStage; label: string }[] = [
  { key: "audience", label: "Audience" },
  { key: "lead", label: "Lead" },
  { key: "prospect", label: "Prospect" },
  { key: "client", label: "Managed Services Client" },
];
const ORDER = COLUMNS.map((c) => c.key);

/**
 * Interactive contact-lifecycle board: contacts grouped by crm_stage, moved with
 * ◀ ▶. A management view of how the book of business is progressing from
 * Audience → Lead → Prospect → Managed Services Client.
 */
export function ContactPipelineBoard({
  contacts,
  moveAction,
}: {
  contacts: ContactPipelineRow[];
  moveAction: (formData: FormData) => void | Promise<void>;
}) {
  const byStage = new Map<ContactCrmStage, ContactPipelineRow[]>(
    COLUMNS.map((c): [ContactCrmStage, ContactPipelineRow[]] => [c.key, []]),
  );
  for (const c of contacts) {
    const list = byStage.get(c.crmStage);
    if (list) list.push(c);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const items = byStage.get(col.key) ?? [];
        const idx = ORDER.indexOf(col.key);
        const prev = idx > 0 ? ORDER[idx - 1] : null;
        const next = idx < ORDER.length - 1 ? ORDER[idx + 1] : null;
        return (
          <div key={col.key} className="flex flex-col rounded-xl border border-border bg-panel">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <span className="text-sm font-medium">{col.label}</span>
              <span className="rounded-full bg-panel-2 px-2 py-0.5 text-xs text-dim">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {items.map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-panel-2 px-3 py-2">
                  <div className="truncate text-sm font-medium">{c.fullName}</div>
                  <div className="mt-0.5 truncate text-xs text-dim">{c.account ?? "—"}</div>
                  <div className="mt-1.5 flex items-center justify-between">
                    {prev ? (
                      <form action={moveAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="stage" value={prev} />
                        <button
                          type="submit"
                          title="Move back a stage"
                          className="text-xs text-dim hover:text-text"
                        >
                          ◀
                        </button>
                      </form>
                    ) : (
                      <span />
                    )}
                    {next ? (
                      <form action={moveAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="stage" value={next} />
                        <button
                          type="submit"
                          title="Advance a stage"
                          className="text-xs text-dim hover:text-accent"
                        >
                          ▶
                        </button>
                      </form>
                    ) : (
                      <span />
                    )}
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="px-1 py-6 text-center text-xs text-dim">No contacts</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
