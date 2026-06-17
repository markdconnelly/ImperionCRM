import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TenantMappingPanel } from "@/components/settings/tenant-mapping-panel";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";
import {
  saveTenantMappingAction,
  deleteTenantMappingAction,
} from "../tenant-mapping-actions";

export const dynamic = "force-dynamic";

/**
 * Tenant mapping settings (#833 — Wave-8 buildout of the #794 nav scaffold). Wires
 * the existing TenantMappingPanel (ADR-0051, #150) to its data + server actions:
 * mapped tenants, unmapped tenants seen in posture bronze, and the accounts list a
 * tenant can be mapped onto. Admin-only (`canSeeSettings`, ADR-0030); the actions
 * additionally enforce `settings:write` fail-closed.
 */
export default async function TenantMappingSettingsPage() {
  const roles = await getSessionRoles();
  if (!canSeeSettings(roles)) redirect("/");

  const { security, crm } = getRepositories();
  const [mappings, unmapped, accounts] = await Promise.all([
    security.listTenantMappings(),
    security.listUnmappedTenants(),
    crm.listAccounts(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tenant mapping"
        description="Map external tenants / customers onto Imperion accounts."
      />
      <TenantMappingPanel
        mappings={mappings}
        unmapped={unmapped}
        accounts={accounts}
        saveAction={saveTenantMappingAction}
        deleteAction={deleteTenantMappingAction}
      />
    </div>
  );
}
