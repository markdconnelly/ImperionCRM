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
import { callService, type ServiceDescriptor } from "@/lib/services/external-client";
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
  // MileIQ External API custody (#854/ADR-0099): the OAuth token lives in Key Vault on
  // the backend (#109), same host as the other per-user connections, so it shares the
  // integration base URL + Easy Auth audience. No-op (ServiceNotConfiguredError) until
  // backend #109 + creds #495 land — full MileIQ integration is v2; v1 is manual entry.
  mileiq: {
    name: "MileIQ mileage",
    baseUrlEnv: "INTEGRATION_SERVICE_URL",
    audienceEnv: "INTEGRATION_SERVICE_AUDIENCE",
  },
} satisfies Record<string, ServiceDescriptor>;

/** The orchestrator's reply shape (backend ADR-0032/0036 wire contract). */
export interface AgentReply {
  text: string;
  routedTo: string;
  routingReason: string;
  requiresApproval?: boolean;
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
};

/**
 * Company credential / secret store (ADR-0036). The backend is the only thing that
 * writes secrets to Key Vault (CLAUDE.md §5 / ADR-0028 isolation); this repo just
 * hands it the entered fields and gets back a Key Vault reference — the secret never
 * lands in this DB or this App Service. Until the backend endpoint + INTEGRATION_SERVICE_URL
 * are set these throw ServiceNotConfiguredError and callers degrade gracefully.
 */
export const credentialsService = {
  /** Write a company credential to Key Vault; returns the reference to persist. */
  store: (input: { provider: string; fields: Record<string, string> }) =>
    callService<{ keyvaultSecretRef: string }>(services.credentials, "/credentials", {
      method: "POST",
      body: JSON.stringify(input),
    }),
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
