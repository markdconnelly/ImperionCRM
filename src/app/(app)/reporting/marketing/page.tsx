import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeMarketingReport } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * Marketing report (#794 nav scaffold). Placeholder so the Reports group's
 * "Marketing" link resolves. Gated by the marketing report guard (admin | sales);
 * real BI content lands in a later wave.
 */
export default async function MarketingReportPage() {
  const roles = await getSessionRoles();
  if (!canSeeMarketingReport(roles)) redirect("/");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Marketing report"
        description="Marketing performance reporting over the gold layer."
      />
      <div className="flex items-center gap-2 rounded-md border border-border bg-panel p-4 text-sm text-dim">
        <Icon name="Construction" size={16} />
        Coming soon (later wave).
      </div>
    </div>
  );
}
