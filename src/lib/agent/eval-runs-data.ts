/**
 * Recent agent eval runs (ADR-0106, epic #983) — server data-fetch for the quality plane's
 * read surface. Reads `agent_eval_run` (the scored-batch ledger filled by the backend runner,
 * backend ADR-0077). The web identity has SELECT on the agent_eval_* tables (migration 0154),
 * so this is a clean direct rendering read (ADR-0042).
 *
 * Degrades like the rest of the app: DB unset → mock sample rows; query failure → empty list,
 * never a page error (the activity.ts / cost-rollup-data.ts pattern, ADR-0007).
 *
 * Server-only. Pure types + mapper live in `eval-runs.ts`.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import {
  mapEvalRunRow,
  MOCK_EVAL_RUNS,
  type EvalRunDbRow,
  type EvalRunRow,
} from "./eval-runs";

/** Last `limit` eval runs, newest first. */
export async function listRecentEvalRuns(limit = 20): Promise<EvalRunRow[]> {
  const pool = getPool();
  if (!pool) return MOCK_EVAL_RUNS; // mock fallback, same as every module (ADR-0007)

  try {
    const { rows } = await pool.query<EvalRunDbRow>(
      `SELECT id, suite, status, case_count, aggregate_score, triggered_by, started_at, finished_at
       FROM agent_eval_run
       ORDER BY started_at DESC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 100)],
    );
    return rows.map(mapEvalRunRow);
  } catch (err) {
    console.error("agent eval runs read failed:", err);
    return []; // never fail the page over the eval feed
  }
}
