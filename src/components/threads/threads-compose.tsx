"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import type { ApproveActionResult } from "@/lib/agent/ask-action";

/**
 * Threads compose box (epic #1334 S5). Belle drafts a post; submitting PROPOSES it through
 * the governed Social Action path (`proposeThreadsPostAction` → pending-action cockpit) — it
 * never sends directly (customer-facing HARD ceiling, ADR-0125 D3). Mirrors the grants-admin
 * server-action + notice pattern. `canPost` is the marketing write gate; when the backend is
 * unconfigured/dormant the action returns a clear notice, so the button stays enabled but the
 * surface stays honest.
 */
export function ThreadsCompose({
  proposeAction,
  canPost,
}: {
  proposeAction: (text: string) => Promise<ApproveActionResult>;
  canPost: boolean;
}) {
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<ApproveActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const remaining = 500 - text.length;

  function submit() {
    startTransition(async () => {
      const result = await proposeAction(text);
      setNotice(result);
      if (result.ok) setText("");
    });
  }

  return (
    <section className="rounded-xl border border-border bg-panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="AtSign" size={14} className="text-dim" />
        <h3 className="font-display text-sm font-semibold tracking-tight">Compose</h3>
        <span className="text-[11px] text-dim">
          Belle drafts · human approves in the action cockpit
        </span>
      </div>

      {notice && (
        <p
          className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
            notice.ok ? "border-green/40 text-green" : "border-amber/40 text-amber"
          }`}
          role="status"
        >
          {notice.message}
        </p>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        rows={3}
        disabled={!canPost || pending}
        placeholder="What's happening on our Threads?"
        aria-label="Threads post text"
        className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm disabled:opacity-60"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-dim">{remaining} left</span>
        <button
          type="button"
          onClick={submit}
          disabled={!canPost || pending || text.trim() === ""}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {pending ? "Proposing…" : "Propose post"}
        </button>
      </div>
      {!canPost && (
        <p className="mt-2 text-[11px] text-dim">
          Read-only — proposing a Threads post requires a marketing role.
        </p>
      )}
    </section>
  );
}
