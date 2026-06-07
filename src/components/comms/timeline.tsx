import { Icon } from "@/components/ui/icon";
import { sourceMeta, directionMeta } from "@/lib/comms";
import type { InteractionRow } from "@/types";

/**
 * The unified, multi-channel communications timeline (ADR-0011). Renders any mix of
 * interaction kinds. `showContact` adds the contact/account column for the
 * cross-contact feed; omit it on a single contact's page.
 */
export function Timeline({
  items,
  showContact = false,
  emptyHint = "No communications yet.",
}: {
  items: InteractionRow[];
  showContact?: boolean;
  emptyHint?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel px-4 py-8 text-center text-sm text-dim">
        {emptyHint}
      </div>
    );
  }

  return (
    <ol className="flex flex-col">
      {items.map((it) => {
        const meta = sourceMeta(it.source);
        const dir = directionMeta(it.direction);
        return (
          <li
            key={it.id}
            className="flex gap-3 border-b border-border py-3 last:border-b-0"
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-panel-2 text-dim">
              <Icon name={meta.icon} size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-dim">
                <span className="font-medium text-text">{meta.label}</span>
                <span className={dir.tone}>· {dir.label}</span>
                {showContact && it.contact && (
                  <span>· {it.contact}{it.account ? ` (${it.account})` : ""}</span>
                )}
                {it.owner && <span>· {it.owner}</span>}
                <span className="ml-auto tabular-nums">{it.occurredAt ?? ""}</span>
              </div>
              {it.subject && (
                <p className="mt-1 text-sm font-medium text-text">{it.subject}</p>
              )}
              {it.summary && <p className="mt-0.5 text-sm text-dim">{it.summary}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
