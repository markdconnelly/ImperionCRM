"use server";

import { agentService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import { resolveActingUser } from "@/lib/services/acting-user";

/** What the panel renders for one orchestrator turn. */
export interface AskAgentResult {
  text: string;
  /** Set when the agent drafted an approval-gated action (send) — shown as a notice. */
  requiresApproval?: boolean;
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

  return {
    text: outcome.value.text,
    ...(outcome.value.requiresApproval ? { requiresApproval: true } : {}),
  };
}
