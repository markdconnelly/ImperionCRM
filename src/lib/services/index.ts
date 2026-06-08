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

const services = {
  agent: { name: "Agent orchestrator", baseUrlEnv: "AGENT_SERVICE_URL" },
  integration: { name: "Integration sync", baseUrlEnv: "INTEGRATION_SERVICE_URL" },
  enrichment: { name: "Lead enrichment", baseUrlEnv: "ENRICHMENT_SERVICE_URL" },
  comms: { name: "Communications", baseUrlEnv: "COMMS_SERVICE_URL" },
  campaign: { name: "Ad campaigns", baseUrlEnv: "CAMPAIGN_SERVICE_URL" },
  board: { name: "AI Board of Directors", baseUrlEnv: "BOARD_SERVICE_URL" },
  credentials: { name: "Credential store", baseUrlEnv: "INTEGRATION_SERVICE_URL" },
} satisfies Record<string, ServiceDescriptor>;

/** Orchestrator + sub-agents (ADR-0015). Hosted externally (container app). */
export const agentService = {
  /** Send a message to the orchestrator scoped to the acting user. */
  ask: (input: { userId: string; message: string }) =>
    callService(services.agent, "/ask", { method: "POST", body: JSON.stringify(input) }),
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
 * Company credential / secret store (ADR-0030). The backend is the only thing that
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
  /** Begin the Microsoft GDAP admin-consent flow; returns the consent URL to visit. */
  beginGdapConsent: () =>
    callService<{ consentUrl: string }>(services.credentials, "/gdap/consent", {
      method: "POST",
      body: JSON.stringify({}),
    }),
};
