import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { CmdbAssets } from "@/components/cmdb/cmdb-assets";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeCmdb } from "@/lib/auth/roles";

export const dynamic = "force-dynamic"; // live silver projection, never prerendered

/**
 * The CMDB (#645, epic #372, ADR-0097) — the single repository for the whole client
 * managed estate, on one surface (#876).
 *
 * A READ-ONLY view projected over EXISTING silver inventory — no new ingest. The
 * unified asset table (`CmdbAssets`) carries quick-filter chips that move between the
 * asset-class views — Devices · Cloud · End-users · Accounts — each a table with
 * drill-down. Cloud projects silver `cloud_asset` (#874/#875); Devices is the
 * populated device inventory (silver `device` + IT Glue); end-users/accounts project
 * the silver `contact`/`account` CIs.
 *
 * Admin|technician (ADR-0097; gate set in #794): nav hiding and the route guard below
 * use the same `canSeeCmdb` predicate. The whole surface is read-only — no writes.
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
        description="The single repository for the client managed estate — devices, cloud assets, end-users, and accounts — a read-only view projected over silver inventory."
      >
        <span className="flex items-center gap-1 text-xs text-dim">
          <Icon name="Lock" size={11} /> Read-only · client estate
        </span>
      </PageHeader>

      <CmdbAssets cis={items} devices={devices} />
    </div>
  );
}
