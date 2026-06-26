/**
 * Expiry radar read-model (#1323, renewals epic #1304).
 *
 * A pure READ-VIEW over the existing `contract` silver (Autotask SoR, ADR-0044):
 * active contracts whose `end_date` falls inside a look-ahead window, ordered by
 * lead time, so the renewal motion has a worklist to hang off. No new schema, no
 * write path, no agent (v1 build doctrine, ADR-0123 — human-first read surface).
 *
 * Revenue is NOT redacted here — that is the caller's job (the page applies the
 * `canSeeRevenue` RBAC gate, ADR-0030, before the figure reaches the client), so
 * this model stays a faithful mirror of silver and the gate lives in exactly one
 * place (the reporting-page precedent).
 */
import { getPool } from "@/lib/db/client";
import type { ExpiringContractRow } from "@/types";

export {
  EXPIRY_WINDOWS,
  DEFAULT_EXPIRY_WINDOW,
  parseExpiryWindow,
  type ExpiryWindow,
} from "./expiry-window";

/**
 * Active contracts (status not Inactive) whose `end_date` is between today and
 * `windowDays` from now, ordered by lead time (soonest first). `lead_days` is the
 * whole-day gap to expiry, computed in SQL so the view is deterministic per day.
 * Already-expired contracts are excluded — this is a forward radar, not a lapse log.
 */
export async function listExpiringContracts(
  windowDays: number,
): Promise<ExpiringContractRow[]> {
  const pool = getPool();
  if (!pool) return [];
  try {
    const { rows } = await pool.query<{
      id: string;
      account: string | null;
      name: string | null;
      number: string | null;
      status: string | null;
      category: string | null;
      end_date: string | null;
      lead_days: number | null;
      estimated_revenue: string | null;
    }>(
      `SELECT c.id::text AS id,
              a.name AS account,
              c.name,
              c.contract_number AS number,
              c.status,
              c.category,
              c.end_date::text AS end_date,
              (c.end_date - CURRENT_DATE) AS lead_days,
              c.estimated_revenue::text AS estimated_revenue
         FROM contract c
         LEFT JOIN account a ON a.id = c.account_id
        WHERE c.end_date IS NOT NULL
          AND c.end_date >= CURRENT_DATE
          AND c.end_date <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
          AND COALESCE(c.status, '') <> '2'
        ORDER BY c.end_date ASC, a.name NULLS LAST`,
      [windowDays],
    );
    return rows.map((r) => ({
      id: r.id,
      account: r.account,
      name: r.name,
      number: r.number,
      status: r.status,
      category: r.category,
      endDate: r.end_date,
      leadDays: r.lead_days,
      estimatedRevenue: r.estimated_revenue === null ? null : Number(r.estimated_revenue),
    }));
  } catch {
    // Live data unavailable — surface an empty radar rather than a 500 (the
    // list/reporting-page precedent). The page renders its empty state.
    return [];
  }
}
