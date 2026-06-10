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
  board: { name: "AI Board of Directors", baseUrlEnv: "BOARD_SERVICE_URL" },
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

/** AI Board of Directors sessions (ADR-0015). */
export const boardService = {
  openSession: (input: { topic: string; memberIds: string[] }) =>
    callService(services.board, "/session", { method: "POST", body: JSON.stringify(input) }),
};

/**
 * Cloud data pipeline (pipeline ADR-0011) — the live-data plane. Scheduled bulk
 * ingestion runs on-prem; this client triggers a TARGETED on-demand sync of one source
 * ("Refresh now" on the Settings cards). The endpoint bypasses the operator's poll
 * cadence (an explicit click IS the cadence) and lands on the same idempotent ingestion
 * path, so a refresh can never duplicate a scheduled load.
 */
export const pipelineService = {
  refresh: (input: { source: "autotask" | "itglue" | "apollo" | "darkwebid" | "televy" | "m365" }) =>
    callService<{ source: string; ran: boolean; reason?: string; counts?: Record<string, number> }>(
      services.pipeline,
      "/refresh",
      { method: "POST", body: JSON.stringify(input), timeoutMs: 120_000 },
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
