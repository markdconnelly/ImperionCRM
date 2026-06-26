import Link from "next/link";
import { getRepositories } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { SocialTabs } from "@/components/social/social-tabs";
import { SocialAnalytics } from "@/components/social/social-analytics";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeRevenue } from "@/lib/auth/roles";

export const metadata = { title: "Analytics · Social" };

/**
 * Social — in-plane analytics (ADR-0124 D, epic #1338, slice D #1342).
 *
 * Per-channel + per-post organic performance from the silver `social_metric` time-series,
 * UNIONed with per-ad paid results from `campaign_metric` (paid-only, ADR-0012). The union
 * is done in the data layer (`SocialRepository.analytics()`) — no DB view, no migration.
 * The same shape powers the social/ad tiles on the BI hub (/reporting, ADR-0062).
 *
 * RBAC (ADR-0030): ad spend + cost-per-lead are revenue figures, redacted server-side via
 * `canSeeRevenue` before they reach the client; counts (reach, results, clicks) always show.
 */
export default async function SocialAnalyticsPage() {
  const { social } = getRepositories();
  const [report, roles] = await Promise.all([social.analytics(), getSessionRoles()]);
  const showRevenue = canSeeRevenue(roles);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Social"
        description="Organic reach and paid ad results across every connected network — from the silver metric tier."
      >
        <Link
          href="/reporting#marketing"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          BI hub · Marketing →
        </Link>
      </PageHeader>

      <SocialTabs active="analytics" />
      <SocialAnalytics report={report} showRevenue={showRevenue} />
    </div>
  );
}
