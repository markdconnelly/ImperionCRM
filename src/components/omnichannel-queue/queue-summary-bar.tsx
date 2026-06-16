import { Icon } from "@/components/ui/icon";
import type { QueueChannel, QueueSummary } from "@/types";

/** Human label + lucide icon for each unified channel (ADR-0074 §6). */
const CHANNEL_META: Record<QueueChannel, { label: string; icon: string }> = {
  web_chat: { label: "Web chat", icon: "MessageCircle" },
  social: { label: "Social", icon: "Share2" },
  email: { label: "Email", icon: "Mail" },
  sms: { label: "SMS", icon: "MessageSquare" },
  voice: { label: "Voice", icon: "Phone" },
  ticket: { label: "Tickets", icon: "Ticket" },
  other: { label: "Other", icon: "Inbox" },
};

/**
 * The queue headline (ADR-0074 §6): total / open / urgent stat cards plus an
 * open-by-channel breakdown. Pure presentational — counts come from
 * `summarizeQueue` (lib/omnichannel-queue.ts).
 */
export function QueueSummaryBar({ summary }: { summary: QueueSummary }) {
  const channels = Object.entries(summary.byChannel) as [QueueChannel, number][];
  return (
    <section className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="In queue" value={summary.total} icon="Inbox" />
        <Stat label="Open" value={summary.open} icon="CircleDot" tone="accent" />
        <Stat label="Urgent" value={summary.urgent} icon="Flame" tone="red" />
      </div>
      {channels.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-panel px-4 py-3">
          <span className="text-xs text-dim">Open by channel:</span>
          {channels.map(([channel, count]) => {
            const meta = CHANNEL_META[channel];
            return (
              <span
                key={channel}
                className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-2.5 py-1 text-xs text-dim"
              >
                <Icon name={meta.icon} size={12} />
                {meta.label}
                <span className="text-text">{count}</span>
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: string;
  tone?: "accent" | "red";
}) {
  const toneClass =
    tone === "red" ? "text-red" : tone === "accent" ? "text-accent" : "text-text";
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-panel px-4 py-3">
      <div className="flex flex-col">
        <span className="text-xs text-dim">{label}</span>
        <span className={`font-display text-2xl font-semibold tracking-tight ${toneClass}`}>
          {value}
        </span>
      </div>
      <Icon name={icon} size={20} className={`${toneClass} opacity-60`} />
    </div>
  );
}
