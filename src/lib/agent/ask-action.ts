"use server";

import { auth } from "@/auth";
import { getPool } from "@/lib/db/client";
import { agentService } from "@/lib/services";
import { ServiceNotConfiguredError } from "@/lib/services/external-client";

/** What the panel renders for one orchestrator turn. */
export interface AskAgentResult {
  text: string;
  /** Set when the agent drafted an approval-gated action (send) — shown as a notice. */
  requiresApproval?: boolean;
}

/**
 * One orchestrator turn from the right-hand agent panel (backend ADR-0036).
 *
 * Resolves the signed-in employee to their `app_user.id` (the backend enforces the
 * acting user's scope on every tool call) and forwards the message. Degrades to a
 * clear notice when AGENT_SERVICE_URL isn't configured; never throws to the client.
 */
export async function askAgentAction(
  message: string,
  conversationId?: string,
): Promise<AskAgentResult> {
  const trimmed = message.trim();
  if (!trimmed) return { text: "Ask me something and I'll get to work." };

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { text: "Sign in again — I couldn't resolve your identity." };

  // app_user lookup by email — same resolution the connections repo uses.
  const pool = getPool();
  if (!pool) return { text: "The database isn't configured in this environment." };
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM app_user WHERE lower(email) = lower($1) ORDER BY created_at LIMIT 1`,
    [email],
  );
  const actingUserId = rows[0]?.id;
  if (!actingUserId) {
    return { text: `No app user exists for ${email} yet — open Settings to provision your account.` };
  }

  try {
    const reply = await agentService.ask({
      message: trimmed,
      actingUserId,
      ...(conversationId ? { conversationId } : {}),
    });
    return {
      text: reply.text,
      ...(reply.requiresApproval ? { requiresApproval: true } : {}),
    };
  } catch (err) {
    if (err instanceof ServiceNotConfiguredError) {
      return { text: "The agent backend isn't wired up in this environment yet (AGENT_SERVICE_URL unset)." };
    }
    console.error("askAgentAction failed:", err);
    return { text: "Something went wrong reaching the orchestrator — try again in a moment." };
  }
}
