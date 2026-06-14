import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canManageExpenseCategories } from "@/lib/auth/roles";
import { mapExpenseCategoryAction } from "./actions";

/**
 * Expense Categories (ADR-0083, #489) — the admin mapping console. QuickBooks Online is
 * the category system of record; the local-pipeline pull (LP #168) syncs its chart of
 * accounts into the read-only `qbo_expense_account` bronze. Here an admin hard-links each
 * clean website-facing category onto a QuickBooks account and sets its config — display
 * name, per-item caps + soft threshold, billable default, the Autotask expenseCategory id,
 * and visibility. Only mapped + visible + active categories reach the employee entry GUI.
 *
 * The app NEVER writes QuickBooks: a category that doesn't exist in QuickBooks must be
 * created there manually by finance and re-synced — the console shows that prompt rather
 * than offering a create path. Mileage is the rate-driven, receipt-exempt SYSTEM category
 * (read-only marker; its QuickBooks link is mapping-exempt). Admin-only
 * (`expense:category-map`); comp-free throughout.
 */
export default async function ExpenseCategoriesPage() {
  const roles = await getSessionRoles();
  if (!canManageExpenseCategories(roles)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Expense categories" description="Admin setup" />
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          You don&apos;t have access to expense categories — this surface is admin-only
          (ADR-0083).
        </div>
      </div>
    );
  }

  const { crm } = getRepositories();
  const [categories, qboAccounts] = await Promise.all([
    crm.listExpenseCategoriesAdmin(),
    crm.listQboExpenseAccounts(),
  ]);

  const mapped = categories.filter((c) => c.isSystem || c.qboAccountId !== null).length;
  const mappable = categories.filter((c) => !c.isSystem);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Expense categories"
        description={`${mapped} of ${categories.length} categor${categories.length === 1 ? "y" : "ies"} mapped · ${qboAccounts.length} QuickBooks account${qboAccounts.length === 1 ? "" : "s"} synced`}
      />

      <div className="rounded-lg border border-border bg-panel p-4 text-xs text-dim">
        QuickBooks Online is the category system of record. Map each website category to a
        synced QuickBooks <span className="text-text">account</span>, then set its caps,
        billable default, Autotask category id, and visibility. Only{" "}
        <span className="text-text">mapped, visible, active</span> categories appear to
        employees. The app never writes QuickBooks — if a category is missing below,{" "}
        <span className="text-text">create it in QuickBooks, then re-sync</span>.
      </div>

      {/* ── Synced QuickBooks accounts (empty until LP #168 runs the pull) ────── */}
      {qboAccounts.length === 0 ? (
        <div className="rounded-lg border border-amber/40 bg-amber/5 p-4 text-sm text-amber">
          No synced QuickBooks accounts yet. The QuickBooks chart-of-accounts pull (the local
          pipeline) hasn&apos;t run — until it does, only the system Mileage category is
          mappable. Categories you need that are absent must be created in QuickBooks first,
          then re-synced.
        </div>
      ) : (
        <details className="rounded-lg border border-border bg-panel p-4 text-xs text-dim">
          <summary className="cursor-pointer text-text">
            {qboAccounts.length} synced QuickBooks account{qboAccounts.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-3 space-y-1">
            {qboAccounts.map((a) => (
              <li key={a.qboAccountId} className="flex items-center gap-2">
                <span className="text-text">{a.fullyQualifiedName || a.name}</span>
                {a.accountType && <span className="text-dim">· {a.accountType}</span>}
                {!a.active && <span className="text-amber">· inactive in QB</span>}
                {a.mappedToKey && <span className="text-green">· mapped → {a.mappedToKey}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* ── Category mapping rows ─────────────────────────────────────────────── */}
      {categories.length === 0 ? (
        <div className="rounded-lg border border-border bg-panel p-6 text-sm text-dim">
          No expense categories yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categories.map((c) =>
            c.isSystem ? (
              // System Mileage — rate-driven, receipt-exempt, mapping-exempt. Read-only marker.
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-panel-2 p-4 text-sm"
              >
                <span className="font-medium text-text">{c.displayName}</span>
                <span className="rounded-md border border-accent-2/40 bg-accent-2/10 px-2 py-0.5 text-xs text-accent-2">
                  System category
                </span>
                <span className="text-xs text-dim">
                  Rate-driven, receipt-exempt — reimbursed at the effective mileage rate, not
                  a QuickBooks account. Always active.
                </span>
              </div>
            ) : (
              <form
                key={c.id}
                action={mapExpenseCategoryAction}
                className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4"
              >
                <input type="hidden" name="id" value={c.id} />
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs text-dim">{c.key}</span>
                  <span
                    className={
                      c.isActive
                        ? "rounded-md border border-green/40 bg-green/10 px-2 py-0.5 text-xs text-green"
                        : "rounded-md border border-border bg-panel-2 px-2 py-0.5 text-xs text-dim"
                    }
                  >
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                  {c.qboAccountId === null && (
                    <span className="text-xs text-amber">
                      Not mapped to QuickBooks — pick an account below, or create it in
                      QuickBooks and re-sync.
                    </span>
                  )}
                  {c.mappedByName && (
                    <span className="ml-auto text-xs text-dim">Last set by {c.mappedByName}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-xs text-dim">
                    Display name
                    <input
                      type="text"
                      name="displayName"
                      defaultValue={c.displayName}
                      className="w-40 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-dim">
                    QuickBooks account
                    <select
                      name="qboAccountId"
                      defaultValue={c.qboAccountId ?? ""}
                      className="w-52 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
                    >
                      <option value="">— unmapped —</option>
                      {qboAccounts.map((a) => (
                        <option key={a.qboAccountId} value={a.qboAccountId}>
                          {a.fullyQualifiedName || a.name}
                          {!a.active ? " (inactive)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-dim">
                    Hard cap ($)
                    <input
                      type="number"
                      name="hardCap"
                      min="0"
                      step="0.01"
                      defaultValue={c.hardCap ?? ""}
                      placeholder="none"
                      className="w-24 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-dim">
                    Soft threshold ($)
                    <input
                      type="number"
                      name="softThreshold"
                      min="0"
                      step="0.01"
                      defaultValue={c.softThreshold ?? ""}
                      placeholder="none"
                      className="w-28 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-dim">
                    Autotask category id
                    <input
                      type="number"
                      name="autotaskExpenseCategoryId"
                      defaultValue={c.autotaskExpenseCategoryId ?? ""}
                      placeholder="id"
                      className="w-28 rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-text outline-none focus:border-accent"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-dim">
                    <input
                      type="checkbox"
                      name="billableDefault"
                      defaultChecked={c.billableDefault}
                      className="accent-accent"
                    />
                    Billable by default
                  </label>
                  <label className="flex items-center gap-2 text-xs text-dim">
                    <input
                      type="checkbox"
                      name="isUserVisible"
                      defaultChecked={c.isUserVisible}
                      className="accent-accent"
                    />
                    Visible to employees
                  </label>
                  <label className="flex items-center gap-2 text-xs text-dim">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={c.isActive}
                      className="accent-accent"
                    />
                    Active (requires a QuickBooks account)
                  </label>
                  <button
                    type="submit"
                    className="ml-auto rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm text-accent transition-colors hover:bg-accent/20"
                  >
                    Save
                  </button>
                </div>
              </form>
            ),
          )}
        </div>
      )}

      {mappable.length > 0 && qboAccounts.length > 0 && (
        <div className="rounded-lg border border-border bg-panel p-4 text-xs text-dim">
          Need a category that isn&apos;t listed above? Create the account in QuickBooks
          Online first, re-run the chart-of-accounts sync, then map a category to it here —
          the app never creates QuickBooks accounts.
        </div>
      )}
    </div>
  );
}
