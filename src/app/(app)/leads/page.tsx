import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { HealthDot } from "@/components/ui/health-dot";
import { HooksTable } from "@/components/leads/hooks-table";
import { CaptureInbox } from "@/components/leads/capture-inbox";
import { getRepositories } from "@/lib/data";
import { resolveEventAction } from "./actions";

export default async function LeadsPage() {
  const { crm, leads: leadsRepo } = getRepositories();
  const [all, hooks, captures] = await Promise.all([
    crm.listAccounts(),
    leadsRepo.listHooks(),
    leadsRepo.listCaptureEvents(),
  ]);
  const leads = all.filter((a) => a.stage === "Lead");
  const newCount = captures.filter((c) => c.status === "new").length;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <PageHeader title="Leads" description={`${leads.length} prospects in the funnel`} />
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
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">
            Capture inbox{newCount > 0 ? ` (${newCount} new)` : ""}
          </h3>
          <p className="mt-0.5 text-sm text-dim">
            Inbound captures from hooks. Resolve one to start a contact profile + nurture.
          </p>
        </div>
        <CaptureInbox events={captures} resolveAction={resolveEventAction} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-base font-semibold tracking-tight">Capture hooks</h3>
          <Link
            href="/leads/hooks/new"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-dim hover:text-text"
          >
            + New hook
          </Link>
        </div>
        <HooksTable hooks={hooks} />
      </section>
    </div>
  );
}
