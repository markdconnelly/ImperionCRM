import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageCapacity } from "@/lib/auth/roles";
import { setUserCapacityAction } from "./actions";

/**
 * Weekly capacity admin (ADR-0069 D2, #591) — set each user's
 * `user_capacity.weekly_hours`, the per-user over-allocation threshold the workload
 * view classifies summed estimated load against.
 *
 * RBAC: delivery management (admin | project_manager, `canManageCapacity` /
 * `delivery:capacity`) — the same gate as the workload view + project-board writes.
 * NOT comp data (hours of capacity, not pay), so it does not ride the finance gate.
 *
 * The table lists every app_user; blank weekly hours = no capacity set (the workload
 * view shows "—" and cannot flag them). Each row submits independently; clearing the
 * field removes the capacity row.
 */
export default async function CapacityPage() {
  const roles = await getSessionRoles();
  if (!canManageCapacity(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Weekly capacity" description="Per-user capacity setup" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to weekly capacity — this is delivery-management
          only (admin / project manager, ADR-0069).
        </div>
      </div>
    );
  }

  const { crm } = getRepositories();
  const users = await crm.listUserCapacity();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Weekly capacity"
        description="Per-user weekly hours — the workload view&apos;s over-allocation threshold"
      >
        <Link
          href="/projects/workload"
          className="text-sm text-dim transition-colors hover:text-text"
        >
          ← Workload &amp; capacity
        </Link>
      </PageHeader>

      <p className="rounded-lg border border-border bg-panel px-4 py-2.5 text-xs text-dim">
        Set how many hours a week each person is available to deliver. The{" "}
        <Link href="/projects/workload" className="text-accent hover:underline">
          workload view
        </Link>{" "}
        sums each person&apos;s estimated task hours and flags them over/near capacity
        against this number. Leave blank to clear — an unset person can&apos;t be flagged.
      </p>

      {users.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          No users found yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-panel-2 text-left text-xs text-dim">
              <tr>
                <th className="px-4 py-2 font-medium">Person</th>
                <th className="px-4 py-2 font-medium">Weekly hours</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.userId} className="bg-panel align-middle">
                  <td className="px-4 py-2 text-text">{u.name}</td>
                  <td className="px-4 py-2" colSpan={2}>
                    <form action={setUserCapacityAction} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.userId} />
                      <input
                        type="number"
                        name="weeklyHours"
                        min="0"
                        max="168"
                        step="0.5"
                        defaultValue={u.weeklyHours ?? ""}
                        placeholder="not set"
                        className="w-28 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-accent bg-accent/10 px-3 py-1 text-sm text-accent transition-colors hover:bg-accent/20"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
