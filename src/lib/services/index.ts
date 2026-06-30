/**
 * External service clients (ADR-0018) — placeholders.
 *
 * Each export below is a thin, typed client for a workload hosted OUTSIDE this repo.
 * The methods call the external function/API via `callService`; until that endpoint
 * is built and its base-URL env var is set, calls throw `ServiceNotConfiguredError`.
 * This file is the contract/registry the GUI codes against, so wiring a real backend
 * later is a config change, not a code change.
 *
 * Implementations of these services live in separate repos/objects (Azure Functions,
 * container apps). See docs/architecture/application-boundary.md and docs/api/.
 *
 * Server-only.
 */
import "server-only";
import {
  callService,
  callServiceRaw,
  type ServiceDescriptor,
} from "@/lib/services/external-client";
import type { RefreshSource } from "@/lib/integrations/pipeline-refresh";
import type { PayrollMatchSuggestion, TimeReconciliationResult } from "@/types";

// Services hosted on the network-isolated backend (ADR-0028) sit behind Easy Auth and
// declare `audienceEnv` so callService attaches a managed-identity bearer token. The
// backend (imperioncrmbackend) shares one audience, so integration + credentials point
// at the same INTEGRATION_SERVICE_AUDIENCE.
const services = {
  agent: {
    name: "Agent orchestrator",
    baseUrlEnv: "AGENT_SERVICE_URL",
    audienceEnv: "INTEGRATION_SERVICE_AUDIENCE", // same backend host → same Easy Auth audience
  },
  integration: {
    name: "Integration sync",
    baseUrlEnv: "INTEGRATION_SERVICE_URL",
    audienceEnv: "INTEGRATION_SERVICE_AUDIENCE",
  },
  enrichment: { name: "Lead enrichment", baseUrlEnv: "ENRICHMENT_SERVICE_URL" },
  comms: { name: "Communications", baseUrlEnv: "COMMS_SERVICE_URL" },
  campaign: { name: "Ad campaigns", baseUrlEnv: "CAMPAIGN_SERVICE_URL" },
  board: {
    name: "AI Board of Directors",
    // The board runtime lives on the same backend Function App as the orchestrator
    // (backend ADR-0039), so it shares the agent base URL + Easy Auth audience.
    baseUrlEnv: "AGENT_SERVICE_URL",
    audienceEnv: "INTEGRATION_SERVICE_AUDIENCE",
  },
  credentials: {
    name: "Credential store",
    baseUrlEnv: "INTEGRATION_SERVICE_URL",
    audienceEnv: "INTEGRATION_SERVICE_AUDIENCE",
  },
  pipeline: {
    name: "Data pipeline",
    baseUrlEnv: "PIPELINE_SERVICE_URL",
    audienceEnv: "PIPELINE_SERVICE_AUDIENCE",
  },
  // Governed-metric query engine (#259/ADR-0078, epic #1050). The single read path for a
  // governed business number lives on the backend orchestrator Function App
  // (`/orchestration/metrics/{key}`), so it shares the agent base URL + Easy Auth audience.
  // The FE agent+BI query interface (#1115) calls THIS so an agent and a dashboard resolve the
  // identical value. No-op (ServiceNotConfiguredError) until AGENT_SERVICE_URL is set.
  metrics: {
    name: "Metric query engine",
    baseUrlEnv: "AGENT_SERVICE_URL",
    audienceEnv: "INTEGRATION_SERVICE_AUDIENCE",
  },
  // MileIQ External API custody (#854/ADR-0099): the OAuth token lives in Key Vault on
  // the backend (#109), same host as the other per-user connections, so it shares the
  // integration base URL + Easy Auth audience. No-op (ServiceNotConfiguredError) until
  // backend #109 + creds #495 land — full MileIQ integration is v2; v1 is manual entry.
  mileiq: {
    name: "MileIQ mileage",
    baseUrlEnv: "INTEGRATION_SERVICE_URL",
    audienceEnv: "INTEGRATION_SERVICE_AUDIENCE",
  },
  // Receipt blob custody (#899, ADR-0083 §Receipts; backend BE #200). The endpoint
  // stores the file BYTES in a private `receipts` blob and returns the custody fields;
  // it runs on the same backend Function App, so it shares the integration base URL +
  // Easy Auth audience. No-op (ServiceNotConfiguredError) until INTEGRATION_SERVICE_URL
  // is set, so the upload surface degrades gracefully when the backend is unconfigured.
  receipts: {
    name: "Receipt upload",
    baseUrlEnv: "INTEGRATION_SERVICE_URL",
    audienceEnv: "INTEGRATION_SERVICE_AUDIENCE",
  },
  // Opportunity knowledge blob custody (#429, epic #425; ADR-0069 attachments → Azure
  // Blob). Stores the sales-uploaded customer-knowledge BYTES in a private blob and
  // returns the custody fields; same backend Function App, so it shares the integration
  // base URL + Easy Auth audience. No-op (ServiceNotConfiguredError) until
  // INTEGRATION_SERVICE_URL is set, so the upload surface degrades with a notice.
  knowledge: {
    name: "Opportunity knowledge upload",
    baseUrlEnv: "INTEGRATION_SERVICE_URL",
    audienceEnv: "INTEGRATION_SERVICE_AUDIENCE",
  },
} satisfies Record<string, ServiceDescriptor>;

/** ADR-0055 action tiers, lowest authority first (mirrors AutonomyTier). */
export type ProposedActionTier = "T0" | "T1" | "T2" | "T3";

/**
 * The orchestrator's generalized proposed-action envelope (backend #282, slice 1 of
 * BE #263). `kind` names the catalog action (e.g. `send_email`, `update_ticket`,
 * `log_time`); `input` is the EXACT payload `POST /agent/actions/execute` consumes —
 * the web app forwards it VERBATIM, never remapping its fields (issue #1130). `tier` +
 * `dataClass` drive the approval surface's gating/labelling; `delivery`/`consentOk`/
 * `targetContactId` are comms-projection hints carried for the legacy send path.
 */
