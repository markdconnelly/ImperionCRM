import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { sourceMeta, directionMeta } from "@/lib/comms";
import type { InteractionRow } from "@/types";

/**
 * The unified, multi-channel communications timeline (ADR-0011), rendered as a
 * true visual timeline: a vertical rail connecting one icon node per event,
 * newest first. Renders any mix of interaction kinds. `showContact` adds the
 * contact/account column for the cross-contact feed; omit it on a single
 * contact's page. `newWindow` opens the communication object in a new window
 * (used on the account/contact 360 pages so the reader keeps their place).
 */
export function Timeline({
  items,
  showContact = false,
  newWindow = false,
  emptyHint = "No communications yet.",
}: {
  items: InteractionRow[];
  showContact?: boolean;
  newWindow?: boolean;
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
    <ol className="relative flex flex-col">
      {/* The rail — runs behind the icon nodes (which are opaque + z-10). */}
      <span
        aria-hidden
        className="absolute bottom-4 left-[19px] top-4 w-px bg-border"
      />
      {items.map((it) => {
        const meta = sourceMeta(it.source);
        const dir = directionMeta(it.direction);
        return (
          <li key={it.id} className="relative">
            <Link
              href={`/communications/${it.id}`}
              target={newWindow ? "_blank" : undefined}
              rel={newWindow ? "noopener noreferrer" : undefined}
              className="group flex gap-3 rounded-md px-1 py-2.5 transition-colors hover:bg-panel-2"
            >
              <div className="z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-panel-2 text-dim transition-colors group-hover:border-accent group-hover:text-accent">
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
                  <span className="ml-auto flex items-center gap-1.5 tabular-nums">
                    {it.occurredAt ?? ""}
                    {newWindow && (
                      <span className="opacity-0 transition-opacity group-hover:opacity-100">
                        <Icon name="ExternalLink" size={12} />
                      </span>
                    )}
                  </span>
                </div>
                {it.subject && (
                  <p className="mt-1 text-sm font-medium text-text">{it.subject}</p>
                )}
                {it.summary && <p className="mt-0.5 text-sm text-dim">{it.summary}</p>}
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
