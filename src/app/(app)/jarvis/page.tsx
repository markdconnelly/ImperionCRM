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
  // Only mock mode (no DB) gets the sample set. When a DB IS configured but the acting
  // user can't be resolved — break-glass (no Entra oid) or an unprovisioned app_user —
  // return an empty list instead of querying the uuid `created_by` column with the
  // non-uuid "mock-user" sentinel, which threw `invalid input syntax for type uuid` (#1294).
  const conversations = acting.ok
    ? await listConversations(acting.id)
    : acting.reason === "no_database"
      ? await listConversations("mock-user") // mock mode returns its sample set
      : [];
  return <JarvisConsole initialConversations={conversations} />;
}
