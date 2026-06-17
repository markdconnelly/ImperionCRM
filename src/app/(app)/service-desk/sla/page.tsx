import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeService } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * SLA dashboard (#794 nav scaffold). Placeholder so the Service group's "SLA
 * dashboard" link resolves. Gated by the Service group guard (admin | technician);
 * real SLA reporting lands in a later wave.
 */
export default async function ServiceDeskSlaPage() {
  const roles = await getSessionRoles();
  if (!canSeeService(roles)) redirect("/");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="SLA dashboard"
        description="Service-level-agreement attainment across the ticket queue."
      />
      <div className="flex items-center gap-2 rounded-md border border-border bg-panel p-4 text-sm text-dim">
        <Icon name="Construction" size={16} />
        Coming soon (later wave) — SLA dashboard content lands in a future wave.
      </div>
    </div>
  );
}
