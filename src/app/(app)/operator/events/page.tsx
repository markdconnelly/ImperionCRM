import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EventObservabilityView } from "@/components/agents/event-observability-view";
import {
  getDlqDepth,
  listDeadLetteredEvents,
  listRecentEventLineage,
} from "@/lib/agent/event-observability";
import { getSessionRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/policy";
import { isDbConfigured } from "@/lib/db/client";
import { replayDeadLetteredEventAction } from "../actions";

export const dynamic = "force-dynamic"; // live event/DLQ surface, never prerendered

/**
 * Wake-event observability + DLQ surface (#1000, 1D of epic #991/#997, ADR-0111).
 *
 * The production-hardening glass box over the event substrate: recent wake events with their
 * lifecycle, the agent_runs each event opened (1:N fan-out — enumerated via the eventKey
 * '<event_id>:<workflow>', never assumed 1:1 after #999/#357), and the dead-letter queue. A
 * dispatch that exhausts its attempts dead-letters with the original event preserved (no silent
 * drop); an admin can replay a dead-lettered event back through the SAME dispatch path —
 * idempotency holds via the #299/#357 eventKey guard, so a replay never double-opens a run that
 * already succeeded. Read-first over agent_event + agent_run (mig 0164/0181/0183); the replay
 * write goes through the backend (`agents:operate`-gated) and degrades honestly until the
 * dispatcher is wired (backend twin of #1000).
 */
export default async function EventObservabilityPage() {
  const roles = await getSessionRoles();
  const canReplay = can(roles, "agents:operate"); // admin-only (ADR-0050)

  const [depth, deadLetters, lineage] = await Promise.all([
    getDlqDepth(),
    listDeadLetteredEvents(),
    listRecentEventLineage(),
  ]);
  const dbNote = isDbConfigured() ? "" : " · sample data";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Wake events — triggers, runs & dead-letter queue"
        description="Watch the agent event substrate end-to-end: each business event, the subscriptions it matched, the agent runs it opened (one event can wake many), and any dispatch that dead-lettered. Replay a dead event once the cause is fixed — idempotently, so no run double-opens."
      >
        <Link href="/agents" className="text-sm text-dim hover:text-text">
          ← AI agents
        </Link>
      </PageHeader>

      <EventObservabilityView
        depth={depth}
        deadLetters={deadLetters}
        lineage={lineage}
        canReplay={canReplay}
        replayAction={replayDeadLetteredEventAction}
      />

      <p className="text-[11px] text-dim">
        Showing {lineage.length} recent event{lineage.length === 1 ? "" : "s"} · {deadLetters.length} dead-lettered ·
        agent_event inbox + eventKey run lineage (ADR-0111){dbNote}.
      </p>
    </div>
  );
}
