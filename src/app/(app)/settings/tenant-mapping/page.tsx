import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * Tenant mapping settings (#794 nav scaffold). Placeholder so the Settings group's
 * "Tenant mapping" link resolves. Admin-only (`canSeeSettings`, ADR-0030); the
 * existing tenant-mapping server actions are wired in a later wave's UI.
 */
export default async function TenantMappingSettingsPage() {
  const roles = await getSessionRoles();
  if (!canSeeSettings(roles)) redirect("/");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tenant mapping"
        description="Map external tenants / customers onto Imperion accounts."
      />
      <div className="flex items-center gap-2 rounded-md border border-border bg-panel p-4 text-sm text-dim">
        <Icon name="Construction" size={16} />
        Coming soon (later wave).
      </div>
    </div>
  );
}