export interface ProposedAction {
  /** Catalog action kind, e.g. "send_email" | "send_sms" | "update_ticket" | "log_time". */
  kind: string;
  /** The verbatim execute payload — forwarded as `action` to /agent/actions/execute, untouched. */
  input: Record<string, unknown>;
  /** ADR-0055 action tier — drives the autonomy ceiling + the approval-surface badge. */
  tier: ProposedActionTier;
  /** Coarse data sensitivity class (ADR-0016 RLS), e.g. "operational" | "client_pii" | "financial". */
  dataClass: string;
  /** Resolved delivery hints for a comms send (recipient address, sender connection). */
  delivery?: { to?: string; fromConnectionId?: string };
  /** Why the agent proposed this — shown to the approver. */
  rationale?: string;
  /** Pre-checked consent for a comms send (the backend re-asserts at execution, ADR-0058). */
  consentOk?: boolean;
  /** The silver `contact` the action targets, when applicable. */
  targetContactId?: string;
}

/** The orchestrator's reply shape (backend ADR-0032/0036 wire contract). */
export interface AgentReply {
  text: string;
  routedTo: string;
  routingReason: string;
  requiresApproval?: boolean;
  /**
   * The generalized proposed-action envelope (backend #282). Each entry's `input` is the
   * verbatim execute payload. This is the surface the approval UI consumes (#1130).
   */
  proposedActions?: ProposedAction[];
  /**
   * Legacy single-action comms projection (`{ kind, contactId, channel, body }`), present
   * only when the first action is a comms send. Kept for back-compat ONLY; the FE no longer
   * relies on it (#1130). Dropping it on the backend is a coordinated BE follow-up.
   */
  proposedAction?: { kind: string; contactId: string; channel: string; body: string };
  conversationId?: string;
}

/**
 * Agent settings wire shape (backend ADR-0037 — GET/PUT /api/agent/settings).
 * `presets` is the authoritative preset → model-pair catalog; `models` is the
 * pair the current preset pins.
 */
export interface AgentSettingsWire {
  preset: "economy" | "balanced" | "premium";
  /** Hard monthly ceiling in USD; null = no cap. */
  budgetUsdMonthly: number | null;
  models: { cheap: string; premium: string };
  spendMonthToDateUsd: number;
  presets: Record<"economy" | "balanced" | "premium", { cheap: string; premium: string }>;
}

/** One process's usage rollup (backend #65 — GET /agent/cost-rollup). */
export interface CostRollupProcess {
  /** Audit verb identifying the process, e.g. 'agent.turn', 'board.conclude'. */
  action: string;
  /** What the spend attaches to, e.g. 'agent_conversation', 'board_session'. */
  entityType: string | null;
  runs: number;
  modelCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  /** The costliest entities of this process (top 20 by spend). */
  entities: Array<{ entityId: string; runs: number; costUsd: number; lastAt: string }>;
}

