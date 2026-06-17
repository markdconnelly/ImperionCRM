import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { getRepositories } from "@/lib/data";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeSettings } from "@/lib/auth/roles";
import { summarizeBreach, sortByUrgency } from "@/lib/sla-breach";
import type { TicketSlaState } from "@/types";

export const dynamic = "force-dynamic";

/**
 * SLA settings — READ-ONLY overview (#836 — Wave-8 buildout of the #794 nav scaffold).
 *
 * SLA targets are Autotask-sourced (the `ticket_sla_breach` view recomputes breach on
 * every read against the latest pulled ticket state — ADR-0074 §2 / ADR-0044, #665);
 * Autotask is the system of record, so there is NO app-owned config table and NO write
 * surface here. This page only READS the projection: summary tiles of the breach-state
 * buckets and a table of tickets carrying a contractual SLA with their current state.
 * Admin-only (`canSeeSettings`, ADR-0030).
 */

const STATE_LABEL: Record<TicketSlaState, string> = {
  breached: "Breached",
  at_risk: "At risk",
  ok: "Met",
  unknown: "Unknown",
};

const STATE_TONE: Record<TicketSlaState, string> = {
  breached: "border-red/40 bg-red/10 text-red",
  at_risk: "border-amber/40 bg-amber/10 text-amber",
  ok: "border-green/40 bg-green/10 text-green",
  unknown: "border-border bg-panel-2 text-dim",
};

function StateBadge({ state }: { state: TicketSlaState }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATE_TONE[state]}`}
    >
      {STATE_LABEL[state]}
    </span>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`flex flex-col gap-1 rounded-lg border bg-panel p-4 ${tone}`}>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-dim">{label}</span>
    </div>
  );
}

export default async function SlaSettingsPage() {
  const roles = await getSessionRoles();
  if (!canSeeSettings(roles)) redirect("/");

  const { engagements } = getRepositories();
  const rows = await engagements.listTicketSlaBreaches();
  // Only tickets under a contractual SLA carry a target/state worth showing here.
  const slaRows = sortByUrgency(rows.filter((r) => r.slaApplies));
  const summary = summarizeBreach(slaRows);
  const unknown = slaRows.filter((r) => r.slaState === "unknown").length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="SLA settings"
        description="Effective service-level state across tickets under a contractual SLA."
      />

      <p className="flex items-start gap-2 rounded-md border border-border bg-panel-2 px-3 py-2 text-xs text-dim">
        <Icon name="Info" size={13} className="mt-0.5 shrink-0 text-accent" />
        <span>
          SLA targets are managed in Autotask (source of record); this is a read-only
          view (ADR-0074, #665). Breach state recomputes on every read against the latest
          pulled ticket data — there is no app-owned SLA configuration.
        </span>
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="At risk" value={summary.atRisk} tone={STATE_TONE.at_risk} />
        <Tile label="Breached" value={summary.breached} tone={STATE_TONE.breached} />
        <Tile label="Met" value={summary.ok} tone={STATE_TONE.ok} />
        <Tile label="Unknown" value={unknown} tone={STATE_TONE.unknown} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Tickets under an SLA
        </h2>
        <div className="rounded-lg border border-border bg-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-dim">
                  <th className="px-4 py-2 font-medium">Ticket</th>
                  <th className="px-4 py-2 font-medium">SLA</th>
                  <th className="px-4 py-2 font-medium">Priority</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {slaRows.map((r) => (
                  <tr
                    key={r.ticketId}
                    className="border-t border-border align-top hover:bg-panel-2"
                  >
                    <td className="px-4 py-2.5 font-medium">{r.number ?? r.ticketId}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-dim">
                      {r.slaId ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-dim">{r.priority ?? "—"}</td>
                    <td className="px-4 py-2.5 text-dim">{r.status ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <StateBadge state={r.slaState} />
                    </td>
                  </tr>
                ))}
                {slaRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-dim">
                      No tickets under a contractual SLA. Targets are configured in
                      Autotask.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
