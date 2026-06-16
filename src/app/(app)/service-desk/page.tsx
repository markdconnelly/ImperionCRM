import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { QueueSummaryBar } from "@/components/omnichannel-queue/queue-summary-bar";
import { QueueTable } from "@/components/omnichannel-queue/queue-table";
import { getRepositories } from "@/lib/data";
import { buildQueue, routingWired, summarizeQueue } from "@/lib/omnichannel-queue";

/**
 * The omnichannel inbound queue (ADR-0074 §6, #408): one prioritized agent work queue
 * that unifies inbound across channels — Imperion-native `chat_session` (the only native
 * service-desk store, §5) and silver `ticket` (Autotask is the ticket SoR, §1) — into a
 * single triage surface.
 *
 * **Read-only by design.** The queue is a VIEW/orchestration over sources, not a new
 * system of record (§6). Routing/assignment is the job of the ICM service-desk workspace
 * (#280) executed by the backend orchestrator (ADR-0042) — the front end reflects it, it
 * does not route. Until that seam surfaces a routing lane the page degrades honestly to a
 * read-only view with a notice (the repo's stub-don't-fail pattern); it never breaks.
 *
 * Both source reads are direct DB reads for rendering (allowed, §1) via the typed
 * repositories; with no DB they return empty (mock fallback) and the page shows the empty
 * state rather than failing.
 */
export default async function ServiceDeskQueuePage() {
  const { crm, engagements } = getRepositories();
  const [chatSessions, tickets, slaBreaches] = await Promise.all([
    crm.listChatSessions(),
    engagements.listTickets({}),
    engagements.listTicketSlaBreaches(),
  ]);

  // SLA-breach priority (ADR-0074 §2, #671): the `ticket_sla_breach` projection
  // (migration 0118) drives ticket ordering — breached → urgent, at_risk → high.
  // Keyed by ticket id; with no DB the accessor returns [] (mock fallback), so the
  // queue degrades to status-inferred open + normal priority. Honest, never wrong.
  const slaByTicketId = new Map(slaBreaches.map((r) => [r.ticketId, r]));
  const items = buildQueue({ chatSessions, tickets, slaByTicketId });
  const summary = summarizeQueue(items);
  const routed = routingWired(items);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Omnichannel queue"
        description="Unified inbound work across chat, social, email and tickets, prioritized into one agent queue."
      />

      {/* Honest degrade: the queue reflects ICM #280 routing; until that seam is wired it
          is a read-only triage view, not an active router. */}
      {!routed && (
        <div className="flex items-start gap-2 rounded-md border border-amber/40 bg-amber/10 px-4 py-2.5 text-sm text-amber">
          <Icon name="Info" size={15} className="mt-0.5 shrink-0" />
          <span>
            Read-only view. Active routing and assignment run through the ICM service-desk
            workspace (#280) on the backend (ADR-0042); items show as{" "}
            <span className="font-medium">unrouted</span> until that seam is wired. Triage
            from the source surfaces:{" "}
            <Link href="/communications" className="underline hover:text-text">
              Communications
            </Link>{" "}
            and{" "}
            <Link href="/tickets" className="underline hover:text-text">
              Tickets
            </Link>
            .
          </span>
        </div>
      )}

      <QueueSummaryBar summary={summary} />
      <QueueTable items={items} />
    </div>
  );
}
