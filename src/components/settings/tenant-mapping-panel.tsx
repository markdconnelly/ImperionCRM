import type { Account, TenantMapping, UnmappedTenant } from "@/types";

const GUID_PATTERN =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

function AccountSelect({ accounts }: { accounts: Account[] }) {
  return (
    <select
      name="accountId"
      required
      defaultValue=""
      className="rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
    >
      <option value="" disabled>
        Select account…
      </option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}

/**
 * Tenant Mapping admin surface (ADR-0051, issue #150). Server-rendered: every
 * mutation is a plain form posting to a server action, so the settings:write
 * gate stays server-side. Mappings are explicit — never inferred from domains —
 * and tenants seen in posture bronze without one are surfaced, never hidden.
 */
export function TenantMappingPanel({
  mappings,
  unmapped,
  accounts,
  saveAction,
  deleteAction,
}: {
  mappings: TenantMapping[];
  unmapped: UnmappedTenant[];
  accounts: Account[];
  saveAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="font-display text-sm font-semibold tracking-tight">Tenant Mapping</h3>
        <p className="mt-0.5 text-sm text-dim">
          Map each customer&apos;s Microsoft tenant GUID to its account. Posture data is
          keyed by tenant; this mapping is how it reaches the right account — explicit
          and admin-managed, never guessed from domains (ADR-0051).
        </p>
      </div>

      {unmapped.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber/40 bg-panel p-4">
          <p className="text-sm font-medium text-text">
            Unmapped tenants <span className="text-amber">({unmapped.length})</span>
          </p>
          <p className="text-xs text-dim">
            These tenants have posture data but no account mapping — their posture is
            invisible on account pages until mapped.
          </p>
          <ul className="flex flex-col gap-2">
            {unmapped.map((t) => (
              <li
                key={t.tenantId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-panel-2 px-3 py-2"
              >
                <span className="font-mono text-xs text-text">{t.tenantId}</span>
                <form action={saveAction} className="flex items-center gap-2">
                  <input type="hidden" name="tenantId" value={t.tenantId} />
                  <AccountSelect accounts={accounts} />
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
      )}

      <div className="rounded-xl border border-border bg-panel p-4">
        <p className="mb-2 text-sm font-medium text-text">Mapped tenants</p>
        {mappings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-dim">
                  <th className="py-1.5 pr-4 font-medium">Tenant</th>
                  <th className="py-1.5 pr-4 font-medium">Account</th>
                  <th className="py-1.5 pr-4 font-medium">Display name</th>
                  <th className="py-1.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.tenantId} className="border-t border-border">
                    <td className="py-2 pr-4 font-mono text-xs">{m.tenantId}</td>
                    <td className="py-2 pr-4">{m.accountName ?? "—"}</td>
                    <td className="py-2 pr-4 text-dim">{m.displayName ?? "—"}</td>
                    <td className="py-2 text-right">
                      <form action={deleteAction}>
                        <input type="hidden" name="tenantId" value={m.tenantId} />
                        <button type="submit" className="text-xs text-dim hover:text-red">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-dim">
            No tenants mapped yet. Map one below, or pick from the unmapped list once
            posture data lands.
          </p>
        )}
      </div>

      <div className="max-w-2xl rounded-xl border border-border bg-panel p-4">
        <p className="mb-2 text-sm font-medium text-text">Add a mapping</p>
        <form action={saveAction} className="flex flex-col gap-2.5">
          <label className="flex flex-col gap-1 text-xs text-dim">
            <span>
              Tenant GUID <span className="text-red">*</span>
            </span>
            <input
              type="text"
              name="tenantId"
              required
              pattern={GUID_PATTERN}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="rounded-md border border-border bg-panel-2 px-2.5 py-1.5 font-mono text-sm text-text outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-dim">
            <span>
              Account <span className="text-red">*</span>
            </span>
            <AccountSelect accounts={accounts} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-dim">
            <span>Display name</span>
            <input
              type="text"
              name="displayName"
              placeholder="e.g. Contoso production tenant"
              className="rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm text-text hover:bg-accent/20"
          >
            Save mapping
          </button>
        </form>
        <p className="mt-2 text-[11px] text-dim">
          One account per tenant — saving an existing tenant GUID repoints it. An account
          may own several tenants.
        </p>
      </div>
    </section>
  );
}
