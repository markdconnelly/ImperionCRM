import { NextResponse } from "next/server";
import { queryMetric } from "@/lib/metrics/query";
import type { MetricParamsWire } from "@/lib/services";

/**
 * GET one governed metric's VALUE for the signed-in caller (#1115, epic #1050) — the agent +
 * BI single read path.
 *
 *   GET /api/metrics/:key?period=&period_start=&period_end=
 *     -> 200 { key, name, value, unit, grain, asOf, dataClass, status, message? }
 *        404 when no such active metric.
 *
 * Delegates to the metric query interface (`@/lib/metrics/query`), which enforces the
 * data_class read axis (#1034) and then resolves the scalar through the BACKEND metric engine
 * (`/orchestration/metrics/{key}`) — the SAME path the `metric_lookup` sub-agent tool uses, so
 * an agent and this BI surface agree by construction. The FE never executes the metric SQL; it
 * forwards only the key + temporal params, which the engine binds against pre-vetted
 * definitions. `status` carries `unbound` / `forbidden` / `not_configured` / `error` as DATA,
 * not an HTTP failure (one structured shape) — only a missing metric is a 404. The value is
 * intentionally NOT logged (could be financial / sensitive). Auth enforced by middleware.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const url = new URL(request.url);
  const raw: MetricParamsWire = {};
  for (const k of ["period", "period_start", "period_end"] as const) {
    const v = url.searchParams.get(k);
    if (v != null) raw[k] = v;
  }

  const result = await queryMetric(key, raw);
  return NextResponse.json(result, { status: result.status === "not_found" ? 404 : 200 });
}
