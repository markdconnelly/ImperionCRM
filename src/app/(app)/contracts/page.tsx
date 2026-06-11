import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";

export default async function ContractsPage() {
  const { engagements } = getRepositories();
  const contracts = await engagements.listContracts();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Contracts"
        description="Contracts synced from Autotask and DocuSign, linked to their account."
      />
      <div className="rounded-lg border border-border bg-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-dim">
                <th className="px-4 py-2 font-medium">Contract</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Start</th>
                <th className="px-4 py-2 font-medium">End</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-panel-2">
                  <td className="px-4 py-3 font-medium">
                    {c.name ?? "—"}
                    {c.number && <span className="ml-2 text-[11px] text-dim">#{c.number}</span>}
                  </td>
                  <td className="px-4 py-3 text-dim">{c.account ?? "—"}</td>
                  <td className="px-4 py-3 text-dim">{c.contractType ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-dim">
                      {c.source === "docusign" ? "DocuSign" : "Autotask"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dim">{c.status ?? "—"}</td>
                  <td className="px-4 py-3 text-dim">{c.startDate ?? "—"}</td>
                  <td className="px-4 py-3 text-dim">{c.endDate ?? "—"}</td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-dim">
                    No contracts yet. They populate from the Autotask and DocuSign syncs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
