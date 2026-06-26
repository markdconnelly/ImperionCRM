"use server";

/**
 * Threads outbound — the front-end propose path for the Threads management surface
 * (epic #1334 S5, ADR-0125 D3 / D6). Belle (marketing) drafts a Threads post or a reply;
 * a human approves it through the ONE Social Action gauntlet + pending-action cockpit
 * (ADR-0124 D4 / ADR-0107). This module is the thin server-action wrapper the GUI compose
 * box + reply queue call: it builds the generalized {@link ProposedAction} envelope for the
 * `publish_threads` / `reply_threads` catalog kinds (registered in {@link ./action-catalog})
 * and forwards it VERBATIM through the shared {@link approveProposedAction} choke point — the
 * same approval-gated executor every other governed action uses (no bespoke send path).
 *
 * GOVERNANCE (ADR-0125 D3, ADR-0109/0121): a public Threads post/reply is CUSTOMER-FACING,
 * a HARD autonomy ceiling — tier T3, `mark_gated`, never auto-executes above the ceiling.
 * The backend re-asserts the grant + ceiling + dormancy (token + App Review) at execution;
 * this front-end half only proposes. Dormant/fail-closed until S4 (BE #417) + the token land.
 */

import { approveProposedAction, type ApproveActionResult } from "@/lib/agent/ask-action";
import type { ProposedAction } from "@/lib/services";

// Belle's Threads grant contract lives in `./threads-grant` (a pure module) — a `"use server"`
// file may only export async functions, so the constant cannot live here.

/**
 * Propose a new Threads post (compose box). Belle's draft, T3 customer-facing → the cockpit.
 * Forwards verbatim through {@link approveProposedAction}; the backend is dormant/fail-closed
 * until S4 + the conn-company-threads token + App Review land, so this returns a clear notice
 * rather than sending in this phase.
 */
export async function proposeThreadsPostAction(text: string): Promise<ApproveActionResult> {
  const body = text.trim();
  if (!body) return { ok: false, message: "Write something to post first." };
  const action: ProposedAction["input"] = { kind: "publish_threads", text: body };
  return approveProposedAction(action);
}

/**
 * Propose a reply to a Threads post/reply/mention (reply queue + mentions inbox). `replyToId`
 * is the external_ref of the interaction (source=threads) being replied to. Same governed
 * path + dormancy as {@link proposeThreadsPostAction}.
 */
export async function proposeThreadsReplyAction(
  replyToId: string,
  text: string,
): Promise<ApproveActionResult> {
  const target = replyToId.trim();
  const body = text.trim();
  if (!target) return { ok: false, message: "No Threads post selected to reply to." };
  if (!body) return { ok: false, message: "Write a reply first." };
  const action: ProposedAction["input"] = { kind: "reply_threads", replyToId: target, text: body };
  return approveProposedAction(action);
}
