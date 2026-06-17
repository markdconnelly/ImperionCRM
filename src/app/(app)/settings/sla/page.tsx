import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * SLA settings (#794 nav scaffold). Placeholder so the Settings group's "SLA
 * settings" link resolves. Admin-only (`canSeeSettings`, ADR-0030); the SLA policy
 * editor (paired with the Service group's SLA dashboard) lands in a later wave.
 */
export default async function SlaSettingsPage() {
  const roles = await getSessionRoles();
  if (!canSeeSettings(roles)) redirect("/");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="SLA settings"
        description="Configure service-level-agreement targets and policies."
      />
      <div className="flex items-center gap-2 rounded-md border border-border bg-panel p-4 text-sm text-dim">
        <Icon name="Construction" size={16} />
        Coming soon (later wave).
      </div>
    </div>
  );
}
