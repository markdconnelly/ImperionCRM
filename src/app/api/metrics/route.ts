import { NextResponse } from "next/server";
import { listGovernedMetrics } from "@/lib/metrics/query";

/**
 * GET the governed-metric CATALOG the signed-in caller may read (#1115, epic #1050).
 *
 *   GET /api/metrics  ->  { metrics: GovernedMetric[] }
 *
 * The BI metric picker reads this to list which governed numbers exist + their contracts
 * (name/grain/unit/owner/data_class, and whether the backend can evaluate each now). A
 * definition is a formula over aggregates, never row-level data, so this is a direct DB read
 * for rendering (CLAUDE.md §1). Results are filtered to the caller's data_class read ceiling
 * (#1034) on TOP of the database RLS floor — the picker never offers a metric the caller
 * cannot resolve. Auth is enforced by middleware (every /api route bar /api/auth needs a
 * session). Degrades to an empty catalog in mock mode / before the user is provisioned.
 */
export async function GET() {
  const metrics = await listGovernedMetrics();
  return NextResponse.json({ metrics });
}
