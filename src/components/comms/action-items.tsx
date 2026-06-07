import type { ActionItemRow } from "@/types";

/** Meeting follow-up action items (ADR-0011). Open items can be marked done. */
export function ActionItems({
  items,
  completeAction,
  back,
  showContact = false,
}: {
  items: ActionItemRow[];
  completeAction: (formData: FormData) => void | Promise<void>;
  back: string;
  showContact?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-dim">No open action items.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((a) => (
        <li
          key={a.id}
          className="flex items-start justify-between gap-3 rounded-md border border-border bg-panel-2 px-3 py-2"
        >
          <div className="min-w-0">
            <p className={`text-sm ${a.status === "done" ? "text-dim line-through" : "text-text"}`}>
              {a.description}
            </p>
            <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-dim">
              {showContact && a.contact && <span>{a.contact}</span>}
              {a.owner && <span>· {a.owner}</span>}
              {a.due && <span>· due {a.due}</span>}
              {a.promotedToTask && <span className="text-accent">· task</span>}
            </div>
          </div>
          {a.status !== "done" && (
            <form action={completeAction}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="back" value={back} />
              <button type="submit" className="shrink-0 text-xs text-dim hover:text-green">
                Mark done
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
