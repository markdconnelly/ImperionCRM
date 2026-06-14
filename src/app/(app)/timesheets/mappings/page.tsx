import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageEmployeeMappings } from "@/lib/auth/roles";
import { confirmMappingAction } from "./actions";

/**
 * Employee Mapping (ADR-0082, #468) — admin one-time setup. Lists every employee
 * with its Autotask Resource / QuickBooks vendor mapping; the admin confirms the
 * resolved ids per row. Email is the consistent join key across all three systems
 * (shown read-only). Admin-only (`time:map`). The Autotask/QuickBooks list pull +
 * email auto-match is a backend enhancement — until it lands, the admin enters the
 * resolved ids here. Mapping cols only — this surface never touches comp data.
 */
export default async function EmployeeMappingPage() {
  const roles = await getSessionRoles();
  if (!canManageEmployeeMappings(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Employee mapping" description="Admin one-time setup" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to employee mapping — this surface is admin-only
          (ADR-0082).
        </div>
      </div>
    );
  }

  const { crm } = getRepositories();
  const rows = await crm.listEmployeeMappings();
  const confirmed = rows.filter((r) => r.confirmed).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Employee mapping"
        description={`${confirmed} of ${rows.length} employee${rows.length === 1 ? "" : "s"} mapped`}
      />

      <div className="rounded-lg border border-border bg-panel p-4 text-xs text-dim">
        Email is the join key across the CRM, Autotask, and QuickBooks Online. Enter the
        employee&apos;s Autotask <span className="text-text">Resource id</span> (attributes
        Ticket Time Entries) and QuickBooks <span className="text-text">vendor id</span>
        (matches payment), then Confirm. Automatic email-based resolution from Autotask /
        QuickBooks arrives with the backend integration.
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          No employees yet. Employees appear here after their first Entra sign-in.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-panel-2 text-left text-xs text-dim">
              <tr>
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Email (join key)</th>
                <th className="px-4 py-2 font-medium">Autotask Resource</th>
                <th className="px-4 py-2 font-medium">QuickBooks vendor</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.appUserId} className="bg-panel align-middle">
                  <td className="px-4 py-2 text-text">{r.displayName}</td>
                  <td className="px-4 py-2 text-dim">{r.email}</td>
                  <td className="px-4 py-2" colSpan={4}>
                    <form
                      action={confirmMappingAction}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="appUserId" value={r.appUserId} />
                      <input
                        type="number"
                        name="autotaskResourceId"
                        defaultValue={r.autotaskResourceId ?? ""}
                        placeholder="Resource id"
                        className="w-32 rounded-md border border-border bg-panel-2 px-2 py-1 text-text outline-none focus:border-accent"
                      />
                      <input
                        type="text"
                        name="quickbooksVendorId"
                        defaultValue={r.quickbooksVendorId ?? ""}
                        placeholder="Vendor id"
                        className="w-40 rounded-md border border-border bg-panel-2 px-2 py-1 text-text outline-none focus:border-accent"
                      />
                      <span
                        className={
                          r.confirmed
                            ? "text-xs text-green"
                            : "text-xs text-amber"
                        }
                        title={
                          r.confirmed && r.resolvedAt
                            ? `Confirmed ${r.resolvedAt.slice(0, 10)}${r.confirmedByName ? ` by ${r.confirmedByName}` : ""}`
                            : undefined
                        }
                      >
                        {r.confirmed ? "Mapped" : "Unmapped"}
                      </span>
                      <button
                        type="submit"
                        className="ml-auto rounded-md border border-accent bg-accent/10 px-3 py-1 text-xs text-accent transition-colors hover:bg-accent/20"
                      >
                        Confirm
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
