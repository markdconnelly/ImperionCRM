import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Icon } from "@/components/ui/icon";
import { OrchestratorSettingsCard } from "@/components/agent/orchestrator-settings-card";
import { CostRollupCard } from "@/components/agent/cost-rollup-card";
import { getAgentSettingsState } from "@/lib/agent/settings-data";
import { getCostRollupState } from "@/lib/agent/cost-rollup-data";
import { parseMonthParam } from "@/lib/agent/cost-rollup";
import { listRecentAgentRuns } from "@/lib/agent/activity";
import { listActionAutonomyDials } from "@/lib/agent/action-autonomy-data";
import { ActuationDial } from "@/components/agent/actuation-dial";
import { formatUsd, settingsSourceNote } from "@/lib/agent/settings";
import { getSessionRoles } from "@/lib/auth/session";
import { canSeeAgentPages } from "@/lib/auth/roles";
import { can } from "@/lib/auth/policy";
import { isDbConfigured } from "@/lib/db/client";
import { saveAgentSettingsAction, setActionAutonomyAction } from "./actions";

export const dynamic = "force-dynamic"; // live settings + spend, never prerendered

/**
 * The registered agent surface, derived from the backend orchestrator's actual
 * wiring (backend ADR-0036: `registerSubAgent(reportingAgent|salesAgent)` plus
 * the `search_knowledge` tool in the loop's catalog). Keep this list in lockstep
 * with the backend registrations — present only what is really routable.
 */
const SUB_AGENTS = [
  {
    name: "Reporting",
    icon: "BarChart3",
    badge: "read-only",
    badgeTone: "text-green",
    role: "Answers questions over the live reporting snapshot — active/recurring revenue, open pipeline by stage, win rate, assessment→managed conversion, delivery time. Grounds every figure in the same aggregations the Reporting page shows; never invents numbers.",
    tier: "Premium-tier synthesis",
  },
  {
    name: "Sales / Outreach",
    icon: "Send",
    badge: "approval-gated",
    badgeTone: "text-amber",
    role: "Drafts consent-gated outbound email/SMS for a contact, grounded in their gold-layer history. It only ever PROPOSES — the draft is queued for human approval, consent is checked up front and re-asserted at execution. Nothing sends autonomously.",
    tier: "Premium-tier drafting",
  },
] as const;

/**
 * Acting agents whose actuation autonomy an operator can dial (#1013, ADR-0109). The
 * global `*` default is fail-closed level 1 (Manual) and covers every agent absent a
 * more specific row; named entries are the sub-agents that actually PROPOSE outbound
 * actions today (Reporting is read-only, so it has no dial). Keep this in lockstep with
 * the registered actuators above — a dial only means something for an agent that acts.
 */
const ACTUATORS = [
  { agentKey: "*", actionClass: "*", label: "Global default (all agents)" },
  { agentKey: "sales", actionClass: "*", label: "Sales / Outreach" },
] as const;

