import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSalesReport } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * Sales report (#794 nav scaffold). Placeholder so the Reports group's "Sales"
 * link resolves. Gated by the sales report guard (admin | sales); real BI content
 * lands in a later wave.
 */
export default async function SalesReportPage() {
  const roles = await getSessionRoles();
  if (!canSeeSalesReport(roles)) redirect("/");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Sales report"
        description="Sales performance reporting over the gold layer."
      />
      <div className="flex items-center gap-2 rounded-md border border-border bg-panel p-4 text-sm text-dim">
        <Icon name="Construction" size={16} />
        Coming soon (later wave).
      </div>
    </div>
  );
}
