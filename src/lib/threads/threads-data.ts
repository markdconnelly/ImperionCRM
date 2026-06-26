/**
 * Threads insights read (epic #1334 S5, ADR-0125 D2). Server data-fetch for the Threads
 * management surface's Insights panel: the silver `social_metric` time-series snapshots that
 * S3 ingest (LP #356) merges from `threads_insights` bronze with `platform='threads'`
 * (ADR-0124 D9 → BI hub, #135 name normalization). A direct rendering read (ADR-0042) — the
 * web identity has SELECT on `social_metric` — and metric-generic so it survives #135 retuning.
 *
 * Degrades like the rest of the app (ADR-0007): DB unset → mock sample rows; query failure →
 * empty list, never a page error (the grants-data / pending-action-cockpit pattern). Renders
 * EMPTY until S3 hydrates bronze (LP #356) — the expected dormant state for this slice.
 *
 * Server-only. The posts/replies/mentions halves of the surface read `interaction`
 * (source=threads) via the shared comms repository — only insights needs a bespoke read.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import type { SocialStatDatum } from "@/types";

const MOCK_THREADS_INSIGHTS: SocialStatDatum[] = [
  { platform: "threads", metric: "views", value: 0, window: "lifetime" },
  { platform: "threads", metric: "likes", value: 0, window: "28d" },
  { platform: "threads", metric: "replies", value: 0, window: "28d" },
  { platform: "threads", metric: "reposts", value: 0, window: "28d" },
  { platform: "threads", metric: "followers", value: 0, window: "lifetime" },
];

/**
 * Threads insight metrics: the latest `lifetime` snapshot per metric + the rolling 28-day
 * sum of `day` snapshots, both scoped to `platform='threads'`. Newest-distinct for lifetime,
 * summed for the window — mirrors the `marketingSocial()` BI read (ADR-0062).
 */
export async function listThreadsInsights(): Promise<SocialStatDatum[]> {
  const pool = getPool();
  if (!pool) return MOCK_THREADS_INSIGHTS;
  try {
    const [lifetime, daily] = await Promise.all([
      pool.query<{ metric: string; value: string | null }>(
        `SELECT DISTINCT ON (metric) metric, value
         FROM social_metric
         WHERE platform = 'threads' AND period = 'lifetime'
         ORDER BY metric, captured_at DESC`,
      ),
      pool.query<{ metric: string; value: string | null }>(
        `SELECT metric, sum(value) AS value
         FROM social_metric
         WHERE platform = 'threads' AND period = 'day'
               AND captured_at >= now() - interval '28 days'
         GROUP BY metric ORDER BY metric`,
      ),
    ]);
    const out: SocialStatDatum[] = [
      ...lifetime.rows.map((r) => ({
        platform: "threads",
        metric: r.metric,
        value: Number(r.value ?? 0),
        window: "lifetime" as const,
      })),
      ...daily.rows.map((r) => ({
        platform: "threads",
        metric: r.metric,
        value: Number(r.value ?? 0),
        window: "28d" as const,
      })),
    ];
    return out;
  } catch (err) {
    console.error("Threads insights read failed:", err);
    return [];
  }
}
