import { PageHeader } from "@/components/ui/page-header";
import { HealthDot } from "@/components/ui/health-dot";
import { getRepositories } from "@/lib/data";

export default async function LeadsPage() {
  const { crm } = getRepositories();
  const all = await crm.listAccounts();
  const leads = all.filter((a) => a.stage === "Lead");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Leads"
        description={`${leads.length} prospects in the funnel`}
      />
      <div className="rounded-lg border border-border bg-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-dim">
                <th className="px-4 py-2 font-medium">Lead</th>
                <th className="px-4 py-2 font-medium">Owner</th>
                <th className="px-4 py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((a) => (
                <tr key={a.id} className="border-t border-border hover:bg-panel-2">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <HealthDot health={a.health} />
                      <span className="font-medium">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-dim">{a.owner}</td>
                  <td className="px-4 py-3 text-dim">{a.note}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-dim">
                    No leads in the funnel.
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
