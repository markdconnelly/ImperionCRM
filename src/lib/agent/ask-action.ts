"use server";

import { agentService, type ProposedAction } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import { resolveActingUser } from "@/lib/services/acting-user";
import { resolveAction } from "@/lib/agent/action-catalog";

/** What the panel renders for one orchestrator turn. */
export interface AskAgentResult {
  text: string;
  /** Set when the agent drafted an approval-gated action (send) — shown as a notice. */
  requiresApproval?: boolean;
  /**
   * The generalized proposed-action envelope (backend #282 / issue #1130). The approval
   * surface renders these — gated/labelled by tier + dataClass — and submits each entry's
   * `input` VERBATIM via {@link approveProposedAction}. Empty/undefined = nothing to approve.
   */
  proposedActions?: ProposedAction[];
}

/**
 * Normalize the orchestrator reply's proposed-action surface to the generalized envelope
 * (#1130). Prefers `proposedActions[]`; if only the legacy single-action comms projection
 * is present (a backend mid-migration / older deploy), project it into a one-element
 * envelope so the approval surface keeps working without relying on the legacy shape. The
 * back-compat projection is dropped on the backend as a coordinated follow-up.
 */
function toProposedActions(reply: {
  proposedActions?: ProposedAction[];
  proposedAction?: { kind: string; contactId: string; channel: string; body: string };
}): ProposedAction[] {
  if (reply.proposedActions?.length) return reply.proposedActions;
  const legacy = reply.proposedAction;
  if (!legacy) return [];
  // Legacy projection → envelope: a comms send is a T2 client-facing, client_pii action.
  return [
    {
      kind: legacy.kind,
      input: {
        kind: legacy.kind,
        contactId: legacy.contactId,
        channel: legacy.channel,
        body: legacy.body,
      },
      tier: "T2",
      dataClass: "client_pii",
      targetContactId: legacy.contactId,
    },
  ];
}

/** Result of approving a single proposed action from the live agent reply. */
export interface ApproveActionResult {
  ok: boolean;
  /** A user-facing message describing what happened (sent / blocked / not configured / failed). */
  message: string;
}

/**
 * One orchestrator turn from the right-hand agent panel (backend ADR-0036).
 *
 * Resolves the signed-in employee to their `app_user.id` via the shared resolver
 * (#190 — the backend enforces the acting user's scope on every tool call) and
 * forwards the message through the call-guard seam. Degrades to a clear notice
 * when AGENT_SERVICE_URL isn't configured; never throws to the client.
 */
export async function askAgentAction(
  message: string,
  conversationId?: string,
): Promise<AskAgentResult> {
  const trimmed = message.trim();
  if (!trimmed) return { text: "Ask me something and I'll get to work." };

  const acting = await resolveActingUser();
  if (!acting.ok) {
    switch (acting.reason) {
      case "no_session":
        return { text: "Sign in again — I couldn't resolve your identity." };
      case "no_database":
        return { text: "The database isn't configured in this environment." };
      case "not_provisioned":
        return {
          text: `No app user exists for ${acting.email} yet — open Settings to provision your account.`,
        };
    }
  }

  const outcome = await callServiceWithFallback(
    () =>
      agentService.ask({
        message: trimmed,
        actingUserId: acting.id,
        ...(conversationId ? { conversationId } : {}),
      }),
    {
      label: "askAgentAction",
      notConfigured:
        "The agent backend isn't wired up in this environment yet (AGENT_SERVICE_URL unset).",
      failed: "Something went wrong reaching the orchestrator — try again in a moment.",
    },
  );
  if (!outcome.ok) return { text: outcome.message };

  const proposedActions = toProposedActions(outcome.value);
  return {
    text: outcome.value.text,
    ...(outcome.value.requiresApproval ? { requiresApproval: true } : {}),
    ...(proposedActions.length ? { proposedActions } : {}),
  };
}

/**
 * Approve and execute ONE agent-proposed action from the live reply (#1130). First resolves
 * + validates the action against the action-contract catalog (ADR-0107 D2 / #994) — an
 * unregistered kind or schema-invalid payload is refused locally, never forwarded. Then
 * submits the envelope's `input` VERBATIM to the backend's approval-gated executor (the ONLY
 * send path — backend ADR-0033) via {@link agentService.executeProposedAction}; the acting
 * employee is recorded as the approver (ADR-0055) and the backend re-asserts consent at
 * execution (403 consent_denied → blocked notice, ADR-0058). Never throws to the client;
 * degrades to a clear notice when the backend is unconfigured.
 */
export async function approveProposedAction(
  action: ProposedAction["input"],
): Promise<ApproveActionResult> {
  // Resolve the action against the catalog (ADR-0107 D2 / #994) BEFORE forwarding. A REGISTERED
  // kind whose payload fails its schema is refused here — never forwarded — so a malformed call
  // to a known contract is caught before the round-trip. An unregistered kind passes through to
  // the backend, which is the authoritative validator/dispatcher (#1130 forward-verbatim). The
  // backend always re-asserts consent at execution (ADR-0058) — this pre-flight only tightens.
  const resolved = resolveAction(action);
  if (!resolved.ok) {
    return {
      ok: false,
      message: "Blocked — the action's input didn't pass validation. Nothing was sent.",
    };
  }

  const acting = await resolveActingUser();
  if (!acting.ok) {
    return {
      ok: false,
      message:
        acting.reason === "no_session"
          ? "Sign in again — I couldn't resolve your identity to record the approval."
          : "I couldn't resolve your account to record the approval.",
    };
  }

  const outcome = await callServiceWithFallback(
    () =>
      agentService.executeProposedAction({
        action,
        approval: { approvedByUserId: acting.id, approved: true },
      }),
    {
      label: "approveProposedAction",
      notConfigured:
        "The agent backend isn't wired up in this environment yet (AGENT_SERVICE_URL unset) — nothing was sent.",
      failed: "The action couldn't be executed — nothing was sent. Try again in a moment.",
    },
  );

  if (outcome.ok) return { ok: true, message: "Approved — the action was executed." };
  if (outcome.kind === "rejected" && outcome.status === 403) {
    return { ok: false, message: "Blocked — consent was withdrawn for this recipient. Nothing was sent." };
  }
  return { ok: false, message: outcome.message };
}
