import type { OpportunityRow } from "@/types";

const COLUMNS: { key: string; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "won", label: "Won" },
];

/** Kanban-style pipeline board: opportunities grouped by sales stage. */
export function PipelineBoard({ opportunities }: { opportunities: OpportunityRow[] }) {
  const byStage = new Map<string, OpportunityRow[]>(
    COLUMNS.map((c): [string, OpportunityRow[]] => [c.key, []]),
  );
  for (const o of opportunities) {
    const list = byStage.get(o.stage);
    if (list) list.push(o);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const items = byStage.get(col.key) ?? [];
        return (
          <div
            key={col.key}
            className="flex flex-col rounded-xl border border-border bg-panel"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <span className="text-sm font-medium">{col.label}</span>
              <span className="rounded-full bg-panel-2 px-2 py-0.5 text-xs text-dim">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {items.map((o) => (
                <div
                  key={o.id}
                  className="rounded-lg border border-border bg-panel-2 px-3 py-2"
                >
                  <div className="truncate text-sm font-medium">{o.name}</div>
                  <div className="mt-0.5 flex items-center justify-between text-xs text-dim">
                    <span className="truncate">{o.account}</span>
                    <span className="ml-2 shrink-0 text-text">{o.mrr}</span>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="px-1 py-6 text-center text-xs text-dim">No deals</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