const TOOLS = [
  {
    name: "search_knowledge",
    icon: "BrainCircuit",
    role: "Semantic search over the gold knowledge store (accounts, contacts, contracts, tickets) — Voyage embeddings @ 1024 dims (ADR-0041/0043). The loop uses it to ground answers in company facts.",
  },
] as const;

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const roles = await getSessionRoles();
  // Admin-only (#90): nav hiding and the edge middleware use the same predicate,
  // but guard here too so the page can never render for a non-admin (same
  // defense-in-depth as Settings, ADR-0030).
  if (!canSeeAgentPages(roles)) redirect("/");
  const canEdit = can(roles, "settings:write"); // admin-only (ADR-0045)
  const canOperate = can(roles, "agents:operate"); // admin-only (ADR-0045) — gates the dial

  // ?month=YYYY-MM browses past rollup months (#184); anything else = current.
  const month = parseMonthParam((await searchParams).month);

  const [settings, runs, costRollup, dials] = await Promise.all([
    getAgentSettingsState(),
    listRecentAgentRuns(20),
    getCostRollupState(month),
    listActionAutonomyDials(),
  ]);
  const dialByKey = new Map(dials.map((d) => [`${d.agentKey}::${d.actionClass}`, d]));
  const dbConfigured = isDbConfigured();

  const sourceNote = settingsSourceNote(settings.source);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="AI Agents"
        description="The orchestrator's model tier, monthly budget, registered sub-agents, and recent audited activity."
      />

      {/* 1 ── Orchestrator: preset + budget + spend (backend ADR-0037) */}
      <OrchestratorSettingsCard
        preset={settings.preset}
        budgetUsdMonthly={settings.budgetUsdMonthly}
        spendMonthToDateUsd={settings.spendMonthToDateUsd}
        presets={settings.presets}
        canEdit={canEdit}
        canSave={settings.source === "backend"}
        sourceNote={sourceNote}
        saveAction={saveAgentSettingsAction}
      />

      {/* 2 ── Per-process cost telemetry (#184, backend #65) */}
      <CostRollupCard
        state={costRollup}
        month={costRollup.ok ? costRollup.rollup.month : (month ?? new Date().toISOString().slice(0, 7))}
      />

      {/* 3 ── Registered sub-agents (backend ADR-0036 wiring) */}
      <section className="rounded-xl border border-border bg-panel p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold tracking-tight">
            Registered sub-agents
          </h3>
          <span className="text-[11px] text-dim">
            single-orchestrator model (ADR-0004) · every turn audited & metered
          </span>
        </div>
        <p className="mb-3 text-sm text-dim">
          You always talk to ONE orchestrator (the right-hand panel). It runs a Claude
          tool-use loop — up to 5 model turns — choosing among the sub-agents below, and
          falls back to deterministic routing when no model is available. Sub-agents keep
          their own least-privilege scope and never address you directly.
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {SUB_AGENTS.map((a) => (
            <div key={a.name} className="flex gap-3 rounded-lg border border-border bg-panel-2 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-panel text-dim">
                <Icon name={a.icon} size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-text">{a.name}</p>
                  <span className={`rounded border border-border px-1.5 py-0.5 text-[10px] ${a.badgeTone}`}>
                    {a.badge}
                  </span>
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-dim">
                    {a.tier}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-dim">{a.role}</p>
              </div>
            </div>
          ))}
          {TOOLS.map((t) => (
            <div key={t.name} className="flex gap-3 rounded-lg border border-border bg-panel-2 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-panel text-dim">
                <Icon name={t.icon} size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-sm font-medium text-text">{t.name}</p>
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-accent">
                    orchestrator tool
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-dim">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-dim">
          More sub-agents (CRM, Proposal, Onboarding, Documentation, IT Glue, Autotask,
          M365) register here as they come online — the catalog above reflects what the
          orchestrator can actually route to today.
        </p>
      </section>

      {/* 4 ── Actuation autonomy dials (#1013 / 2E-3, ADR-0107 D4 / ADR-0109) */}
      <section className="rounded-xl border border-border bg-panel p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold tracking-tight">
            Actuation autonomy
          </h3>
          <span className="flex items-center gap-1 text-[11px] text-dim">
            <Icon name="Gauge" size={12} />
            per-agent · audited · reversible (ADR-0109)
          </span>
        </div>
        <p className="mb-3 text-sm text-dim">
          How far an acting agent may go on its own before an action routes to the approval
          cockpit. Each level 1–5 resolves to an ADR-0055 tier ceiling — an action whose tier
          exceeds the ceiling is held for a human; at or below it executes. Fail-closed at
          level 1 (Manual): until raised, every action above a read is approved.
          {!dbConfigured && " · sample data"}
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {ACTUATORS.map((a) => (
            <ActuationDial
              key={`${a.agentKey}::${a.actionClass}`}
              agentKey={a.agentKey}
              actionClass={a.actionClass}
              label={a.label}
              dial={dialByKey.get(`${a.agentKey}::${a.actionClass}`) ?? null}
              canEdit={canOperate}
              setAction={setActionAutonomyAction}
            />
          ))}
        </div>
        <p className="mt-3 text-[11px] text-dim">
          The backend resolves the level at dispatch (read-only on this table); the cockpit
          (pending actions) lands with backend 2E-2. Per-action-class overrides and ceiling
          tuning are data on `agent_action_autonomy` — no schema change to retune.
        </p>
      </section>

      {/* 5 ── Recent activity: the orchestrator's audit trail (agent.turn) */}
      <section className="rounded-xl border border-border bg-panel p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold tracking-tight">Recent agent activity</h3>
          <div className="flex items-center gap-3">
            <Link href="/agents/grants" className="text-[11px] text-dim hover:text-text">
              Tool grants →
            </Link>
            <Link href="/agents/evals" className="text-[11px] text-dim hover:text-text">
              Eval runs →
            </Link>
            <span className="text-[11px] text-dim">
              last {runs.length || 20} turns · audit_log (agent.turn)
              {!dbConfigured && " · sample data"}
            </span>
          </div>
        </div>
        {runs.length === 0 ? (
          <p className="text-sm text-dim">
            No agent turns recorded yet — activity appears here as soon as the
            orchestrator handles its first request.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-dim">
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Who</th>
                  <th className="py-2 pr-3 font-medium">Routed to</th>
                  <th className="hidden py-2 pr-3 font-medium md:table-cell">Routing</th>
                  <th className="py-2 pr-3 text-right font-medium">Turns</th>
                  <th className="py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3 text-dim" title={r.occurredAt}>
                      {timeAgo(r.occurredAt)}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-text">{r.actor ?? "—"}</td>
                    <td className="whitespace-nowrap py-2 pr-3">
                      <span className="rounded border border-border bg-panel-2 px-1.5 py-0.5 text-xs text-text">
                        {r.routedTo}
                      </span>
                      {r.requiresApproval && (
                        <span className="ml-1.5 rounded border border-border px-1.5 py-0.5 text-[10px] text-amber">
                          approval pending
                        </span>
                      )}
                    </td>
                    <td className="hidden max-w-[28rem] truncate py-2 pr-3 text-xs text-dim md:table-cell">
                      {r.routingReason ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-right text-dim">{r.modelTurns ?? "—"}</td>
                    <td className="py-2 text-right font-mono text-xs text-text">
                      {formatUsd(r.costUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
