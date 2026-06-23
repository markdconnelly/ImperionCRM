import { NextResponse } from "next/server";
import { getRepositories } from "@/lib/data";
import { resolveActingUser } from "@/lib/services/acting-user";
import { totalActualCounts } from "@/lib/recon/actual-count";

/**
 * GET the agreement-reconciliation ACTUAL-count aggregation (#1079, epic #1041) — the
 * per-account roll-up of ACTUALLY-deployed units (licensed seats, devices, protected
 * devices), read straight from silver.
 *
 *   GET /api/recon/actual-counts
 *     -> 200 { rows: ActualCountRow[], total: { accountCount, seats, devices, backups } }
 *
 * This is the ACTUAL side only — the contracted side (#1080), drift / under-bill
 * detection (#1081), and cost-vs-bill recon (#1082) are later slices. Read-only.
 *
 * Authz (defense-in-depth, mirrors the work-activity feed): middleware gates a signed-in
 * session, and on top of that this handler requires a *provisioned* acting user
 * (`app_user` row) — an unprovisioned / non-employee session fails closed to an empty
 * aggregation rather than disclosing per-client estate counts. The counts are aggregate
 * (no row-level PII), but the client-by-client breakdown is account-scoped operational
 * data, so we keep it behind the employee gate. The underlying silver is account-keyed
 * already (the SQL excludes account-less rows); account-scoped visibility per-employee is
 * the deferred app-wide ADR (#884).
 */
export async function GET() {
  const acting = await resolveActingUser();
  if (!acting.ok) {
    return NextResponse.json({ rows: [], total: totalActualCounts([]) });
  }

  const { crm } = getRepositories();
  const rows = await crm.listActualCounts();
  return NextResponse.json({ rows, total: totalActualCounts(rows) });
}
