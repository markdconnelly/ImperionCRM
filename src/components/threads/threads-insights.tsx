import { Icon } from "@/components/ui/icon";
import type { SocialStatDatum } from "@/types";

/**
 * Threads insights panel (epic #1334 S5, ADR-0125 D2). Renders the silver `social_metric`
 * snapshots scoped to `platform='threads'` — lifetime totals + a rolling 28-day window. A
 * static read; humanizes the raw metric name (#135 name normalization is still in flight).
 * Empty until S3 ingest (LP #356) hydrates the snapshots — the expected dormant state.
 */
function humanize(metric: string): string {
  return metric.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ThreadsInsights({ stats }: { stats: SocialStatDatum[] }) {
  return (
    <section className="rounded-xl border border-border bg-panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="BarChart3" size={14} className="text-dim" />
        <h3 className="font-display text-sm font-semibold tracking-tight">Insights</h3>
        <span className="text-[11px] text-dim">threads_manage_insights</span>
      </div>
      {stats.length === 0 ? (
        <p className="py-6 text-center text-xs text-dim">
          No Threads insights yet — they arrive once the connector is authorized and the collector
          runs.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <li
              key={`${s.metric}-${s.window}`}
              className="rounded-lg border border-border/60 px-3 py-2"
            >
              <div className="text-lg font-semibold tabular-nums">{s.value.toLocaleString()}</div>
              <div className="text-[11px] text-dim">
                {humanize(s.metric)}
                <span className="ml-1 text-dim/70">· {s.window}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
