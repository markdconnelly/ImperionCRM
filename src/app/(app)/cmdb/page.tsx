import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { CiRegister } from "@/components/cmdb/ci-register";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeCmdb } from "@/lib/auth/roles";

export const dynamic = "force-dynamic"; // live silver projection, never prerendered

/**
 * The CMDB Configuration Item (CI) register (#645, epic #372, ADR-0078).
 *
 * A READ-ONLY register projected over EXISTING silver inventory — no new ingest,
 * no schema change. v1 CI types: client account, client end-user (managed-estate
 * identity; Imperion staff/admin EXCLUDED), and device. Lists every CI with its
 * type + owning account, filterable by both, each drillable to a CI detail view.
 *
 * Admin-only (ADR-0030): nav hiding and the route guard below use the same
 * `canSeeCmdb` predicate, mirroring the Settings / AI Agents gate. CIs are
 * read-only here, so there is NO `policy.ts` write capability.
 */
export default async function CmdbPage() {
  const roles = await getSessionRoles();
  if (!canSeeCmdb(roles)) redirect("/");

  const { crm } = getRepositories();
  const items = await crm.listConfigurationItems();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="CMDB"
        description="Configuration Item register — a read-only view of the client managed estate (accounts, end-users, devices) projected over silver inventory."
      >
        <span className="flex items-center gap-1 text-xs text-dim">
          <Icon name="Lock" size={11} /> Read-only · client estate
        </span>
      </PageHeader>

      <CiRegister items={items} />
    </div>
  );
}
