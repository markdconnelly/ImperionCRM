import { JarvisConsole } from "@/components/agent/jarvis-console";
import { listConversations } from "@/lib/agent/jarvis";
import { resolveActingUser } from "@/lib/services/acting-user";

export const metadata = { title: "Jarvis · Imperion OS" };

/**
 * Jarvis — the landing page and front door of the OS (#1118, epic #1038).
 *
 * The orchestrator is the WHOLE screen here (no right-hand sidecar — AppShell
 * suppresses it on this route): a codex-style chat (the driver of work), a session
 * history rail, and a drill-in pop-out for the verbose run trace. Reads degrade in
 * the app's tiers (ADR-0007/0042): DB/backend unset → mock sample, never an error.
 */
export default async function JarvisPage() {
  const acting = await resolveActingUser();
  const conversations = acting.ok
    ? await listConversations(acting.id)
    : await listConversations("mock-user"); // mock mode returns its sample set
  return <JarvisConsole initialConversations={conversations} />;
}
