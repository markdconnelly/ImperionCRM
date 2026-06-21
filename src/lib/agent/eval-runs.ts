/**
 * Eval-run presentation types + pure mapper (ADR-0106, epic #983) — the quality plane's
 * read surface. Pure module (no `server-only`, no DB) so it is unit-testable; the server
 * data-fetch lives in `eval-runs-data.ts` (the cost-rollup.ts / cost-rollup-data.ts split).
 */

/** One eval batch, as the dashboard renders it. */
export interface EvalRunRow {
  id: string;
  suite: string;
  status: string; // 'running' | 'passed' | 'failed' | 'error'
  caseCount: number;
  /** 0..1, or null while a run is still in flight. */
  aggregateScore: number | null;
  triggeredBy: string | null;
  startedAt: string; // ISO
  finishedAt: string | null; // ISO or null
}

/** The raw `agent_eval_run` row shape as pg returns it (numerics may be strings). */
export interface EvalRunDbRow {
  id: string;
  suite: string;
  status: string;
  case_count: number | string;
  aggregate_score: number | string | null;
  triggered_by: string | null;
  started_at: string | Date;
  finished_at: string | Date | null;
}

export const MOCK_EVAL_RUNS: EvalRunRow[] = [
  {
    id: "mock-eval-1",
    suite: "reporting",
    status: "passed",
    caseCount: 2,
    aggregateScore: 0.93,
    triggeredBy: "nightly",
    startedAt: "2026-06-20T06:00:00Z",
    finishedAt: "2026-06-20T06:01:12Z",
  },
  {
    id: "mock-eval-2",
    suite: "sales",
    status: "failed",
    caseCount: 2,
    aggregateScore: 0.61,
    triggeredBy: "ci",
    startedAt: "2026-06-20T05:40:00Z",
    finishedAt: "2026-06-20T05:40:51Z",
  },
  {
    id: "mock-eval-3",
    suite: "all",
    status: "passed",
    caseCount: 5,
    aggregateScore: 0.88,
    triggeredBy: "manual",
    startedAt: "2026-06-19T18:12:00Z",
    finishedAt: "2026-06-19T18:14:03Z",
  },
];

/** Raw DB shape → the row the dashboard renders. Pure; unit-tested. */
export function mapEvalRunRow(r: EvalRunDbRow): EvalRunRow {
  const score = r.aggregate_score === null ? null : Number(r.aggregate_score);
  return {
    id: r.id,
    suite: r.suite,
    status: r.status,
    caseCount: Number(r.case_count) || 0,
    aggregateScore: score === null || Number.isNaN(score) ? null : score,
    triggeredBy: r.triggered_by,
    startedAt: new Date(r.started_at).toISOString(),
    finishedAt: r.finished_at === null ? null : new Date(r.finished_at).toISOString(),
  };
}
