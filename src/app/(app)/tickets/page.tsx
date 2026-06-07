import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";

export default async function TicketsPage() {
  const { engagements } = getRepositories();
  const tickets = await engagements.listTickets();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tickets"
        description="Support tickets synced from Autotask, plus items spawned from engagements."
      />
      <div className="rounded-lg border border-border bg-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-dim">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Priority</th>
                <th className="px-4 py-2 font-medium">Opened</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-panel-2">
                  <td className="px-4 py-3 text-dim">{t.number ?? "—"}</td>
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3 text-dim">{t.account}</td>
                  <td className="px-4 py-3 text-dim">{t.status ?? "—"}</td>
                  <td className="px-4 py-3 text-dim">{t.priority ?? "—"}</td>
                  <td className="px-4 py-3 text-dim">{t.opened ?? "—"}</td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-dim">
                    No tickets yet. They appear here once Autotask sync runs or one is
                    spawned from an engagement.
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
