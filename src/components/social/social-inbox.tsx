import { Icon } from "@/components/ui/icon";
import type { SocialInboxItem } from "@/types";
import {
  SOCIAL_CHANNELS,
  ENGAGEMENT_STATUS_TONE,
  INBOX_KIND_LABEL,
} from "@/lib/social";

const CHANNEL_ICON: Record<string, string> = Object.fromEntries(
  SOCIAL_CHANNELS.map((c) => [c.key, c.icon]),
);

const INTENT_TONE: Record<string, string> = {
  lead: "text-emerald-400",
  support: "text-sky-400",
  brand: "text-violet-400",
};

/**
 * The unified Social inbox list (ADR-0124 #2 inbound split). Each row is either a private
 * DM (from the interaction timeline) or a public comment/mention (social_engagement), with
 * its channel, author, body, intent tag, and triage status. Read-only in this slice —
 * reply is a cockpit-gated Social Action wired in the follow-up.
 */
export function SocialInbox({ items }: { items: SocialInboxItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel p-8 text-center text-sm text-dim">
        No inbound social activity yet — DMs, comments, and mentions arrive as the connected
        networks are polled.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((it) => (
        <li
          key={`${it.origin}-${it.id}`}
          className="rounded-lg border border-border bg-panel p-3"
        >
          <div className="flex items-start gap-3">
            <Icon
              name={CHANNEL_ICON[it.channel] ?? "MessageSquare"}
              size={16}
              className="mt-0.5 shrink-0 text-dim"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="rounded bg-panel-2 px-1.5 py-0.5 font-medium text-dim">
                  {INBOX_KIND_LABEL[it.kind] ?? it.kind}
                </span>
                <span className="font-medium text-text">
                  {it.author ?? "Unknown"}
                </span>
                {it.contact && it.contact !== it.author ? (
                  <span className="text-dim">· {it.contact}</span>
                ) : null}
                <span className="capitalize text-dim">· {it.channel}</span>
                {it.occurredAt ? <span className="text-dim">· {it.occurredAt}</span> : null}
              </div>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-text">
                {it.body ?? <span className="text-dim">(no text)</span>}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                {it.engagementStatus ? (
                  <span className={ENGAGEMENT_STATUS_TONE[it.engagementStatus] ?? "text-dim"}>
                    {it.engagementStatus}
                  </span>
                ) : null}
                {it.intent ? (
                  <span className={INTENT_TONE[it.intent] ?? "text-dim"}>
                    intent: {it.intent}
                  </span>
                ) : null}
                {it.assignedAgentKey ? (
                  <span className="text-dim">→ {it.assignedAgentKey}</span>
                ) : null}
                {it.sourceUrl ? (
                  <a
                    href={it.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline"
                  >
                    source
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
