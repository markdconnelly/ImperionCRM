import type { AccountNeedingTenant } from "@/types";

/**
 * "Accounts needing a tenant mapping" admin surface (issue #1371, epic #1366 gap (f), ADR-0126).
 *
 * The account-first counterpart to {@link ClientMappingPanel}. That panel is tenant-first: it lists
 * DISCOVERED tenant units (from posture bronze or an existing link) and lets an operator attach an
 * account. But the 22/26 unmapped clients have no discovered unit — their tenant GUID was never
 * collected nor linked — so they are invisible there. This panel lists those accounts and lets an
 * operator paste the M365 tenant GUID to finish the mapping. No GUIDs are pre-filled; the operator
 * supplies each one from M365 admin discovery (runbook: docs/runbooks/finish-tenant-mappings.md).
 *
 * Server-rendered: each row posts a plain form to the server action, so the `settings:write` gate
 * stays server-side and the `entity_xref` write still goes through the backend (the web role is
 * SELECT-only on entity_xref, migration 0160). The GUID `pattern` gives an immediate client-side
 * hint; the action re-validates server-side.
 */
export function AccountsNeedingTenant({
  accounts,
  mapAction,
}: {
  accounts: AccountNeedingTenant[];
  mapAction: (formData: FormData) => void | Promise<void>;
}) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-panel p-4">
        <p className="text-sm font-medium text-text">Accounts needing a tenant mapping</p>
        <p className="mt-1 text-sm text-dim">
          Every active account has a Microsoft 365 tenant mapping. Nothing to finish here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber/40 bg-panel p-4">
      <p className="text-sm font-medium text-text">
        Accounts needing a tenant mapping <span className="text-amber">({accounts.length})</span>
      </p>
      <p className="text-xs text-dim">
        These active accounts have no Microsoft 365 tenant mapping yet — until one is added, neither
        per-client security posture nor client-tenant directory collection runs for them (ADR-0126).
        Paste each client&apos;s <span className="font-mono">tenant GUID</span> (Microsoft Entra
        admin center → Overview → Tenant ID) and map it. See the runbook for where to find each ID.
      </p>
      <ul className="flex flex-col gap-2">
        {accounts.map((a) => (
          <li
            key={a.accountId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-panel-2 px-3 py-2"
          >
            <span className="text-sm text-text">{a.accountName}</span>
            <form action={mapAction} className="flex items-center gap-2">
              <input type="hidden" name="accountId" value={a.accountId} />
              <input
                type="text"
                name="tenantId"
                required
                placeholder="00000000-0000-0000-0000-000000000000"
                pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
                title="Microsoft 365 tenant GUID"
                className="w-72 rounded-md border border-border bg-panel px-2.5 py-1.5 font-mono text-xs text-text outline-none focus:border-accent"
              />
              <input
                type="text"
                name="displayName"
                placeholder="Display name (optional)"
                className="w-44 rounded-md border border-border bg-panel px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm text-text hover:bg-accent/20"
              >
                Map
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
