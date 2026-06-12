/**
 * Read-side for the cost-rollup card (#184, v1 gate 9).
 *
 * The rollup is computed by the backend (GET /agent/cost-rollup, backend #65)
 * over the ADR-0032 usage audit rows — there is no DB fallback here on purpose:
 * the aggregation SQL lives in ONE place (the backend), and the card degrades
 * to a notice when the backend isn't configured/reachable (the same posture as
 * saving on the Orchestrator card). Goes through the #190 call-guard seam.
 *
 * Server-only.
 */
import "server-only";
import { agentService, type CostRollupWire } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";

/** What the card renders: the rollup, or a notice explaining why not. */
export type CostRollupState =
  | { ok: true; rollup: CostRollupWire }
  | { ok: false; note: string };

export async function getCostRollupState(month?: string): Promise<CostRollupState> {
  const outcome = await callServiceWithFallback(() => agentService.costRollup(month), {
    label: "getCostRollupState",
    notConfigured:
      "The agent backend isn't wired up in this environment (AGENT_SERVICE_URL unset) — per-process spend appears once it is.",
    failed: "Couldn't reach the cost-rollup endpoint — spend figures are temporarily unavailable.",
  });
  return outcome.ok ? { ok: true, rollup: outcome.value } : { ok: false, note: outcome.message };
}
