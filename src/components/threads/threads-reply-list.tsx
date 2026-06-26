"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import type { InteractionRow } from "@/types";
import type { ApproveActionResult } from "@/lib/agent/ask-action";

/**
 * A Threads interaction list with an inline reply box per item (epic #1334 S5). Backs BOTH
 * the reply queue (replies on our posts, kind=social_comment) and the mentions inbox
 * (kind=mention). Replying PROPOSES a `reply_threads` action through the governed Social
 * Action path (`proposeThreadsReplyAction` → pending-action cockpit) — never a direct send
 * (customer-facing HARD ceiling, ADR-0125 D3). `replyToId` is the interaction id; the backend
 * (S4 BE #417) resolves it to the Threads post external ref at execution.
 *
 * Renders empty until S3 ingest (LP #356) hydrates the timeline — the expected dormant state.
 */
export function ThreadsReplyList({
  items,
  proposeReplyAction,
  canReply,
  emptyHint,
  inbound,
}: {
  items: InteractionRow[];
  proposeReplyAction: (replyToId: string, text: string) => Promise<ApproveActionResult>;
  canReply: boolean;
  emptyHint: string;
  /** When true (mentions inbox), badge inbound direction; else it's our reply queue. */
  inbound?: boolean;
}) {
  if (items.length === 0) {
    return <p className="px-1 py-6 text-center text-xs text-dim">{emptyHint}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <ReplyItem
          key={item.id}
          item={item}
          proposeReplyAction={proposeReplyAction}
          canReply={canReply}
          inbound={inbound}
        />
      ))}
    </ul>
  );
}

function ReplyItem({
  item,
  proposeReplyAction,
  canReply,
  inbound,
}: {
  item: InteractionRow;
  proposeReplyAction: (replyToId: string, text: string) => Promise<ApproveActionResult>;
  canReply: boolean;
  inbound?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<ApproveActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await proposeReplyAction(item.id, text);
      setNotice(result);
      if (result.ok) {
        setText("");
        setOpen(false);
      }
    });
  }

  return (
    <li className="rounded-lg border border-border/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-medium">
              {item.contact ?? item.account ?? "Threads user"}
            </span>
            {inbound && (
              <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-dim">
                {item.direction ?? "inbound"}
              </span>
            )}
            {item.occurredAt && (
              <span className="text-[10px] text-dim">{item.occurredAt}</span>
            )}
          </div>
          <p className="mt-1 line-clamp-3 text-sm text-text">
            {item.summary ?? item.subject ?? "(no text captured)"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={!canReply}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-bg disabled:opacity-50"
        >
          <Icon name="Reply" size={12} className="mr-1 inline" />
          Reply
        </button>
      </div>

      {notice && (
        <p
          className={`mt-2 rounded-md border px-2 py-1 text-[11px] ${
            notice.ok ? "border-green/40 text-green" : "border-amber/40 text-amber"
          }`}
          role="status"
        >
          {notice.message}
        </p>
      )}

      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={2}
            disabled={pending}
            placeholder="Draft a reply — Belle's voice, human-approved before it posts."
            aria-label="Threads reply text"
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
      )}
    </li>
  );
}
