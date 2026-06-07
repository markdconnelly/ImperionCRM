import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ProposalRow } from "@/types";

const statusTone: Record<string, string> = {
  draft: "text-dim",
  sent: "text-accent",
  accepted: "text-green",
  declined: "text-red",
};

export function ProposalsTable({
  proposals,
  deleteAction,
}: {
  proposals: ProposalRow[];
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Proposal</th>
              <th className="px-4 py-2 font-medium">Account</th>
              <th className="px-4 py-2 font-medium">Opportunity</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Value</th>
              <th className="px-4 py-2 font-medium">Sent</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">{p.title}</td>
                <td className="px-4 py-3 text-dim">{p.account}</td>
                <td className="px-4 py-3 text-dim">{p.opportunity}</td>
                <td className={cn("px-4 py-3", statusTone[p.status] ?? "text-dim")}>
                  {p.status}
                </td>
                <td className="px-4 py-3 text-dim">{p.amount}</td>
                <td className="px-4 py-3 text-dim">{p.sent ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/proposals/${p.id}/edit`}
                      className="text-dim hover:text-text"
                    >
                      Edit
                    </Link>
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="text-dim hover:text-red">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {proposals.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-dim">
                  No proposals yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