/** GET /agent/cost-rollup?month=YYYY-MM wire shape (backend #65/PR #74). */
export interface CostRollupWire {
  month: string;
  totals: {
    runs: number;
    modelCalls: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
  processes: CostRollupProcess[];
}

/** Orchestrator + sub-agents (backend ADR-0036 — the Claude tool-use loop). */
export const agentService = {
  /** One orchestrator turn scoped to the acting employee (app_user.id). */
  ask: (input: {
    message: string;
    actingUserId: string;
    context?: Record<string, unknown>;
    conversationId?: string;
  }) =>
    callService<AgentReply>(services.agent, "/agent", {
      method: "POST",
      body: JSON.stringify(input),
      timeoutMs: 120_000, // the tool-use loop may take several model turns
    }),

  /**
   * Execute an approval-gated outbound action (backend POST /agent/actions/execute —
   * the ONLY path that sends; backend ADR-0033). Requires an explicit human approver;
   * the backend re-asserts `current_consent` at execution (403 consent_denied) and
   * logs the send to the `interaction` timeline. Used for agent-proposed sends AND
   * the composer's human-initiated 1:1 sends (#183 — the composing human is both
   * proposer and approver, ADR-0055 T2 propose-only).
   */
  executeAction: (input: {
    action: {
      kind: "send_email" | "send_sms";
      contactId: string;
      channel: "email" | "sms";
      subject?: string;
      body: string;
    };
    approval: { approvedByUserId: string; approved: true };
    /** Recipient address/number, resolved by the web app at approval time. */
    to: string;
    /** The sender's M365 connection (required for send_email). */
    fromConnectionId?: string;
  }) =>
    callService<{ channel: "email" | "sms"; interactionId?: string }>(
      services.agent,
      "/agent/actions/execute",
      { method: "POST", body: JSON.stringify(input), timeoutMs: 30_000 },
    ),

  /**
   * Execute a generalized agent-PROPOSED action (issue #1130) against the same
   * approval-gated executor as {@link executeAction} (backend POST /agent/actions/execute,
   * the ONLY send path — backend ADR-0033). Unlike the human-composer path, the
   * orchestrator already resolved the action's full payload, so the web app forwards
   * `action: proposedActions[i].input` VERBATIM — no field remapping, no recipient/connection
   * resolution here. `approval` carries the human approver (ADR-0055 — the operator who
   * clicked Approve); the backend re-asserts consent at execution (403 consent_denied).
   */
  executeProposedAction: (input: {
    /** The envelope's `input` — the exact execute payload, forwarded untouched. */
    action: Record<string, unknown>;
    approval: { approvedByUserId: string; approved: true };
  }) =>
    callService<{ channel?: "email" | "sms"; interactionId?: string }>(
      services.agent,
      "/agent/actions/execute",
      { method: "POST", body: JSON.stringify(input), timeoutMs: 30_000 },
    ),

  /** Current preset + budget + month-to-date spend (backend ADR-0037). */
  getSettings: () => callService<AgentSettingsWire>(services.agent, "/agent/settings"),

  /**
   * Per-process cost telemetry rollup over the agent-work audit rows (backend #65).
   * `month` is YYYY-MM; omitted = the current month.
   */
  costRollup: (month?: string) =>
    callService<CostRollupWire>(
      services.agent,
      `/agent/cost-rollup${month ? `?month=${encodeURIComponent(month)}` : ""}`,
    ),

  /** Update preset and/or budget; `actingUserId` feeds the backend's audit trail. */
  updateSettings: (input: {
    preset?: "economy" | "balanced" | "premium";
    budgetUsdMonthly?: number | null;
    actingUserId?: string;
  }) =>
    callService<AgentSettingsWire>(services.agent, "/agent/settings", {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  /**
   * Grant a sub-agent a tool, or edit a grant's scope predicate (idempotent upsert;
   * backend `POST /agent/grants`, #248 / ADR-0107 D3). `scope` is a per-input-field
   * allow-list (`{}` = unconstrained). The grant write is backend-owned (ADR-0042 — the
   * web role has no INSERT/UPDATE on `agent_tool_grant`); `actingUserId` feeds the audit.
   */
  upsertToolGrant: (input: {
    agentId: string;
    tool: string;
    scope?: Record<string, string[]>;
    actingUserId?: string;
  }) =>
    callService<{ agentId: string; tool: string; scope: Record<string, string[]> }>(
      services.agent,
      "/agent/grants",
      { method: "POST", body: JSON.stringify(input) },
    ),

  /** Revoke a sub-agent's tool grant (backend `DELETE /agent/grants`, #248). */
  revokeToolGrant: (input: { agentId: string; tool: string; actingUserId?: string }) =>
    callService<{ revoked: boolean }>(services.agent, "/agent/grants", {
      method: "DELETE",
      body: JSON.stringify(input),
    }),

  /**
   * Resolve a parked ICM checkpoint (#278, ADR-0061): approve / edit-and-approve /
   * reject a drafted lead-response artifact. The backend re-asserts consent at any
   * send (ADR-0058) and records the human approver on the run. `editedDraft` is set
   * only for an edit-and-approve. The run write itself is backend-owned (ADR-0042 —
   * the web role has no INSERT/UPDATE on `agent_run`).
   */
  reviewApproval: (input: {
    runId: string;
    decision: "approve" | "reject";
    editedDraft?: string;
    approvedByUserId: string;
  }) =>
    callService<{ runId: string; status: string }>(
      services.agent,
      "/orchestration/icm/approvals",
      { method: "POST", body: JSON.stringify(input), timeoutMs: 30_000 },
    ),

  /**
   * Decide a parked action on the approval cockpit (#1056, ADR-0109 D5): approve /
   * edit-and-approve / reject an `agent_pending_action`. On approval the backend runs
   * the existing approval-gated executor (`/agent/actions/execute`) with the parked
   * payload — consent re-checked (ADR-0058) — and records the human approver as the
   * audited actor; on rejection it just closes the row. The queue write is
   * backend-owned (ADR-0042 — the web role has no UPDATE on `agent_pending_action`).
   * `editedBody` is set only for an edit-and-approve.
   */
  decidePendingAction: (input: {
    pendingActionId: string;
    decision: "approve" | "reject";
    approvedByUserId: string;
    editedBody?: string;
  }) =>
    callService<{ pendingActionId: string; status: string; interactionId?: string }>(
      services.agent,
      "/orchestration/cockpit/decide",
      { method: "POST", body: JSON.stringify(input), timeoutMs: 30_000 },
    ),

  /**
   * Replay a dead-lettered wake event (#1000, 1D): re-inject an `agent_event` row that
   * exhausted its dispatch attempts (status='dead') back through the SAME dispatch path. The
   * backend (`agents:operate`-gated upstream; caller-auth, ADR-0035) re-pends the row
   * (status='pending', attempts reset, errors cleared) and stamps replayed_at/replayed_by —
   * it does NOT copy or delete the row, so the original event + idempotency_key persist.
   * Idempotency holds: the re-driven event keeps producing the same eventKey
   * '<event_id>:<workflow>' per matched subscription, and the dispatcher's findRunByEventKey
   * guard (#299/#357) REUSES any run a prior dispatch already opened — a replay only opens runs
   * for (event, workflow) pairs that never succeeded. The re-pend write is backend-owned
   * (ADR-0042 — the web role has no UPDATE re-pending a dead row). `actingUserId` is the admin
   * who replayed it (the replayed_by audit).
   */
  replayDeadLetteredEvent: (input: { eventId: string; actingUserId?: string }) =>
    callService<{ eventId: string; status: string; replayed: boolean; alreadyLive?: boolean }>(
      services.agent,
      "/agent/events/replay",
      { method: "POST", body: JSON.stringify(input), timeoutMs: 30_000 },
    ),

  /**
   * Flip the per-workflow autonomy dial (#278, ADR-0087): set the rung
   * (L0–L3) + mark-gated flag for an (agent, workflow) on the ICM plane. Admin-only
   * upstream (`agents:operate`); the backend upserts `agent_autopilot_policy` and
   * audits the change. Reversible — re-flipping is another call.
   */
  setAutonomy: (input: {
    agentKey: string;
    workflowKey: string;
    rung: "L0" | "L1" | "L2" | "L3";
    markGated: boolean;
    note?: string;
    actingUserId?: string;
  }) =>
    callService<{ agentKey: string; rung: string }>(
      services.agent,
      "/orchestration/icm/autonomy",
      { method: "POST", body: JSON.stringify(input), timeoutMs: 30_000 },
    ),

  /**
   * Execute the grounding-conflict resolution WRITE-BACK (#1217, BE #365, ADR-0119): after a
   * domain owner RESOLVES a `grounding_conflict` (affirming a `resolution_tier` + free-text
   * `resolution_note`, via {@link resolveConflictAction}), push the authoritative correction to
   * the system of record — canon (an okf-sync issue, system CLAUDE.md §11) or company silver (a
   * merge-correction directive, ADR-0042). Backend-owned by construction (ADR-0042 — the FE
   * records the decision, the backend runs the cross-plane process; the web role has no write
   * path into canon docs or sibling merge planes).
   *
   * The backend re-reads the resolved row itself (the conflict id is the only input — the
   * FE-supplied claim text is NEVER trusted), dispatches by `resolution_tier`, and ledgers the
   * dispatch as a `writeback` event (migration 0203). Idempotent: a second call on an
   * already-dispatched conflict returns the existing `externalRef` (`dispatched: false`).
   * Deploy-ahead-safe: when no okf-sync issue filer is wired the canon branch records the
   * directive with a null `externalRef` (the durable artifact is the ledger row), exactly like
   * the eval-harvester auto-filer.
   */
  resolveGroundingWriteback: (input: { conflictId: string; actingUserId?: string }) =>
    callService<{
      conflictId: string;
      tier: "canon" | "company_silver" | "personal";
      target: "canon" | "silver" | "none";
      externalRef: string | null;
      dispatched: boolean;
    }>(services.agent, "/agent/grounding/resolve-writeback", {
      method: "POST",
      body: JSON.stringify(input),
      timeoutMs: 30_000,
    }),
};

/**
 * Social Media Management plane (ADR-0124, epic #1338, slice B #1340) — the outbound
 * boundary. The web role is SELECT-only on `social_post`/`social_post_channel`
 * (migration 0210 grant), so persisting a compose-once post is a backend *process*
 * (ADR-0042 §1), not a direct web write — unlike the campaign_send Builder (which the
 * web role writes directly) the social-post grant is deliberately narrower.
 *
 * `saveDraft` persists the authored composition + its selected fan-out channels as a
 * draft `social_post` (+ `social_post_channel` rows). A subsequent schedule/publish is a
 * Social Action that the backend dispatcher (BE #418) parks on the pending-action cockpit
 * (`agent_pending_action`, ADR-0058) — every outbound is human-approved in v1 (ADR-0124 #4).
 *
 * STUB STATUS: the backend save/schedule endpoint does not exist yet. The web app builds
 * everything up to this call; until the endpoint lands, `saveDraft` surfaces a
 * {@link ServiceNotConfiguredError} (the compose action degrades honestly — it does NOT
 * fake a persisted post). Backend follow-up issue is referenced in the slice-B PR.
 */
export const socialService = {
  /** Persist a compose-once draft post + its selected channels (backend POST /social/posts). */
  saveDraft: (input: {
    /** The authored composition (copy + asset refs) — stored to `social_post.content`. */
    content: { body: string };
    /** Networks to fan out to — one `social_post_channel` row each (ADR-0124 #3). */
    channels: string[];
    /** Optional marketing campaign attribution link. */
    campaignId?: string | null;
    /** Optional schedule instant (ISO); omitted = save as plain draft. */
    scheduledAt?: string | null;
    /** The composing employee (app_user.id) — the post's author + audit actor. */
    actingUserId: string;
  }) =>
    callService<{ socialPostId: string; status: string }>(services.agent, "/social/posts", {
      method: "POST",
      body: JSON.stringify(input),
      timeoutMs: 30_000,
    }),
};

/**
 * The single governed-metric result shape (backend `src/shared/metrics.ts` `MetricResult`,
 * #259/ADR-0078). `value` is null unless `status==='ok'`; `status` carries `unbound`
 * (definition not yet executable), `not_found`, or `error` as DATA, never an HTTP failure —
 * so the one read path the agent (`metric_lookup`) and BI both use returns one structured
 * shape. `dataClass` is the #1034 sensitivity axis carried on every result for gating.
 */
export interface MetricResultWire {
  key: string;
  name: string;
  /** The computed value, or null when unbound / not_found / error. */
  value: number | null;
  unit: string;
  grain: string;
  /** ISO timestamp the value is "as of". */
  asOf: string;
  /** operational | financial | people_hr | security_credentials | client_pii. */
  dataClass: string;
  status: "ok" | "unbound" | "not_found" | "error";
  message?: string;
}

/** Temporal params a governed metric may bind (the backend's fixed allow-list, YYYY-MM-DD). */
export interface MetricParamsWire {
  period?: string;
  period_start?: string;
  period_end?: string;
}

/**
 * Governed-metric query engine seam (#1115, epic #1050; backend #259/ADR-0078). Resolves ONE
 * governed metric by key through the backend's single read path
 * (`/orchestration/metrics/{key}`) — the SAME path the `metric_lookup` sub-agent tool uses —
 * so an agent and a BI dashboard compute the IDENTICAL number. The backend evaluates the
 * pre-vetted `metric_definition.expression` in a READ-ONLY transaction; this seam NEVER sends
 * SQL — only the metric key + temporal params (the backend rejects an unknown `:param` and
 * caps the statement timeout). Until AGENT_SERVICE_URL is set the call throws
 * ServiceNotConfiguredError and the BI surface degrades to "metric engine unavailable".
 */
export const metricsService = {
  /** Resolve one governed metric by key (GET) with optional temporal params. */
  lookup: (key: string, params?: MetricParamsWire) => {
    const qs = new URLSearchParams();
    if (params?.period) qs.set("period", params.period);
    if (params?.period_start) qs.set("period_start", params.period_start);
    if (params?.period_end) qs.set("period_end", params.period_end);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return callService<MetricResultWire>(
      services.metrics,
      `/orchestration/metrics/${encodeURIComponent(key)}${suffix}`,
      { timeoutMs: 30_000 },
    );
  },
};

/**
 * Time-tracking Reconciliation #1 (ADR-0082; backend ADR-0046). Computes the six typed
 * deviations over silver `time_record` for one timesheet — the full set the day-level
 * `time_reconciliation_day` view can't express (overlap, temporal orphan). Runs on the same
 * backend Function App as the orchestrator (`/orchestration/*`), so it shares the agent base
 * URL + Easy Auth audience. Pure read; caller-gated; no comp data crosses the boundary.
 */
export const timeReconciliationService = {
  reconcile: (input: { timesheetId: string; toleranceMinutes?: number }) =>
    callService<TimeReconciliationResult>(services.agent, "/orchestration/time-reconciliation", {
      method: "POST",
      body: JSON.stringify(input),
      timeoutMs: 30_000,
    }),
};

/**
 * Time-tracking Reconciliation #2 — payroll (ADR-0082 §Reconciliation #2; backend BE #105).
 * The backend computes expected pay (approved hours × effective Pay Rate — the SOLE Pay Rate
 * read in the system) and matches it against the authoritative QuickBooks Online vendor payment
 * (employee + period + amount within tolerance; v1 all-1099, gross=net). This seam asks the
 * backend for the SUGGESTED match for one timesheet; the response is comp-free (only the matched
 * payment fact, never the rate or expected amount). The CFO confirms it to set the sheet Paid.
 * Same backend Function App as the orchestrator (`/orchestration/*`), so it shares the agent base
 * URL + Easy Auth audience. Until BE #105 + the QuickBooks app registration land (Mark-gated), the
 * call is `not_configured`/`rejected` and the surface degrades to manual confirm (UAT plan).
 */
export const payrollReconciliationService = {
  suggestMatch: (input: { timesheetId: string }) =>
    callService<PayrollMatchSuggestion>(services.agent, "/orchestration/payroll-reconciliation", {
      method: "POST",
      body: JSON.stringify(input),
      timeoutMs: 30_000,
    }),
};

/** Integration sync — M365/Autotask/IT Glue/Plaud/Facebook (ADR-0012). */
export const integrationService = {
  /** Poll-on-demand read (e.g. Autotask tickets) for an account. */
  poll: (input: { system: string; accountId: string; resource: string }) =>
    callService(services.integration, "/poll", { method: "POST", body: JSON.stringify(input) }),
  /** Trigger a background ingest run for a connection. */
  ingest: (input: { connectionId: string }) =>
    callService(services.integration, "/ingest", { method: "POST", body: JSON.stringify(input) }),
};

/**
 * Autotask ticket creation with a server-side idempotency ledger (backend #19,
 * POST /api/autotask/tickets on the backend). The idempotency identity is the
 * originating app object (`origin.type` + `origin.id` → key
 * `imperioncrm-{type}-{id}`, ADR-0052 §7): retrying the SAME origin returns the
 * existing ticketRef (`created: false`) and can never file twice. Queue is a
 * name resolved through the backend's AUTOTASK_QUEUE_IDS map (or a numeric
 * Autotask queue id). Callers: Business Reviews → 'business-review' (#99),
 * Feedback → 'app-dev' (#100), Tasks → per-category queue (#98).
 */
export const ticketsService = {
  createTicket: (input: {
    queue: string | number;
    title: string;
    description?: string;
    accountId: string;
    origin: { type: string; id: string };
  }) =>
    callService<{ ticketRef: string; created: boolean }>(
      services.integration,
      "/autotask/tickets",
      { method: "POST", body: JSON.stringify(input), timeoutMs: 30_000 },
    ),
};

/** Agentic web-scrape lead intel (ADR-0012). */
export const enrichmentService = {
  briefForContact: (input: { contactId: string }) =>
    callService(services.enrichment, "/brief", { method: "POST", body: JSON.stringify(input) }),
};

/** Email/SMS sends + nurture, consent-gated (ADR-0014). */
export const commsService = {
  send: (input: { contactId: string; channel: "email" | "sms"; templateId: string }) =>
    callService(services.comms, "/send", { method: "POST", body: JSON.stringify(input) }),
};

/** Facebook campaigns: create + read analytics (ADR-0012). */
export const campaignService = {
  metrics: (input: { campaignId: string }) =>
    callService(services.campaign, "/metrics", { method: "POST", body: JSON.stringify(input) }),
};

/** Model-call usage rollup the board endpoints return (backend ADR-0032 metering). */
export interface BoardUsage {
  modelCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/**
 * POST /board/sessions outcome (backend ADR-0039). ALWAYS 200 past validation:
 * 'paused' = the monthly budget ceiling is reached and NO session was started
 * (sessionId null); 'failed' sessions are persisted with an explanatory message.
 */
export interface BoardConveneWire {
  sessionId: string | null;
  /** 'awaiting_ciso' = the deputy pause (ADR-0054 §4 / backend #64): deliberation
   * stopped after round 2 awaiting the human CISO's position; resume concludes it. */
  status: "concluded" | "failed" | "paused" | "awaiting_ciso";
  message: string;
  recommendation: string | null;
  usage: BoardUsage;
}

/** GET /board/sessions/{id} wire shape (backend ADR-0039 + 0059 fields). */
export interface BoardSessionWire {
  session: {
    id: string;
    topic: string;
    status: string;
    /** The persisted Board Packet — byte-for-byte what the personas saw (ADR-0054 §3). */
    packetMd: string | null;
    /** The human CISO's convene-time position (ADR-0054 §4 deputy model). */
    cisoPositionMd: string | null;
    openedBy: string;
    createdAt: string;
    concludedAt: string | null;
    /** When the deputy pause started (migration 0066) — the deputy-review SLA clock. */
    pausedAt?: string | null;
  };
  members: Array<{ agentId: string; name: string; personaRole: string | null }>;
  /** `agentId === null` is the orchestrator/synthesis voice (0056 transcript contract). */
  messages: Array<{
    id: string;
    agentId: string | null;
    name: string | null;
    personaRole: string | null;
    content: string;
    createdAt: string;
  }>;
  recommendation: {
    id: string;
    recommendation: string;
    rationale: unknown;
    createdAt: string;
    /** Human-CISO accountability record (0059): pending_review | ratified | overruled. */
    reviewStatus: string;
    reviewedBy: string | null;
    reviewedAt: string | null;
    reviewRationale: string | null;
  } | null;
}

/** POST /board/recommendations/{id}/review response (backend docs/agents/board.md). */
export interface BoardReviewWire {
  id: string;
  sessionId: string;
  reviewStatus: "ratified" | "overruled";
  reviewedBy: string;
  reviewedAt: string;
  reviewRationale: string;
}

/**
 * AI Board of Directors (ADR-0015/0049, backend ADR-0039). Convene runs the FULL
 * two-round deliberation + synthesis synchronously (≤11 premium model calls), so
 * it can take 30–90s — the timeout matches the orchestrator's 120s allowance.
 */
export const boardService = {
  /** Convene + run one deliberation for the acting employee (`app_user.id`). */
  convene: (input: {
    topic: string;
    actingUserId: string;
    personaAgentIds?: string[];
    /** Invited advisors — counsel, not votes (ADR-0054; backend trims to the 7-seat cap). */
    advisorAgentIds?: string[];
    context?: string;
    /** The human CISO's stated position (ADR-0054 §4 deputy model) → ciso_position_md. */
    cisoPosition?: string;
  }) =>
    callService<BoardConveneWire>(services.board, "/board/sessions", {
      method: "POST",
      body: JSON.stringify(input),
      timeoutMs: 120_000, // a full deliberation is many sequential model calls
    }),

  /** One session with members + transcript + recommendation. */
  getSession: (id: string) =>
    callService<BoardSessionWire>(services.board, `/board/sessions/${encodeURIComponent(id)}`),

  /**
   * Resume a deputy-paused (awaiting_ciso) session with the human CISO's position
   * (ADR-0054 §4 / backend #64): persists ciso_position_md, audits board.resume,
   * reconstructs final stances from the transcript, and runs synthesis → conclude.
   * Returns the convene result shape: 'concluded', 'awaiting_ciso' again when the
   * synthesis call failed (the session stays resumable), or 'paused' on budget.
   */
  resume: (sessionId: string, input: { actingUserId: string; cisoPosition: string }) =>
    callService<BoardConveneWire>(
      services.board,
      `/board/sessions/${encodeURIComponent(sessionId)}/resume`,
      {
        method: "POST",
        body: JSON.stringify(input),
        timeoutMs: 120_000, // synthesis is a premium model call
      },
    ),

  /**
   * The human CISO's verdict on a recommendation (ADR-0054 §4). Rationale is
   * REQUIRED for both verdicts; the verdict is amendable — every call appends a
   * board.review audit row, the columns hold the latest.
   */
  reviewRecommendation: (
    recommendationId: string,
    input: { actingUserId: string; reviewStatus: "ratified" | "overruled"; rationale: string },
  ) =>
    callService<BoardReviewWire>(
      services.board,
      `/board/recommendations/${encodeURIComponent(recommendationId)}/review`,
      { method: "POST", body: JSON.stringify(input) },
    ),

  /**
   * Convene picker: active personas + the advisor bench. Advisors are
   * seat_kind='advisor' selected IGNORING is_active — invitation IS the
   * activation (migration 0059's deliberate deviation; backend docs/agents/board.md).
   */
  listAgents: () =>
    callService<{
      agents: Array<{ id: string; name: string; personaRole: string | null }>;
      advisors: Array<{ id: string; name: string; personaRole: string | null }>;
    }>(services.board, "/board/agents"),
};

/**
 * Cloud data pipeline (pipeline ADR-0011) — the live-data plane. Scheduled bulk
 * ingestion runs on-prem; this client triggers a TARGETED on-demand sync of one source
 * ("Refresh now" on the Settings cards). The endpoint bypasses the operator's poll
 * cadence (an explicit click IS the cadence) and lands on the same idempotent ingestion
 * path, so a refresh can never duplicate a scheduled load.
 */
export const pipelineService = {
  // accountId is required by the pipeline when source is "posture" or
  // "posture_snapshot" (the account-scoped sources — pipeline ADR-0015/#38) and
  // ignored for every other source. trigger/businessReviewId are ONLY valid for
  // "posture_snapshot" (ADR-0051 §5): trigger defaults to 'on_demand';
  // 'business_review' requires businessReviewId — the pipeline enforces the
  // pairing rule, mirroring the on-prem cmdlet.
  refresh: (input: {
    source: RefreshSource;
    accountId?: string;
    trigger?: "on_demand" | "business_review";
    businessReviewId?: string;
  }) =>
    callService<{ source: string; ran: boolean; reason?: string; counts?: Record<string, number> }>(
      services.pipeline,
      "/refresh",
      { method: "POST", body: JSON.stringify(input), timeoutMs: 120_000 },
    ),
};

/**
 * Per-user OAuth connection flows (ADR-0024, backend ADR-0038). The backend owns the
 * whole authorization-code dance: `start` parks a one-time CSRF state in Key Vault and
 * returns the provider's authorization URL; the provider redirects the browser to OUR
 * `/api/connections/{provider}/callback` route, which forwards code+state here
 * server-side (managed-identity auth — the browser never talks to the backend);
 * `disconnect` deletes the Key Vault token secret and marks the row `revoked`.
 * Providers: m365 | google | youtube | linkedin | facebook (plaud is key-based — the
 * backend answers 501 by design). An unconfigured provider also returns 501 and the
 * UI degrades to today's stub behavior.
 */
export const connectionsService = {
  /** Begin the flow for the acting employee (`app_user.id`). */
  startOAuth: (provider: string, input: { userId: string; displayName?: string }) =>
    callService<{ authorizationUrl: string; state: string }>(
      services.integration,
      `/connections/${encodeURIComponent(provider)}/start`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  /** Forward the provider's redirect (code+state) for the one-time exchange. */
  completeOAuthCallback: (provider: string, input: { code: string; state: string }) =>
    callService<{ connectionId: string; provider: string; status: string }>(
      services.integration,
      `/connections/${encodeURIComponent(provider)}/callback`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  /** Revoke token custody (deletes the Key Vault secret; row → 'revoked'). */
  disconnectOAuth: (provider: string, input: { userId: string }) =>
    callService<{ disconnected: boolean; connectionId: string | null; status: string }>(
      services.integration,
      `/connections/${encodeURIComponent(provider)}/disconnect`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  /**
   * Begin the company-wide QuickBooks Online connect flow (#117). Company-scoped — no
   * userId; the backend parks a one-time CSRF state in Key Vault and returns the Intuit
   * consent URL (with that state embedded).
   */
  startQboConnect: () =>
    callService<{ authorizationUrl: string; state: string }>(
      services.integration,
      "/connections/qbo/start",
      { method: "POST", body: JSON.stringify({}) },
    ),
  /** Forward Intuit's redirect (code + realmId + state) for the one-time exchange. */
  completeQboConnect: (input: { code: string; realmId: string; state: string }) =>
    callService<{ configured: boolean; environment: string; status: string }>(
      services.integration,
      "/connections/qbo/callback",
      { method: "POST", body: JSON.stringify(input) },
    ),
  /**
   * Begin the company-wide Threads connect flow (#1500, backend BE #445 / ADR-0125 D1).
   * Company-scoped — no userId; the backend parks a one-time CSRF state in Key Vault and
   * returns the Instagram-anchored Threads consent URL (with that state embedded). Mirrors
   * the QBO company-consent flow (ADR-0048/0102). 501 when the Threads app isn't configured.
   */
  startThreadsConnect: () =>
    callService<{ authorizationUrl: string; state: string }>(
      services.integration,
      "/connections/threads/start",
      { method: "POST", body: JSON.stringify({}) },
    ),
  /**
   * Forward the Threads redirect (code + state) for the one-time exchange. The backend
   * validates the Key Vault state, exchanges the code for a short-lived token, upgrades it
   * to the long-lived (60-day) Threads user token, and writes `conn-company-threads`. The
   * client_secret-bearing exchange runs server-side only — the browser never holds the
   * token (CLAUDE.md §1, ADR-0043). 400 bad/expired state, 501 not configured, 502 exchange failed.
   */
  completeThreadsConnect: (input: { code: string; state: string }) =>
    callService<{ configured: boolean; status: string; threadsUserId?: string }>(
      services.integration,
      "/connections/threads/callback",
      { method: "POST", body: JSON.stringify(input) },
    ),
  /**
   * Begin the one-time DocuSign admin-consent flow (#862, backend #192). Company-scoped;
   * the backend builds the consent URL for the configured environment's OAuth host
   * (`account-d` demo / `account` prod). JWT-grant impersonation refuses every mint until
   * an admin grants this consent once per environment.
   */
  startDocusignConsent: () =>
    callService<{ consentUrl: string; environment: string }>(
      services.integration,
      "/connections/docusign/consent",
      { method: "POST", body: JSON.stringify({}) },
    ),
  /**
   * Probe DocuSign readiness (#867; backend #143, GET /connections/docusign/status).
   * The backend mints a JWT-impersonation token as the consent check and returns
   * `consentGranted` (200), `consentGranted:false + consentUrl` when the one-time
   * admin grant is pending (200), 501 when the secrets aren't configured, or 502
   * when minting fails. No secret/token/key is ever returned (backend ADR-0056).
   */
  docusignStatus: () =>
    callService<{
      configured: boolean;
      environment?: string;
      accountId?: string;
      consentGranted?: boolean;
      consentUrl?: string;
      detail?: string;
    }>(services.integration, "/connections/docusign/status"),
  /**
   * Register (or rotate) a managed client tenant's per-tenant M365 app credential
   * (#950, backend #217 / PR #224, cutover #226). Per-client-app model (ADR-0103 /
   * ADR-0076): every managed client tenant has its OWN Entra app registration — a
   * distinct app (client) id + its own credential. The admin enters the tenant's app
   * id + a credential (a client secret OR a certificate thumbprint); the backend
   * custodies a `secret` in Key Vault under the canonical provider-3rd name
   * `conn-client-m365-<tenantId>` (ADR-0103/0122, BE #384) and writes the
   * `client`-scope m365 `connection` row. The secret VALUE is sent once over the
   * server-to-backend boundary and never returned, logged, or stored in this DB
   * (CLAUDE.md §5). The browser never calls this — the web app proxies server-side
   * (ADR-0028/0035). 501 when the backend isn't configured → the UI degrades.
   */
  registerClientM365: (input: {
    accountId: string;
    tenantId: string;
    clientAppId: string;
    authMethod: "secret" | "certificate";
    clientSecret?: string;
    certThumbprint?: string;
    displayName?: string;
  }) =>
    callService<{ connectionId: string }>(
      services.integration,
      "/connections/client/m365",
      { method: "POST", body: JSON.stringify(input) },
    ),
};

/**
 * Client Mapping write path (ADR-0112, epic #1141 unit E → backend unit D). The web role is
 * SELECT-only on `entity_xref` (migration 0160), so curating a manual identity link
 * (connector unit → account) is proxied through the backend. For per-client-credential
 * connectors (m365/unifi) the caller passes `connectionId` so the backend also keeps
 * `connection.account_id` consistent in the same transaction. 501 when the backend isn't
 * configured → the UI degrades. The browser never calls this — the web app proxies server-side
 * (ADR-0028/0035).
 */
export const clientMappingService = {
  /** Upsert a manual link → backend `POST /connections/client-mapping`. */
  link: (input: {
    entityType?: "account" | "contact" | "device" | "asset" | "opportunity";
    sourceSystem: string;
    sourceKey: string;
    internalEntityId: string;
    connectionId?: string;
    actingUserId?: string;
  }) =>
    callService<{ id: string; linkedConnectionId?: string }>(
      services.integration,
      "/connections/client-mapping",
      { method: "POST", body: JSON.stringify(input) },
    ),

  /** Remove a manual link → backend `DELETE /connections/client-mapping`. */
  unlink: (input: {
    entityType?: "account" | "contact" | "device" | "asset" | "opportunity";
    sourceSystem: string;
    sourceKey: string;
    actingUserId?: string;
  }) =>
    callService<{ deleted: boolean }>(
      services.integration,
      "/connections/client-mapping",
      { method: "DELETE", body: JSON.stringify(input) },
    ),
};

/**
 * Company credential / secret store (ADR-0036). The backend is the only thing that
 * writes secrets to Key Vault (CLAUDE.md §5 / ADR-0028 isolation); this repo just
 * hands it the entered fields and gets back a Key Vault reference — the secret never
 * lands in this DB or this App Service. Until the backend endpoint + INTEGRATION_SERVICE_URL
 * are set these throw ServiceNotConfiguredError and callers degrade gracefully.
 */
export const credentialsService = {
  /**
   * Write a company credential to Key Vault; returns the reference to persist.
   *
   * For providers whose ONE token OWNS external assets (Meta — the Business Suite token
   * owns the FB Page + linked Instagram account, ADR-0124 #7 / #1568, backend #457), the
   * backend RESOLVES those public ids from the token via Graph and returns them. The FE
   * persists `externalAccountId` (the resolved FB Page id) on the row so the owned asset is
   * discovered once and never re-prompted. Absent for providers that resolve nothing — all
   * fields beyond `keyvaultSecretRef` are optional so the contract stays additive.
   */
  store: (input: { provider: string; fields: Record<string, string> }) =>
    callService<{
      keyvaultSecretRef: string;
      /** Public external identifier the backend resolved from the credential (Meta = FB Page id). */
      externalAccountId?: string | null;
      /** Provider-specific resolved owned-asset ids (public, never secret), e.g. Meta page/IG ids. */
      resolved?: { pageId?: string; pageName?: string; instagramUserId?: string } | null;
    }>(services.credentials, "/credentials", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  /**
   * Write a PLATFORM-scope AI provider key to Key Vault (ADR-0129, #1400). The value is a RAW
   * SCALAR (the API key), custodied as `conn-platform-<provider>`. The backend VALIDATES the key
   * with one cheap live provider call (a tiny Voyage embed / 1-token Claude ping) and writes ONLY
   * on success — a key that fails its probe is never persisted (validate-before-write). Returns the
   * reference + a validation flag; the key never touches this DB (CLAUDE.md §5). Until the backend
   * endpoint is wired this throws ServiceNotConfiguredError and the action degrades gracefully.
   */
  storePlatform: (input: { provider: string; apiKey: string }) =>
    callService<{ keyvaultSecretRef: string; validated?: boolean }>(
      services.credentials,
      "/credentials/platform",
      { method: "POST", body: JSON.stringify(input) },
    ),

  /**
   * Purge a registered credential (#390): delete the `connection` row AND its backing Key
   * Vault secret. Idempotent (already-gone → `deleted: false`). Keyed on the row id so a
   * same-account duplicate is removed individually. Backs the FE remove-credential action.
   */
  purgeCredential: (input: { connectionId: string }) =>
    callService<{ deleted: boolean; connectionId: string; keyvaultSecretRef: string | null }>(
      services.credentials,
      "/credentials/purge",
      { method: "POST", body: JSON.stringify(input) },
    ),
};

/**
 * One business-classified MileIQ drive (External API wire contract — see
 * docs/integrations/mileiq-api.md). Maps to the `mileiq_drive` bronze (migration 0089):
 * `driveId` is MileIQ's idempotent key; MileIQ is authoritative for the MILES fact only —
 * the reimbursement dollar is DERIVED backend-side from the comp-gated mileage rate
 * (ADR-0083), never carried here. Personal drives are never returned.
 */
export interface MileIqDriveWire {
  driveId: string;
  driveDate: string; // yyyy-mm-dd
  miles: number;
  origin: string | null;
  destination: string | null;
  purpose: string | null;
}

/**
 * MileIQ External API client SCAFFOLDING (#854, ADR-0099). The contract the future v2
 * build codes against — per-user OAuth 2.1 authorization-code connect (token custodied in
 * Key Vault by backend #109) + a business-drive pull that the on-prem pipeline lands in
 * `mileiq_drive` bronze (LocalPipeline #167). The front end holds NO MileIQ key (ADR-0043):
 * every method calls the backend via `callService`, so until backend #109 ships and
 * `INTEGRATION_SERVICE_URL` is set these throw `ServiceNotConfiguredError` and callers
 * degrade gracefully — exactly the `connectionsService` pattern. **v1 ships manual mileage
 * entry instead (#853); wiring these to a live MileIQ tenant is v2 (gate #495).** No live
 * network call happens in v1.
 */
export const mileiqService = {
  /** Begin the per-user MileIQ connect for the acting employee (`app_user.id`). Returns the
   *  MileIQ authorization URL + CSRF `state`; the backend parks the state + custodies the
   *  token in Key Vault on callback (#109). */
  startConnect: (input: { userId: string }) =>
    callService<{ authorizationUrl: string; state: string }>(
      services.mileiq,
      "/mileiq/connect/start",
      { method: "POST", body: JSON.stringify(input) },
    ),
  /** Forward MileIQ's redirect (code + state) for the one-time token exchange; the backend
   *  resolves and records the employee's `mileiq_user_id` (employee_profile, migration 0088). */
  completeConnect: (input: { code: string; state: string }) =>
    callService<{ connected: boolean; mileiqUserId: string | null }>(
      services.mileiq,
      "/mileiq/connect/callback",
      { method: "POST", body: JSON.stringify(input) },
    ),
  /** Pull the acting employee's business-classified drives since a date (yyyy-mm-dd). The
   *  pull/ingest into `mileiq_drive` bronze is the on-prem pipeline's job (LocalPipeline
   *  #167); this seam is the on-demand variant. */
  listBusinessDrives: (input: { userId: string; since: string }) =>
    callService<{ drives: MileIqDriveWire[] }>(services.mileiq, "/mileiq/drives", {
      method: "POST",
      body: JSON.stringify(input),
      timeoutMs: 30_000,
    }),
};

/** The custody fields the receipt-upload endpoint returns once the bytes are stored
 *  (BE #200): the private blob path/key, the integrity digest, and the size/type the
 *  backend recorded. The FE persists these into `receipt_attachment` — it never holds
 *  the bytes after the upload returns (ADR-0042 boundary: backend owns bytes, FE the row). */
export interface ReceiptUploadResult {
  blobPath: string;
  contentHash: string | null;
  byteSize: number | null;
  contentType: string | null;
}

/**
 * Receipt upload custody (#899, ADR-0083 §Receipts; backend BE #200). The front end holds
 * NO storage credentials (ADR-0043/0028): it streams the file BYTES to the caller-gated
 * backend endpoint, which AV-scans, sha256s, and writes them to a PRIVATE `receipts` blob,
 * then returns the custody reference the FE links onto the expense item. Headers carry the
 * file's own `content-type`, the original `x-filename`, and `x-actor-user-id` (the session
 * employee — the backend self-scopes custody to that user). Until INTEGRATION_SERVICE_URL is
 * set the call is `not_configured` and the upload surface degrades with a notice.
 */
export const receiptsService = {
  upload: (input: {
    /** The raw file bytes (the request body). */
    bytes: ArrayBuffer | Uint8Array;
    /** The file's own MIME type, sent as `content-type` (the endpoint validates PDF/images). */
    contentType: string;
    /** The original filename, sent as `x-filename` for the audit + Autotask push. */
    filename: string;
    /** The acting employee (`app_user.id`), sent as `x-actor-user-id` — backend self-scopes. */
    actorUserId: string;
  }) =>
    callServiceRaw<ReceiptUploadResult>(
      services.receipts,
      "/expense/receipts/upload",
      input.bytes,
      {
        headers: {
          "content-type": input.contentType,
          "x-filename": input.filename,
          "x-actor-user-id": input.actorUserId,
        },
        timeoutMs: 60_000, // a multi-MB upload + AV scan may take longer than a JSON call
      },
    ),
};

/** The custody fields the opportunity-knowledge upload endpoint returns once the bytes
 *  are stored (#429): the private blob path/key, the integrity digest, and the
 *  size/type the backend recorded. The FE persists these into
 *  `website_opportunities.knowledge_blob_refs` — it never holds the bytes after the
 *  upload returns (ADR-0042 boundary: backend owns bytes, FE the row). Same shape as
 *  the receipt-upload result (one generic blob-custody contract). */
export type KnowledgeUploadResult = ReceiptUploadResult;

/**
 * Opportunity knowledge upload custody (#429, epic #425; ADR-0069 attachments → Azure
 * Blob). The front end holds NO storage credentials (ADR-0043/0028): it streams the
 * file BYTES to the caller-gated backend endpoint, which AV-scans, sha256s, and writes
 * them to a PRIVATE blob, then returns the custody reference the FE links onto the
 * website opportunity bronze. Headers carry the file's own `content-type`, the original
 * `x-filename`, and `x-actor-user-id` (the session employee). Until
 * INTEGRATION_SERVICE_URL is set the call is `not_configured` and the upload surface
 * degrades with a notice.
 */
export const knowledgeService = {
  upload: (input: {
    /** The raw file bytes (the request body). */
    bytes: ArrayBuffer | Uint8Array;
    /** The file's own MIME type, sent as `content-type` (the endpoint validates the allowlist). */
    contentType: string;
    /** The original filename, sent as `x-filename` for the audit + gold/vectorization push. */
    filename: string;
    /** The acting employee (`app_user.id`), sent as `x-actor-user-id`. */
    actorUserId: string;
  }) =>
    callServiceRaw<KnowledgeUploadResult>(
      services.knowledge,
      "/opportunity/knowledge/upload",
      input.bytes,
      {
        headers: {
          "content-type": input.contentType,
          "x-filename": input.filename,
          "x-actor-user-id": input.actorUserId,
        },
        timeoutMs: 60_000, // a multi-MB upload + AV scan may take longer than a JSON call
      },
    ),
};
