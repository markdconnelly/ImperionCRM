"use server";

import { getConversationDetail, type JarvisConversationDetail } from "@/lib/agent/jarvis";
import { resolveActingUser } from "@/lib/services/acting-user";

/**
 * Load one conversation's runs + stages for the Jarvis drill-in pop-out (#1118).
 * Scoped to the signed-in employee (ADR-0016); the read degrades to mock/null on
 * its own when the DB/backend is unset. Never throws to the client.
 */
export async function loadConversationDetailAction(
  conversationId: string,
): Promise<JarvisConversationDetail | null> {
  const acting = await resolveActingUser();
  // Mock mode (no DB): pass a sentinel so the reader returns its mock detail.
  const userId = acting.ok ? acting.id : "mock-user";
  return getConversationDetail(conversationId, userId);
}
