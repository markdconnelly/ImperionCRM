import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeMarketingReport, canSeeRevenue, REDACTED_MONEY } from "@/lib/auth/roles";
import { StatusBarChart } from "@/components/reporting/report-charts";

export const metadata = { title: "Marketing · Reporting" };
export const dynamic = "force-dynamic"; // role-gated marketing surface, never prerendered

const fmtCount = new Intl.NumberFormat("en-US");
const humanizeMetric = (m: string) => m.replace(/_/g, " ");

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="text-xs text-dim">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-dim">{hint}</div>}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="mb-3">
        <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-dim">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/**
 * Marketing domain report (#828) — the standalone Marketing leaf of the Reports
 * group (#794 nav buildout), replacing the "coming soon" placeholder. Renders the
 * Marketing & Social slice of the BI hub (ADR-0062) over the already-shipped
 * `ReportsRepository.marketingSocial()` read model: leads-by-source (30d), organic
 * social engagement + insight stats, and the paid-campaign rollup. This front end
 * only renders (ADR-0042); the data layer and its sources are owned elsewhere.
 *
 * RBAC (ADR-0030, #794): gated by `canSeeMarketingReport` (admin | sales) — the
 * marketing-domain group gate. Campaign spend additionally rides the revenue gate
 * (`canSeeRevenue`), redacted before it reaches the client, exactly like the hub.
 */
export default async function MarketingReportPage() {
  const roles = await getSessionRoles();
  if (!canSeeMarketingReport(roles)) redirect("/");

  const { reports } = getRepositories();
  const marketing = await reports.marketingSocial();

  // Spend is the only money figure here (ADR-0030): redact for Support-equivalent
  // roles. Counts (leads, clicks, engagement) are non-revenue and always shown.
  const showRevenue = canSeeRevenue(roles);

  const totalLeads30d = marketing.leadsBySource30d.reduce((n, d) => n + d.count, 0);
  const fbEngagement =
    marketing.engagement30d.fbReactions +
    marketing.engagement30d.fbComments +
    marketing.engagement30d.fbShares;
  const igEngagement =
    marketing.engagement30d.igLikes + marketing.engagement30d.igComments;
  const postsPublished =
    marketing.engagement30d.fbPosts + marketing.engagement30d.igMedia;
  const totalSpend = marketing.topCampaigns.reduce((n, c) => n + c.spend, 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Marketing report"
        description="Leads, organic reach, and paid-campaign performance over the gold layer (ADR-0062)."
      >
        <Link
          href="/reporting"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          ← Reporting
        </Link>
        <Link
          href="/reporting#marketing"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          BI hub · Marketing →
        </Link>
      </PageHeader>

      {/* Headline KPIs — all 30-day windows except spend (all-time, paid-only). */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="New leads (30d)"
          value={fmtCount.format(totalLeads30d)}
          hint="all capture sources"
        />
        <StatTile
          label="Posts published (30d)"
          value={fmtCount.format(postsPublished)}
          hint="Facebook + Instagram"
        />
        <StatTile
          label="Social engagement (30d)"
          value={fmtCount.format(fbEngagement + igEngagement)}
          hint="reactions, comments, shares & likes"
        />
        <StatTile
          label="Campaign spend"
          value={showRevenue ? `$${fmtCount.format(totalSpend)}` : REDACTED_MONEY}
          hint="all-time paid spend"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="New leads by source" subtitle="Lead captures, last 30 days">
          {marketing.leadsBySource30d.length > 0 ? (
            <StatusBarChart data={marketing.leadsBySource30d} color="#5B8DEF" />
          ) : (
            <p className="py-10 text-center text-sm text-dim">
              No lead captures in the last 30 days.
            </p>
          )}
        </ChartCard>

        <ChartCard
          title="Organic social stats"
          subtitle="Source-truthful Meta insight metrics — lifetime latest, daily summed over 28 days"
        >
          {marketing.socialStats.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {marketing.socialStats.map((s) => (
                <div
                  key={`${s.platform}-${s.metric}-${s.window}`}
                  className="rounded-lg border border-border bg-panel-2 p-3"
                >
                  <div className="text-xs capitalize text-dim">
                    {s.platform} · {s.window}
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold tracking-tight">
                    {fmtCount.format(s.value)}
                  </div>
                  <div className="mt-0.5 text-xs text-dim">{humanizeMetric(s.metric)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-dim">
              No social insight snapshots yet.
            </p>
          )}
        </ChartCard>
      </div>

      {/* Engagement breakdown — per-platform 30-day totals (no money). */}
      <div className="rounded-lg border border-border bg-panel p-4">
        <div className="mb-3">
          <h3 className="font-display text-sm font-semibold tracking-tight">
            Engagement breakdown (30d)
          </h3>
          <p className="text-xs text-dim">
            Organic engagement by platform — Meta bronze, last 30 days
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-panel-2 p-3">
            <div className="text-xs text-dim">Facebook posts</div>
            <div className="mt-1 font-display text-xl font-semibold tracking-tight">
              {fmtCount.format(marketing.engagement30d.fbPosts)}
            </div>
            <div className="mt-0.5 text-xs text-dim">
              {fmtCount.format(fbEngagement)} reactions + comments + shares
            </div>
          </div>
          <div className="rounded-lg border border-border bg-panel-2 p-3">
            <div className="text-xs text-dim">Instagram media</div>
            <div className="mt-1 font-display text-xl font-semibold tracking-tight">
              {fmtCount.format(marketing.engagement30d.igMedia)}
            </div>
            <div className="mt-0.5 text-xs text-dim">
              {fmtCount.format(igEngagement)} likes + comments
            </div>
          </div>
          <div className="rounded-lg border border-border bg-panel-2 p-3">
            <div className="text-xs text-dim">FB comments</div>
            <div className="mt-1 font-display text-xl font-semibold tracking-tight">
              {fmtCount.format(marketing.engagement30d.fbComments)}
            </div>
            <div className="mt-0.5 text-xs text-dim">audience replies</div>
          </div>
          <div className="rounded-lg border border-border bg-panel-2 p-3">
            <div className="text-xs text-dim">IG likes</div>
            <div className="mt-1 font-display text-xl font-semibold tracking-tight">
              {fmtCount.format(marketing.engagement30d.igLikes)}
            </div>
            <div className="mt-0.5 text-xs text-dim">organic reactions</div>
          </div>
        </div>
      </div>

      {/* Paid-campaign rollup — spend redacted by the revenue gate (ADR-0030). */}
      <div className="rounded-lg border border-border bg-panel p-4">
        <div className="mb-3">
          <h3 className="font-display text-sm font-semibold tracking-tight">
            Top paid campaigns
          </h3>
          <p className="text-xs text-dim">
            All-time spend, clicks, and leads (campaign_metric is paid-only)
          </p>
        </div>
        {marketing.topCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-dim">
                <tr>
                  <th className="px-3 py-2 font-medium">Campaign</th>
                  <th className="px-3 py-2 font-medium">Platform</th>
                  <th className="px-3 py-2 font-medium">Spend</th>
                  <th className="px-3 py-2 font-medium">Clicks</th>
                  <th className="px-3 py-2 font-medium">Leads</th>
                </tr>
              </thead>
              <tbody>
                {marketing.topCampaigns.map((c) => (
                  <tr key={c.name} className="border-t border-border/60">
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="px-3 py-2 capitalize text-dim">{c.platform}</td>
                    <td className="px-3 py-2">
                      {showRevenue ? `$${fmtCount.format(c.spend)}` : REDACTED_MONEY}
                    </td>
                    <td className="px-3 py-2">{fmtCount.format(c.clicks)}</td>
                    <td className="px-3 py-2">{fmtCount.format(c.leads)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-dim">No paid campaign metrics yet.</p>
        )}
      </div>
    </div>
  );
}
