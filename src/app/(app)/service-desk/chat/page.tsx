import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { AgentConsole } from "@/components/service-desk/agent-console";
import { LiveChatWidget } from "@/components/service-desk/live-chat-widget";
import { getRepositories } from "@/lib/data";
import { summarizeDeflection } from "@/lib/chat-session";
import { CHAT_TRANSPORT_NOT_WIRED } from "@/lib/chat-live";
import { getSessionRoles } from "@/lib/auth/session";
import { can } from "@/lib/auth/policy";
import { isDbConfigured } from "@/lib/db/client";
import { escalateChatToTicketAction, sendChatReplyAction } from "./actions";

export const dynamic = "force-dynamic"; // live chat sessions, never prerendered

/**
 * Service desk — live chat agent console (ADR-0074 §6, #407).
 *
 * Surfaces the Imperion-native `chat_session` read model (migration 0117): active
 * sessions, transcript preview, deflection telemetry, an agent reply box, and
 * escalate-to-Autotask. Reads come straight from the DB (ADR-0042 — the web role has
 * SELECT on chat_session); the reply + escalate paths are PROCESSES and go through
 * the backend. The live chat transport itself isn't wired in every environment, so
 * the console degrades honestly to a read/poll view (ADR-0018). A preview of the
 * customer-facing widget renders below the console.
 */
export default async function ServiceDeskPage() {
  const roles = await getSessionRoles();
  const canWrite = can(roles, "tickets:write"); // matches the action gate (ADR-0045)

  const { crm } = getRepositories();
  const [sessions, accounts] = await Promise.all([
    crm.listChatSessions(200),
    crm.listAccounts(),
  ]);

  const summary = summarizeDeflection(sessions);
  const dbConfigured = isDbConfigured();
  // The chat transport host (delivers replies / drives the bot) is the comms backend.
  const transportWired = Boolean(process.env.COMMS_SERVICE_URL?.trim());
  // The Autotask escalation seam is the integration backend.
  const escalateConfigured = Boolean(process.env.INTEGRATION_SERVICE_URL?.trim());

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Service Desk"
        description="Live chat agent console — active sessions, transcripts, deflection telemetry, and escalate-to-ticket. Autotask is the ticket system of record (ADR-0074)."
      />

      {!transportWired && (
        <div className="flex items-start gap-2 rounded-md border border-amber/40 bg-amber/10 px-4 py-2 text-xs text-amber">
          <Icon name="Info" size={14} className="mt-0.5 shrink-0" />
          {CHAT_TRANSPORT_NOT_WIRED}
        </div>
      )}

      <AgentConsole
        sessions={sessions}
        summary={summary}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        canWrite={canWrite}
        escalateConfigured={escalateConfigured}
        transportNote={transportWired ? "" : CHAT_TRANSPORT_NOT_WIRED}
        escalateAction={escalateChatToTicketAction}
        replyAction={sendChatReplyAction}
      />

      {/* Customer-facing widget preview (the component embedded on the public site). */}
      <section className="rounded-xl border border-border bg-panel p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold tracking-tight">
            Customer chat widget
          </h3>
          <span className="text-[11px] text-dim">
            embeddable · {dbConfigured ? "" : "sample data · "}
            {transportWired ? "transport wired" : "preview mode"}
          </span>
        </div>
        <p className="mb-3 text-sm text-dim">
          This is the live preview of the widget visitors use — a bot grounded in gold
          knowledge answers first (ADR-0041), then escalates to a person or an Autotask
          ticket. Try it in the bottom-right corner.
        </p>
        <div className="rounded-lg border border-dashed border-border bg-panel-2/40 px-4 py-10 text-center text-sm text-dim">
          The widget launcher is pinned to the bottom-right of this page — open it to try the
          customer experience.
        </div>
      </section>

      <LiveChatWidget transportWired={transportWired} />
    </div>
  );
}
