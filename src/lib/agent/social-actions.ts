"use server";

/**
 * Social Media Management plane outbound — the front-end PROPOSE path (ADR-0124 #4, epic
 * #1338 slice B #1358). Belle (Marketing) replies to an inbox engagement, publishes a draft
 * social_post per channel, or boosts a published post into a paid ad; a human approves it
 * through the ONE Social Action gauntlet + pending-action cockpit (ADR-0058) — the front end
 * never sends and never calls Meta. This module is the thin `"use server"` wrapper the inbox
 * reply box + the post detail page call: it maps the surface intent to the right one of the
 * 11 seeded `action_kind`s (migration 0209 / BE #418), builds the generalized
 * {@link ProposedAction} envelope, and forwards it VERBATIM through the shared
 * {@link approveProposedAction} choke point — the same approval-gated executor every governed
 * action uses (no bespoke send path), exactly like {@link ./threads-actions}.
 *
 * GOVERNANCE (ADR-0124 #4, ADR-0109/0121): a social post/reply/boost is CUSTOMER-FACING, a
 * HARD autonomy ceiling — tier T3, never auto-executes above the ceiling; v1 every Social
 * Action is human-approved. The 4 ad/boost kinds are `financial` (ADR-0109 HARD money
 * ceiling). The backend re-asserts the grant + ceiling + per-channel token dormancy at
 * execution; this front-end half only proposes. Dormant/fail-closed until the connectors +
 * tokens land + Meta App Review clears — the expected state.
 */

import { approveProposedAction, type ApproveActionResult } from "@/lib/agent/ask-action";

/** A reply target's channel → the seeded reply `action_kind`. Only the channels with a seeded
 *  reply kind (migration 0209) are routable; everything else has no reply Social Action yet. */
const REPLY_KIND_BY_CHANNEL: Record<string, string> = {
  facebook: "social_reply_fb_comment",
  instagram: "social_reply_ig_comment",
  messenger: "social_reply_ig_comment", // Messenger DM threads share the IG reply executor (Meta Inbox)
  threads: "social_reply_threads",
};

/** A DM origin on instagram routes to the direct-message reply kind, distinct from a comment. */
const DM_REPLY_KIND_BY_CHANNEL: Record<string, string> = {
  instagram: "social_reply_ig_direct",
};

/** A publish target's channel → the seeded publish `action_kind`. */
const PUBLISH_KIND_BY_CHANNEL: Record<string, string> = {
  facebook: "social_publish_fb_post",
  instagram: "social_publish_ig_media",
  threads: "social_post_threads",
};

/**
 * Propose a REPLY to an inbox engagement (DM / comment / mention). `engagementId` is the
 * inbox row id (a `social_engagement.id` for a public engagement, an `interaction.id` for a
 * DM); `channel` selects the seeded reply kind; `isDirect` routes an instagram DM to the
 * direct-message kind. Refused locally (never forwarded) when the channel has no seeded reply
 * kind, the target is missing, or the body is empty. Same governed path + dormancy as Threads.
 */
export async function proposeSocialReplyAction(input: {
  engagementId: string;
  channel: string;
  text: string;
  isDirect?: boolean;
}): Promise<ApproveActionResult> {
  const engagementId = input.engagementId.trim();
  const body = input.text.trim();
  if (!engagementId) return { ok: false, message: "No inbox item selected to reply to." };
  if (!body) return { ok: false, message: "Write a reply first." };

  const kind =
    (input.isDirect ? DM_REPLY_KIND_BY_CHANNEL[input.channel] : undefined) ??
    REPLY_KIND_BY_CHANNEL[input.channel];
  if (!kind) {
    return { ok: false, message: `Replying on ${input.channel} isn't a wired Social Action yet.` };
  }
  return approveProposedAction({ kind, engagementId, text: body });
}

/**
 * Propose PUBLISHING one channel of a draft/scheduled `social_post` (the detail page's
 * per-channel publish button). `socialPostId` is the parent post; `channel` selects the
 * seeded publish kind. Refused locally when the channel has no publish kind or the id is
 * missing. The backend resolves the per-channel token + fans the composition out at approval.
 */
export async function proposeSocialPublishAction(input: {
  socialPostId: string;
  channel: string;
}): Promise<ApproveActionResult> {
  const socialPostId = input.socialPostId.trim();
  if (!socialPostId) return { ok: false, message: "No post selected to publish." };
  const kind = PUBLISH_KIND_BY_CHANNEL[input.channel];
  if (!kind) {
    return { ok: false, message: `Publishing to ${input.channel} isn't a wired Social Action yet.` };
  }
  return approveProposedAction({ kind, socialPostId });
}

/**
 * Propose BOOSTING a published post into a paid ad (ADR-0124 #6 — the Boost bridge, mints an
 * `ad` with `boosted_from_social_post_id`). `budgetUsd` is the spend cap the approver sets.
 * This is a `financial` Social Action (ADR-0109 HARD money ceiling) — always cockpit-gated,
 * never auto-executed. Refused locally for a missing post or a non-positive budget.
 */
export async function proposeSocialBoostAction(input: {
  socialPostId: string;
  budgetUsd: number;
}): Promise<ApproveActionResult> {
  const socialPostId = input.socialPostId.trim();
  if (!socialPostId) return { ok: false, message: "No post selected to boost." };
  if (!(input.budgetUsd > 0)) {
    return { ok: false, message: "Set a positive budget to boost this post." };
  }
  return approveProposedAction({ kind: "social_boost_post", socialPostId, budgetUsd: input.budgetUsd });
}
