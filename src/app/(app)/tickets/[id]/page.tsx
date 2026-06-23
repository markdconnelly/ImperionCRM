import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getRepositories } from "@/lib/data";

/** A labelled field in the detail grid. */
function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-dim">{label}</dt>
      <dd className="text-sm text-text">{value ?? "—"}</dd>
    </div>
  );
}

/**
 * Read-only ticket detail / drill-in (#1140). The list page (`/tickets`) rows now
 * link here so a ticket exposes a drill-in, consistent with Accounts/Contacts. The
 * `ticket` table is a read-only Autotask mirror (ADR-0044), so this surface mirrors
 * the list fields without write actions; the richer detail (description/resolution,
 * timeline) is a future follow-up once a per-ticket read model lands. Resolved off
 * the existing `listTickets()` read so no shared data-layer method is added.
 */
export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { engagements } = getRepositories();
  const tickets = await engagements.listTickets();
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={ticket.number ? `Ticket #${ticket.number}` : "Ticket"}
        description={ticket.title}
      >
        <Link
          href="/tickets"
          className="flex items-center gap-1.5 text-sm text-dim transition-colors hover:text-text"
        >
          <Icon name="ArrowLeft" size={14} />
          All tickets
        </Link>
      </PageHeader>

      <section className="rounded-xl border border-border bg-panel p-4">
        <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
          <Icon name="Ticket" size={15} />
          Details
        </h3>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Field label="Number" value={ticket.number} />
          <Field label="Account" value={ticket.account} />
          <Field label="Status" value={ticket.status} />
          <Field label="Priority" value={ticket.priority} />
          <Field label="Opened" value={ticket.opened} />
        </dl>
      </section>
    </div>
  );
}
