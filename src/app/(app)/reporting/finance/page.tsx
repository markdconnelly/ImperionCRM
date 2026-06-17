import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeFinanceReport } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * Finance report (#794 nav scaffold). Placeholder so the Reports group's "Finance"
 * link resolves. Gated by the finance report guard (admin | finance); real BI
 * content lands in a later wave.
 */
export default async function FinanceReportPage() {
  const roles = await getSessionRoles();
  if (!canSeeFinanceReport(roles)) redirect("/");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Finance report"
        description="Financial performance reporting over the gold layer."
      />
      <div className="flex items-center gap-2 rounded-md border border-border bg-panel p-4 text-sm text-dim">
        <Icon name="Construction" size={16} />
        Coming soon (later wave).
      </div>
    </div>
  );
}
