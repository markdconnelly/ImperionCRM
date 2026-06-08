import Link from "next/link";
import type { Account } from "@/types";
import { HealthDot } from "@/components/ui/health-dot";

/** Full accounts list with row actions (Accounts page). */
export function AccountsTable({
  accounts,
  deleteAction,
}: {
  accounts: Account[];
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Stage</th>
              <th className="px-4 py-2 font-medium">Owner</th>
              <th className="px-4 py-2 font-medium">MRR</th>
              <th className="px-4 py-2 font-medium">Detail</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <HealthDot health={a.health} />
                    <Link href={`/accounts/${a.id}`} className="font-medium hover:text-accent">
                      {a.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-dim">{a.stage}</td>
                <td className="px-4 py-3 text-dim">{a.owner}</td>
                <td className="px-4 py-3 text-dim">{a.mrr}</td>
                <td className="px-4 py-3 text-dim">{a.note}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/accounts/${a.id}/edit`}
                      className="text-dim hover:text-text"
                    >
                      Edit
                    </Link>
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        className="text-dim hover:text-red"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-dim">
                  No accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
