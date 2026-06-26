"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import type { SocialInboxItem } from "@/types";
import type { ApproveActionResult } from "@/lib/agent/ask-action";
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

/** The channels with a seeded reply Social Action (migration 0209) — others have no reply yet. */
const REPLYABLE_CHANNELS = new Set(["facebook", "instagram", "messenger", "threads"]);

/** A reply box drives this signature — maps to the channel's seeded `social_reply_*` kind. */
export type ProposeSocialReply = (input: {
  engagementId: string;
  channel: string;
  text: string;
  isDirect?: boolean;
}) => Promise<ApproveActionResult>;

/**
 * The unified Social inbox list (ADR-0124 #2 inbound split). Each row is either a private DM
 * (from the interaction timeline) or a public comment/mention (social_engagement), with its
 * channel, author, body, intent tag, and triage status. Replying PROPOSES a governed Social
 * Action (`social_reply_*`) through the pending-action cockpit (ADR-0058) — human-approved in
 * v1, never a direct send. `canReply` is the marketing write gate; channels without a seeded
 * reply kind render no reply button.
 */
export function SocialInbox({
  items,
  proposeReplyAction,
  canReply,
}: {
  items: SocialInboxItem[];
  proposeReplyAction: ProposeSocialReply;
  canReply: boolean;
}) {
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
        <InboxItem
          key={`${it.origin}-${it.id}`}
          item={it}
          proposeReplyAction={proposeReplyAction}
          canReply={canReply}
        />
      ))}
    </ul>
  );
}

function InboxItem({
  item: it,
  proposeReplyAction,
  canReply,
}: {
  item: SocialInboxItem;
  proposeReplyAction: ProposeSocialReply;
  canReply: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<ApproveActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const replyable = REPLYABLE_CHANNELS.has(it.channel);

  function submit() {
    startTransition(async () => {
      const result = await proposeReplyAction({
        engagementId: it.id,
        channel: it.channel,
        text,
        isDirect: it.origin === "dm",
      });
      setNotice(result);
      if (result.ok) {
        setText("");
        setOpen(false);
      }
    });
  }

  return (
    <li className="rounded-lg border border-border bg-panel p-3">
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
            <span className="font-medium text-text">{it.author ?? "Unknown"}</span>
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
              <span className={INTENT_TONE[it.intent] ?? "text-dim"}>intent: {it.intent}</span>
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
        {replyable ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            disabled={!canReply}
            className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-bg disabled:opacity-50"
            title={canReply ? "Draft a reply" : "Replying requires a marketing role"}
          >
            <Icon name="Reply" size={12} className="mr-1 inline" />
            Reply
          </button>
        ) : null}
      </div>

      {notice ? (
        <p
          className={`mt-2 rounded-md border px-2 py-1 text-[11px] ${
            notice.ok
              ? "border-emerald-500/40 text-emerald-300"
              : "border-amber-500/40 text-amber-300"
          }`}
          role="status"
        >
          {notice.message}
        </p>
      ) : null}

      {open ? (
        <div className="mt-2 flex flex-col gap-1.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={2}
            disabled={pending}
            placeholder="Draft a reply — Belle's voice, human-approved in the action cockpit before it posts."
            aria-label="Social reply text"
            className="w-full resize-y rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={pending || text.trim() === ""}
              className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {pending ? "Proposing…" : "Propose reply"}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
