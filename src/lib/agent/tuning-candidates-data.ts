/**
 * Recent tuning candidates (#1037, ADR-0119) — server data-fetch for the feedback loop's read
 * surface. Reads `agent_tuning_candidate` (the Mark-gated proposal ledger filled by the backend
 * harvester/auto-filer, 0176). The web identity has SELECT on the table (0176), so this is a
 * clean direct rendering read (ADR-0042).
 *
 * Degrades like the rest of the app: DB unset → mock sample rows; query failure → empty list,
 * never a page error (the eval-runs-data.ts pattern, ADR-0007).
 *
 * Server-only. Pure types + mapper live in `tuning-candidates.ts`.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import {
  mapTuningCandidateRow,
  MOCK_TUNING_CANDIDATES,
  type TuningCandidateDbRow,
  type TuningCandidateRow,
} from "./tuning-candidates";

/** Last `limit` tuning candidates, open first then newest. */
export async function listRecentTuningCandidates(limit = 20): Promise<TuningCandidateRow[]> {
  const pool = getPool();
  if (!pool) return MOCK_TUNING_CANDIDATES; // mock fallback, same as every module (ADR-0007)

  try {
    const { rows } = await pool.query<TuningCandidateDbRow>(
      `SELECT id, kind, module, title, rationale, status, external_ref, created_at
       FROM agent_tuning_candidate
       ORDER BY (status = 'open') DESC, created_at DESC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 100)],
    );
    return rows.map(mapTuningCandidateRow);
  } catch (err) {
    console.error("agent tuning candidates read failed:", err);
    return []; // never fail the page over the feedback feed
  }
}
