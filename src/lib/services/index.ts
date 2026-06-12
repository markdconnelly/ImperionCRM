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
  status: "concluded" | "failed" | "paused";
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
  // accountId is required by the pipeline when source is "posture" (the only
  // account-scoped source — pipeline ADR-0015) and ignored for every other source.
  refresh: (input: { source: RefreshSource; accountId?: string }) =>
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
  /**
   * Begin the Microsoft GDAP admin-consent flow. Returns the consent URL to visit and the
   * CSRF `state` nonce embedded in it (stored in a cookie and matched on the callback).
   */
  beginGdapConsent: () =>
    callService<{ consentUrl: string; state: string }>(services.credentials, "/gdap/consent", {
      method: "POST",
      body: JSON.stringify({}),
    }),
};
