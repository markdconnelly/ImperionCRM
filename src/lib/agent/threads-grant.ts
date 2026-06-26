/**
 * Belle's Threads tool grant + gauntlet config (ADR-0125 D3 / D6, epic #1334 S5).
 *
 * PURE constant — a plain module (NOT `"use server"`) so it can be imported by tests, the GUI,
 * and docs. The AUTHORITATIVE grant row is a deny-by-default `agent_tool_grant` seeded by the
 * S4 backend migration (paired with the `source_skill(provider='threads')` + autonomy policy);
 * schema work is migration-owned (CLAUDE.md §1), so this is the front-end-declared contract the
 * GUI labels against and the seed must match, kept in lockstep with the action catalog (exactly
 * like action-autonomy / action-catalog mirror the backend's enforcement copy).
 *
 * `markGated` + the customer-facing HARD ceiling mean Belle may DRAFT but never auto-send:
 * every Threads Social Action routes to the pending-action cockpit for human approval (v1).
 */
export const BELLE_THREADS_GRANT = {
  /** Marketing agent — roster name Belle (docs/agents/agent-roster.md). */
  agentKey: "marketing",
  agentLabel: "Belle · Marketing",
  /** The granted action kinds (mirror the action-catalog registrations). */
  tools: ["publish_threads", "reply_threads"] as const,
  /** ADR-0055 tier of the granted actions — customer-facing public broadcast. */
  tier: "T3" as const,
  /** Customer-facing is a HARD ceiling (ADR-0109/0121): never auto-executes above ceiling. */
  hardCeiling: "customer_facing" as const,
  /** v1: every Threads Social Action is Mark-gated / human-approved (ADR-0124 D4). */
  markGated: true,
  dataClass: "operational" as const,
} as const;
