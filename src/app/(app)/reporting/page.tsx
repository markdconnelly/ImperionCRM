import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import {
  canManageProjects,
  canSeeLaborCost,
  canSeeRevenue,
  REDACTED_MONEY,
} from "@/lib/auth/roles";
import { StagePipelineChart, StatusBarChart } from "@/components/reporting/report-charts";

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

/** Anchored BI-hub domain heading (ADR-0062) — deep-linkable from the dashboard. */
function SectionHeading({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <div id={id} className="mt-2 flex scroll-mt-16 items-baseline gap-2">
      <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
      {hint && <span className="text-xs text-dim">{hint}</span>}
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="text-xs text-dim">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-dim">{hint}</div>}
    </div>
  );
}

const fmtCount = new Intl.NumberFormat("en-US");
const humanizeMetric = (m: string) => m.replace(/_/g, " ");

export default async function ReportingPage() {
  const { reports, social } = getRepositories();
  const [
    roles,
    summary,
    pipeline,
    proposals,
    projects,
    revenue,
    conversion,
    sbrAverages,
    marketing,
    socialAnalytics,
    serviceDesk,
    fleet,
  ] = await Promise.all([
    getSessionRoles(),
    reports.getSummary(),
    reports.pipelineByStage(),
    reports.proposalsByStatus(),
    reports.projectsByStatus(),
    reports.revenueSplit(),
    reports.assessmentConversion(),
    reports.sbrDimensionAverages(),
    reports.marketingSocial(),
    // Social plane analytics (ADR-0124 D, #1342) — ad results feed the BI hub's social
    // tiles + Marketing Attribution (#1316). Organic∪paid union is a data-layer fold.
    social.analytics(),
    reports.serviceDesk(),
    reports.securityFleet(),
  ]);

  // Paid ad-result rollup for the BI tiles (attribution-consumable shape, #1316).
  const totalAdSpend = socialAnalytics.adResults.reduce((n, a) => n + a.spend, 0);
  const totalAdResults = socialAnalytics.adResults.reduce((n, a) => n + a.results, 0);
  const blendedCpl = totalAdResults > 0 ? totalAdSpend / totalAdResults : null;
  const topAds = socialAnalytics.adResults.slice(0, 5);

  // Support cannot see revenue (ADR-0030): blank money figures and zero the
  // per-stage MRR so the pipeline chart still shows deal counts.
  const showRevenue = canSeeRevenue(roles);
  const money = (v: string) => (showRevenue ? v : REDACTED_MONEY);
  const pipelineData = showRevenue ? pipeline : pipeline.map((s) => ({ ...s, mrr: 0 }));

  // Time Efficiency (ADR-0082, #467) is comp-sensitive — the whole section, and the
  // labor-cost query inside it, is finance/admin-only. The comp query never runs for
  // other roles (includeLaborCost gates it server-side), and the section isn't fetched.
  const showLaborCost = canSeeLaborCost(roles);
  const timeEff = showLaborCost ? await reports.timeEfficiency(true) : null;
  const utilAttendedMin = timeEff
    ? timeEff.utilization.billableMinutes +
      timeEff.utilization.internalMinutes +
      timeEff.utilization.adminMinutes
    : 0;
  const fmtHours = (min: number) => `${fmtCount.format(Math.round(min / 60))}h`;

  const cards = [
    { label: "Active MRR", value: money(summary.activeMrr) },
    { label: "Open Pipeline", value: money(summary.openPipeline) },
    { label: "Win Rate", value: summary.winRate },
    { label: "Avg. Time to Live", value: summary.avgTimeToLive },
  ];

  const revenueCards = [
    { label: "Recurring MRR", value: money(revenue.recurring), hint: "managed services" },
    { label: "One-time Assessment Fees", value: money(revenue.oneTime), hint: "delivered assessments" },
    {
      label: "Assessment → Managed",
      value: conversion.rate,
      hint: `${conversion.converted}/${conversion.delivered} converted`,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Reporting"
        description="The business-intelligence hub: sales, marketing & social, service desk, and security in one place."
      >
        {showRevenue && (
          <Link
            href="/reporting/forecast"
            className="text-sm text-dim transition-colors hover:text-text"
          >
            Forecast →
          </Link>
        )}
        <Link
          href="/reporting/portfolio"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          Portfolio rollup →
        </Link>
        <Link
          href="/reporting/custom-fields"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          Custom-field report →
        </Link>
        <Link
          href="/reporting/builder"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          Report builder →
        </Link>
        <Link
          href="/reporting/dashboards"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          Dashboards →
        </Link>
        {canManageProjects(roles) && (
          <Link
            href="/reporting/agile"
            className="text-sm text-dim transition-colors hover:text-text"
          >
            Agile (burndown) →
          </Link>
        )}
      </PageHeader>

      <SectionHeading id="sales" title="Sales" hint="pipeline, conversion, delivery" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-panel p-4">
            <div className="text-xs text-dim">{c.label}</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight">
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {revenueCards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-panel p-4">
            <div className="text-xs text-dim">{c.label}</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight">
              {c.value}
            </div>
            <div className="mt-1 text-xs text-dim">{c.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="Open pipeline by stage" subtitle="Deals per sales stage">
          <StagePipelineChart data={pipelineData} />
        </ChartCard>
        <ChartCard title="SBR posture by dimension" subtitle="Avg re-benchmark score (1 At Risk → 4 Strong)">
          <StatusBarChart data={sbrAverages} color="#3FBF8F" />
        </ChartCard>
        <ChartCard title="Proposals by status" subtitle="Proposal lifecycle distribution">
          <StatusBarChart data={proposals} color="#5B8DEF" />
        </ChartCard>
        <ChartCard
          title="Delivery projects by status"
          subtitle="Onboarding & implementation — rolled up by status category (ADR-0065 B5)"
        >
          <StatusBarChart data={projects} color="#7C6BF0" />
        </ChartCard>
      </div>

      <SectionHeading id="marketing" title="Marketing & Social" hint="leads, organic reach, campaigns" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="New leads (30d)"
          value={fmtCount.format(marketing.leadsBySource30d.reduce((n, d) => n + d.count, 0))}
          hint="all capture sources"
        />
        <StatTile
          label="FB engagement (30d)"
          value={fmtCount.format(
            marketing.engagement30d.fbReactions +
              marketing.engagement30d.fbComments +
              marketing.engagement30d.fbShares,
          )}
          hint={`${marketing.engagement30d.fbPosts} posts · reactions + comments + shares`}
        />
        <StatTile
          label="IG engagement (30d)"
          value={fmtCount.format(
            marketing.engagement30d.igLikes + marketing.engagement30d.igComments,
          )}
          hint={`${marketing.engagement30d.igMedia} media · likes + comments`}
        />
        <StatTile
          label="Posts published (30d)"
          value={fmtCount.format(
            marketing.engagement30d.fbPosts + marketing.engagement30d.igMedia,
          )}
          hint="Facebook + Instagram"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="New leads by source" subtitle="Lead captures, last 30 days">
          {marketing.leadsBySource30d.length > 0 ? (
            <StatusBarChart data={marketing.leadsBySource30d} color="#5B8DEF" />
          ) : (
            <p className="py-10 text-center text-sm text-dim">No lead captures in the last 30 days.</p>
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
            <p className="py-10 text-center text-sm text-dim">No social insight snapshots yet.</p>
          )}
        </ChartCard>
      </div>

      <div className="rounded-lg border border-border bg-panel p-4">
        <div className="mb-3">
          <h3 className="font-display text-sm font-semibold tracking-tight">Top paid campaigns</h3>
          <p className="text-xs text-dim">All-time spend, clicks, and leads (campaign_metric is paid-only)</p>
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

      {/* Social/ad performance tiles (ADR-0124 D, #1342) — per-ad results from the Social
          plane analytics read; deep-links to the in-plane analytics view. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Channels reporting"
          value={fmtCount.format(socialAnalytics.byChannel.length)}
          hint="organic metric coverage (social_metric)"
        />
        <StatTile
          label="Ad spend (paid)"
          value={showRevenue ? `$${fmtCount.format(totalAdSpend)}` : REDACTED_MONEY}
          hint="all-time per-ad spend"
        />
        <StatTile
          label="Ad results"
          value={fmtCount.format(totalAdResults)}
          hint="attributed leads — feeds #1316"
        />
        <StatTile
          label="Blended CPL"
          value={blendedCpl != null ? (showRevenue ? `$${fmtCount.format(Math.round(blendedCpl * 100) / 100)}` : REDACTED_MONEY) : "—"}
          hint="cost per lead across all ads"
        />
      </div>

      <div className="rounded-lg border border-border bg-panel p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold tracking-tight">Top ads by results</h3>
            <p className="text-xs text-dim">Per-ad paid performance (campaign_metric, paid-only)</p>
          </div>
          <Link
            href="/social/analytics"
            className="shrink-0 text-xs text-dim transition-colors hover:text-text"
          >
            Social analytics →
          </Link>
        </div>
        {topAds.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-dim">
                <tr>
                  <th className="px-3 py-2 font-medium">Ad</th>
                  <th className="px-3 py-2 font-medium">Campaign</th>
                  <th className="px-3 py-2 font-medium">Spend</th>
                  <th className="px-3 py-2 font-medium">Results</th>
                  <th className="px-3 py-2 font-medium">CPL</th>
                </tr>
              </thead>
              <tbody>
                {topAds.map((a) => (
                  <tr key={a.adId} className="border-t border-border/60">
                    <td className="px-3 py-2">{a.adName}</td>
                    <td className="px-3 py-2 text-dim">{a.campaignName}</td>
                    <td className="px-3 py-2">
                      {showRevenue ? `$${fmtCount.format(a.spend)}` : REDACTED_MONEY}
                    </td>
                    <td className="px-3 py-2">{fmtCount.format(a.results)}</td>
                    <td className="px-3 py-2">
                      {a.cpl != null ? (showRevenue ? `$${fmtCount.format(a.cpl)}` : REDACTED_MONEY) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-dim">No paid ad metrics yet.</p>
        )}
      </div>

      <SectionHeading id="service-desk" title="Service Desk" hint="ticket flow & Defender pairings" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Tickets (all time)" value={fmtCount.format(serviceDesk.total)} />
        <StatTile
          label="Opened (30d)"
          value={fmtCount.format(serviceDesk.opened30d)}
          hint="from Autotask webhook + bulk merge"
        />
        <StatTile
          label="Defender-linked"
          value={fmtCount.format(serviceDesk.defenderLinked)}
          hint="incident ↔ ticket pairings (ADR-0059)"
        />
        <StatTile
          label="Queues in use"
          value={fmtCount.format(serviceDesk.byQueue.filter((q) => q.label !== "unassigned").length)}
          hint="labels pending (0074)"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title="Tickets by status" subtitle="Raw Autotask statuses — labels land with the 0074 follow-up">
          {serviceDesk.byStatus.length > 0 ? (
            <StatusBarChart data={serviceDesk.byStatus} color="#5B8DEF" />
          ) : (
            <p className="py-10 text-center text-sm text-dim">No tickets ingested yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Tickets by queue" subtitle="Open + closed, all time">
          {serviceDesk.byQueue.length > 0 ? (
            <StatusBarChart data={serviceDesk.byQueue} color="#7C6BF0" />
          ) : (
            <p className="py-10 text-center text-sm text-dim">No tickets ingested yet.</p>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Tickets opened per week" subtitle="Last 8 weeks (no completion dates in the source yet — opened flow only)">
        {serviceDesk.openedByWeek.length > 0 ? (
          <StatusBarChart data={serviceDesk.openedByWeek} color="#3FBF8F" />
        ) : (
          <p className="py-10 text-center text-sm text-dim">No tickets opened in the last 8 weeks.</p>
        )}
      </ChartCard>

      <SectionHeading
        id="security"
        title="Security Fleet"
        hint="all mapped tenants — per-account detail lives on Security & posture pages"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Fleet secure score"
          value={fleet.secureScorePct != null ? `${fleet.secureScorePct}%` : "—"}
          hint={
            fleet.tenants > 0
              ? `across ${fleet.tenants} refreshed tenant${fleet.tenants === 1 ? "" : "s"}`
              : "no coverage yet — collectors register at server bringup"
          }
        />
        <StatTile
          label="MFA registered"
          value={fleet.mfa.total > 0 ? `${Math.round((fleet.mfa.registered / fleet.mfa.total) * 100)}%` : "—"}
          hint={fleet.mfa.total > 0 ? `${fleet.mfa.registered} of ${fleet.mfa.total} users` : "no coverage yet"}
        />
        <StatTile
          label="Intune compliant"
          value={
            fleet.intune.total > 0
              ? `${Math.round((fleet.intune.compliant / fleet.intune.total) * 100)}%`
              : "—"
          }
          hint={
            fleet.intune.total > 0
              ? `${fleet.intune.compliant} of ${fleet.intune.total} devices`
              : "no coverage yet"
          }
        />
        <StatTile
          label="Open credential exposures"
          value={fmtCount.format(fleet.exposuresOpen)}
          hint="Dark Web ID, unresolved"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard
          title="Policy posture mix"
          subtitle="Fleet totals across policy families (ADR-0051 classifications)"
        >
          {fleet.policyMix.some((d) => d.count > 0) ? (
            <StatusBarChart data={fleet.policyMix} color="#E0A33E" />
          ) : (
            <p className="py-10 text-center text-sm text-dim">
              No classified policies yet — posture refresh pending.
            </p>
          )}
        </ChartCard>
        <ChartCard title="Open Defender incidents" subtitle="By severity, resolved/redirected excluded">
          {fleet.defenderOpenBySeverity.length > 0 ? (
            <StatusBarChart data={fleet.defenderOpenBySeverity} color="#E2615A" />
          ) : (
            <p className="py-10 text-center text-sm text-dim">No open Defender incidents.</p>
          )}
        </ChartCard>
      </div>

      {/* Time Efficiency — comp-sensitive, finance/admin only (ADR-0082, #467). */}
      {timeEff && (
        <>
          <SectionHeading
            id="time-efficiency"
            title="Time Efficiency"
            hint="utilization & labor cost — finance/admin only"
          />

          {utilAttendedMin > 0 ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label="Billable utilization"
                value={`${Math.round((timeEff.utilization.billableMinutes / utilAttendedMin) * 100)}%`}
                hint="billable ÷ attended hours"
              />
              <StatTile
                label="Billable hours"
                value={fmtHours(timeEff.utilization.billableMinutes)}
                hint="client-billable attendance"
              />
              <StatTile
                label="Internal hours"
                value={fmtHours(timeEff.utilization.internalMinutes)}
                hint="internal work"
              />
              <StatTile
                label="Admin hours"
                value={fmtHours(timeEff.utilization.adminMinutes)}
                hint="administrative overhead"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-panel p-4">
              <p className="py-6 text-center text-sm text-dim">
                No attendance recorded yet — utilization populates once time entries flow
                (build-ahead, #467).
              </p>
            </div>
          )}

          {/* Labor cost is aggregate-only — never a per-person pay rate (ADR-0082). */}
          {timeEff.laborCost && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <StatTile
                label="Labor cost (approved)"
                value={`$${fmtCount.format(timeEff.laborCost.totalCost)}`}
                hint="Σ approved hours × effective rate — aggregate"
              />
              <StatTile
                label="Approved hours"
                value={fmtHours(timeEff.laborCost.approvedHours * 60)}
                hint="corrected & approved timesheets"
              />
              <StatTile
                label="Blended rate"
                value={
                  timeEff.laborCost.blendedHourlyRate != null
                    ? `$${fmtCount.format(timeEff.laborCost.blendedHourlyRate)}/h`
                    : "—"
                }
                hint="aggregate — not a per-person rate"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
