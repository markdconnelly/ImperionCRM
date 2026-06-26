import type { SocialAnalyticsReport } from "@/types";

/**
 * In-plane Social analytics (ADR-0124 D, epic #1338, slice D #1342). Renders the
 * organic (`social_metric`) per-channel + per-post performance UNIONed with the paid
 * (`campaign_metric`) per-ad results, all from the silver tier (the union is a data-layer
 * fold — no DB view). A static rendering read (ADR-0042); the web role has SELECT on both
 * source tables. Empty arrays are the dormant state until the collectors hydrate (slice H).
 *
 * Metric names are NOT yet normalized (#135, slice H): the view humanizes and renders
 * whatever metrics exist rather than a fixed whitelist, so unknown names still show.
 *
 * `spend`/`cpl` are revenue figures — the caller redacts them (ADR-0030 revenue gate)
 * before render via `showRevenue`.
 */
const fmtCount = new Intl.NumberFormat("en-US");
const REDACTED = "—";
const humanize = (m: string) => m.replace(/_/g, " ");

function MetricChip({ metric, value, window }: { metric: string; value: number; window: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel-2 p-3">
      <div className="font-display text-lg font-semibold tabular-nums tracking-tight">
        {fmtCount.format(value)}
      </div>
      <div className="mt-0.5 text-xs text-dim">
        {humanize(metric)}
        <span className="ml-1 text-dim/70">· {window}</span>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-panel p-4">{children}</div>;
}

function CardHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-dim">{subtitle}</p>}
    </div>
  );
}

export function SocialAnalytics({
  report,
  showRevenue,
}: {
  report: SocialAnalyticsReport;
  showRevenue: boolean;
}) {
  const { byChannel, topPosts, adResults } = report;
  const money = (v: number) => (showRevenue ? `$${fmtCount.format(v)}` : REDACTED);

  return (
    <div className="flex flex-col gap-4">
      {/* Per-channel organic performance (social_metric) */}
      <Card>
        <CardHead
          title="Organic performance by channel"
          subtitle="Source-truthful platform metrics — lifetime latest + daily summed over 28 days (social_metric)"
        />
        {byChannel.length > 0 ? (
          <div className="flex flex-col gap-4">
            {byChannel.map((ch) => (
              <div key={ch.platform}>
                <div className="mb-2 text-xs font-medium capitalize text-dim">{ch.platform}</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {ch.metrics.map((m) => (
                    <MetricChip
                      key={`${m.metric}-${m.window}`}
                      metric={m.metric}
                      value={m.value}
                      window={m.window}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-dim">
            No organic metric snapshots yet — they arrive once a channel is connected and the
            insight collector runs.
          </p>
        )}
      </Card>

      {/* Per-post organic performance */}
      <Card>
        <CardHead
          title="Top published posts"
          subtitle="Latest published posts and their attributed organic metrics (social_post_channel × social_metric)"
        />
        {topPosts.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {topPosts.map((p) => (
              <li
                key={`${p.channel}-${p.externalId}`}
                className="rounded-lg border border-border/60 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium capitalize text-dim">{p.channel}</span>
                  <span className="truncate text-sm">{p.summary}</span>
                </div>
                {p.metrics.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-dim">
                    {p.metrics.map((m) => (
                      <span key={m.metric} className="tabular-nums">
                        <span className="font-semibold text-text">{fmtCount.format(m.value)}</span>{" "}
                        {humanize(m.metric)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-dim/70">No metrics captured yet.</div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-10 text-center text-sm text-dim">
            No published posts with metrics yet.
          </p>
        )}
      </Card>

      {/* Per-ad paid results — attribution-consumable (#1316) */}
      <Card>
        <CardHead
          title="Ad results"
          subtitle="Paid per-ad spend, results & cost-per-lead — feeds Marketing Attribution (#1316); campaign_metric is paid-only (ADR-0012)"
        />
        {adResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-dim">
                <tr>
                  <th className="px-3 py-2 font-medium">Ad</th>
                  <th className="px-3 py-2 font-medium">Campaign</th>
                  <th className="px-3 py-2 font-medium">Platform</th>
                  <th className="px-3 py-2 font-medium">Spend</th>
                  <th className="px-3 py-2 font-medium">Impressions</th>
                  <th className="px-3 py-2 font-medium">Clicks</th>
                  <th className="px-3 py-2 font-medium">Results</th>
                  <th className="px-3 py-2 font-medium">CPL</th>
                </tr>
              </thead>
              <tbody>
                {adResults.map((a) => (
                  <tr key={a.adId} className="border-t border-border/60">
                    <td className="px-3 py-2">{a.adName}</td>
                    <td className="px-3 py-2 text-dim">{a.campaignName}</td>
                    <td className="px-3 py-2 capitalize text-dim">{a.platform}</td>
                    <td className="px-3 py-2 tabular-nums">{money(a.spend)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmtCount.format(a.impressions)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmtCount.format(a.clicks)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmtCount.format(a.results)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {a.cpl != null ? money(a.cpl) : REDACTED}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-dim">No paid ad metrics yet.</p>
        )}
      </Card>
    </div>
  );
}
