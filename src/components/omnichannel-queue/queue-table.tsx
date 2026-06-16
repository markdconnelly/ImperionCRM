import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { QueueChannel, QueueItem, QueuePriority } from "@/types";

/** Label + lucide icon per unified channel (kept local to the table for cohesion). */
const CHANNEL_META: Record<QueueChannel, { label: string; icon: string }> = {
  web_chat: { label: "Web chat", icon: "MessageCircle" },
  social: { label: "Social", icon: "Share2" },
  email: { label: "Email", icon: "Mail" },
  sms: { label: "SMS", icon: "MessageSquare" },
  voice: { label: "Voice", icon: "Phone" },
  ticket: { label: "Ticket", icon: "Ticket" },
  other: { label: "Other", icon: "Inbox" },
};

/** Priority pill colour (matches the dark token palette, CLAUDE.md §6). */
const PRIORITY_META: Record<QueuePriority, { label: string; cls: string }> = {
  urgent: { label: "Urgent", cls: "border-red/40 bg-red/10 text-red" },
  high: { label: "High", cls: "border-amber/40 bg-amber/10 text-amber" },
  normal: { label: "Normal", cls: "border-border bg-panel-2 text-dim" },
  low: { label: "Low", cls: "border-border bg-panel-2 text-dim" },
};

/** Deep-link the source row to its owning surface (chat console #407 / ticket board). */
function hrefFor(item: QueueItem): string {
  return item.source === "ticket" ? "/tickets" : "/communications";
}

/**
 * The unified omnichannel queue table (ADR-0074 §6, #408). Read-only: each row is a
 * `QueueItem` projected by lib/omnichannel-queue.ts and ordered most-urgent-first.
 * Assignment/triage is a backend/ICM (#280) process — see the page-level notice.
 */
export function QueueTable({ items }: { items: QueueItem[] }) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-dim">
        <span>
          {items.length} item{items.length === 1 ? "" : "s"} · sorted by priority then wait time
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Priority</th>
              <th className="px-4 py-2 font-medium">Channel</th>
              <th className="px-4 py-2 font-medium">Subject</th>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Contact</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Received</th>
              <th className="px-4 py-2 font-medium">Routing</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const channel = CHANNEL_META[item.channel];
              const priority = PRIORITY_META[item.priority];
              return (
                <tr key={item.id} className="border-t border-border hover:bg-panel-2">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${priority.cls}`}
                    >
                      {priority.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-dim">
                      <Icon name={channel.icon} size={13} />
                      {channel.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={hrefFor(item)} className="hover:text-accent">
                      {item.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-dim">{item.account ?? "—"}</td>
                  <td className="px-4 py-3 text-dim">{item.contactName ?? "—"}</td>
                  <td className="px-4 py-3 text-dim">{item.status ?? "—"}</td>
                  <td className="px-4 py-3 text-dim">{item.receivedAt ?? "—"}</td>
                  <td className="px-4 py-3 text-dim">
                    {item.routedTo ?? (
                      <span className="text-dim/60" title="ICM #280 routing not yet wired">
                        unrouted
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-dim">
                  Queue is empty. Inbound chat sessions and tickets appear here once the
                  backend chat process and Autotask sync run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
