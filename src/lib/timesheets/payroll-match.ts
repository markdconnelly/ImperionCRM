/**
 * Payroll QuickBooks-match read for the payroll-approval UI (ADR-0082, #466).
 *
 * Asks the backend Payroll Reconciliation (BE #105) for the QuickBooks payment it
 * matched to one timesheet (expected hours × effective Pay Rate vs the authoritative
 * QuickBooks vendor payment — the comp math runs in the backend ALONE, ADR-0082
 * §Security). The suggestion that crosses the boundary is comp-free: only the matched
 * payment fact (ref + date), never a rate or amount. The CFO confirms it to set Paid.
 *
 * Every failure folds to `null` — `not_configured` when BE #105 / the QuickBooks app
 * registration isn't wired yet (Mark-gated), `rejected`/`unreachable` otherwise. The
 * surface then degrades to manual confirm (acceptable for UAT, ADR-0082 + the test plan)
 * rather than failing the page (graceful degradation, ADR-0018).
 *
 * Server-only. The caller passes a timesheet id it has already authorized (the page is
 * gated to `time:payroll-approve`). No comp data crosses this seam.
 */
import "server-only";
import { payrollReconciliationService } from "@/lib/services";
import { callServiceWithFallback } from "@/lib/services/call-guard";
import type { PayrollMatchSuggestion } from "@/types";

/** The suggested QuickBooks match for a timesheet, or `null` when the backend isn't reachable. */
export async function getPayrollMatch(
  timesheetId: string,
): Promise<PayrollMatchSuggestion | null> {
  const outcome = await callServiceWithFallback(
    () => payrollReconciliationService.suggestMatch({ timesheetId }),
    {
      label: "getPayrollMatch",
      notConfigured: "Payroll reconciliation backend isn't wired in this environment.",
      failed: "Couldn't load the QuickBooks payment match.",
    },
  );
  return outcome.ok ? outcome.value : null;
}
