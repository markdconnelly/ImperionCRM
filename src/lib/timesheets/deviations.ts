/**
 * Time-reconciliation deviations read for the timesheets UI (ADR-0082, #502).
 *
 * Fetches the six typed Deviations the backend computes over silver `time_record`
 * (backend ADR-0046, `POST /orchestration/time-reconciliation`) and folds every failure
 * into an empty list. The memory-jogger (#464) and admin approval view (#465) already
 * render the per-day verdict from `time_reconciliation_day`; these deviations are the
 * richer overlay (overlap + temporal orphan the view can't express). When the backend is
 * unconfigured/unreachable in an environment, the surfaces render exactly as before —
 * graceful degradation (ADR-0018), never a failed page.
 *
 * Server-only. The caller passes a timesheet id it has already authorized (the page scopes
 * to the signed-in employee or the admin review queue); this read adds no comp data.
 */
import "server-only";
import { timeReconciliationService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import type { TimeDeviation } from "@/types";

/** The six deviations for a timesheet, or `[]` when the backend isn't reachable/configured. */
export async function getTimeDeviations(timesheetId: string): Promise<TimeDeviation[]> {
  const outcome = await callServiceWithFallback(
    () => timeReconciliationService.reconcile({ timesheetId }),
    {
      label: "getTimeDeviations",
      notConfigured: "Time reconciliation backend isn't wired in this environment.",
      failed: "Couldn't load reconciliation deviations.",
    },
  );
  return outcome.ok ? outcome.value.deviations : [];
}
