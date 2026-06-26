"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import type { SocialPostChannelRow } from "@/types";
import type { ApproveActionResult } from "@/lib/agent/ask-action";

/** Channels with a seeded publish Social Action (migration 0209). */
const PUBLISHABLE_CHANNELS = new Set(["facebook", "instagram", "threads"]);

export type ProposeSocialPublish = (input: {
  socialPostId: string;
  channel: string;
}) => Promise<ApproveActionResult>;

export type ProposeSocialBoost = (input: {
  socialPostId: string;
  budgetUsd: number;
}) => Promise<ApproveActionResult>;

/**
 * The post detail action strip (ADR-0124 #4/#6, slice B #1358). Per-channel PUBLISH (a
 * draft/scheduled `social_post_channel` → its seeded `social_publish_*` kind) and BOOST (a
 * published post → a paid ad, `social_boost_post`). Each button PROPOSES the governed Social
 * Action through the pending-action cockpit (ADR-0058) — human-approved in v1, never a direct
 * send. `canManage` is the marketing write gate. Boost is `financial` (ADR-0109 HARD money
 * ceiling) so it's only offered once the post has at least one published channel.
 */
export function SocialPostActions({
  socialPostId,
  channels,
  canManage,
  proposePublishAction,
  proposeBoostAction,
}: {
  socialPostId: string;
  channels: SocialPostChannelRow[];
  canManage: boolean;
  proposePublishAction: ProposeSocialPublish;
  proposeBoostAction: ProposeSocialBoost;
}) {
  const [notice, setNotice] = useState<ApproveActionResult | null>(null);
  const [budget, setBudget] = useState("50");
  const [pending, startTransition] = useTransition();
  const hasPublished = channels.some((c) => c.publishStatus === "published");

  function publish(channel: string) {
    startTransition(async () => {
      setNotice(await proposePublishAction({ socialPostId, channel }));
    });
  }

  function boost() {
    startTransition(async () => {
      setNotice(await proposeBoostAction({ socialPostId, budgetUsd: Number(budget) }));
    });
  }

  return (
    <section className="rounded-xl border border-border bg-panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="Send" size={14} className="text-dim" />
        <h3 className="font-display text-sm font-semibold tracking-tight">Outbound actions</h3>
        <span className="text-[11px] text-dim">Belle proposes · human approves in the cockpit</span>
      </div>

      {notice ? (
        <p
          className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
            notice.ok
              ? "border-emerald-500/40 text-emerald-300"
              : "border-amber-500/40 text-amber-300"
          }`}
          role="status"
        >
          {notice.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {channels.map((c) =>
          PUBLISHABLE_CHANNELS.has(c.channel) ? (
            <button
              key={c.id}
              type="button"
              onClick={() => publish(c.channel)}
              disabled={!canManage || pending || c.publishStatus === "published"}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium capitalize hover:bg-bg disabled:opacity-50"
              title={
                c.publishStatus === "published"
                  ? "Already published"
                  : `Propose publishing to ${c.channel}`
              }
            >
              <Icon name="Send" size={12} className="mr-1 inline" />
              Publish {c.channel}
            </button>
          ) : null,
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <label className="text-xs text-dim" htmlFor="boost-budget">
          Boost budget (USD)
        </label>
        <input
          id="boost-budget"
          type="number"
          min={1}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          disabled={!canManage || pending}
          className="w-24 rounded-md border border-border bg-bg px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={boost}
          disabled={!canManage || pending || !hasPublished || !(Number(budget) > 0)}
          className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-bg disabled:opacity-50"
          title={
            hasPublished
              ? "Propose boosting this post into a paid ad"
              : "Boost is available once a channel is published"
          }
        >
          <Icon name="TrendingUp" size={12} className="mr-1 inline" />
          Boost post
        </button>
        <span className="text-[11px] text-amber-300/80">financial · always Mark-gated</span>
      </div>

      {!canManage ? (
        <p className="mt-2 text-[11px] text-dim">
          Read-only — proposing a Social Action requires a marketing role.
        </p>
      ) : null}
    </section>
  );
}
