import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { CiRegister } from "@/components/cmdb/ci-register";
import { CmdbTabs } from "@/components/cmdb/cmdb-tabs";
import { DeviceInventory } from "@/components/cmdb/device-inventory";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeCmdb } from "@/lib/auth/roles";

export const dynamic = "force-dynamic"; // live silver projection, never prerendered

/**
 * The CMDB register (#645, epic #372, ADR-0078) — the single hardware/asset home.
 *
 * A READ-ONLY view projected over EXISTING silver inventory — no new ingest, no
 * schema change. Two sections (#795, Wave 1 menu+RBAC re-plan):
 *   • CI register — every Configuration Item (client account, client end-user,
 *     device) with type + owning account, each drillable to a CI detail view.
 *   • Device inventory — the former `/devices` (Devices & Assets) surface, folded
 *     in here so CMDB is the one nav entry; `/devices` now redirects here.
 *
 * Admin|technician (ADR-0078; gate set in #794): nav hiding and the route guard
 * below use the same `canSeeCmdb` predicate. Both sections inherit it. CIs and
 * device inventory are read-only here, so there is NO write capability.
 */
export default async function CmdbPage() {
  const roles = await getSessionRoles();
  if (!canSeeCmdb(roles)) redirect("/");

  const { crm } = getRepositories();
  const [items, devices] = await Promise.all([
    crm.listConfigurationItems(),
    crm.listDeviceInventory(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="CMDB"
        description="Configuration Item register and device inventory — a read-only view of the client managed estate (accounts, end-users, devices) projected over silver inventory."
      >
        <span className="flex items-center gap-1 text-xs text-dim">
          <Icon name="Lock" size={11} /> Read-only · client estate
        </span>
      </PageHeader>

      <CmdbTabs
        register={<CiRegister items={items} />}
        devices={<DeviceInventory devices={devices} />}
        deviceCount={devices.length}
      />
    </div>
  );
}
