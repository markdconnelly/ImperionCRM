/**
 * Typed client for calling external functions/APIs (ADR-0018).
 *
 * Heavy/long-running/integration logic is NOT implemented in this repo — it is
 * hosted on a separate object (Azure Functions, container apps, …). This module is
 * the single place the GUI reaches those services: it centralizes base URLs, auth,
 * timeouts, and the "not configured yet" behavior so the UI degrades gracefully.
 *
 * Server-only — never import into a client component.
 */
import "server-only";
import { ManagedIdentityCredential } from "@azure/identity";

/** Thrown when a service's base URL env var is not set (endpoint not built yet). */
export class ServiceNotConfiguredError extends Error {
  constructor(serviceName: string, envVar: string) {
    super(
      `External service "${serviceName}" is not configured: set ${envVar} to its ` +
        `base URL. Until then this function is hosted externally and unavailable.`,
    );
    this.name = "ServiceNotConfiguredError";
  }
}

/** Thrown when an external service responds with a non-2xx status. */
export class ServiceCallError extends Error {
  constructor(
    serviceName: string,
    public status: number,
    body: string,
  ) {
    super(`External service "${serviceName}" returned ${status}: ${body.slice(0, 300)}`);
    this.name = "ServiceCallError";
  }
}

export interface ServiceDescriptor {
  /** Human name, for errors/logs. */
  name: string;
  /** Env var holding the service's base URL (e.g. AGENT_SERVICE_URL). */
  baseUrlEnv: string;
  /**
   * Optional env var holding the OAuth audience for this service (ADR-0028). When set
   * and populated, `callService` acquires a managed-identity token for
   * `<audience>/.default` and attaches it as `Authorization: Bearer <token>` so the
   * backend's caller-auth (Easy Auth) accepts the request. Omit for services that are
   * unauthenticated or not yet behind Easy Auth.
   */
  audienceEnv?: string;
}

/**
 * Acquire a managed-identity bearer token for a backend audience (ADR-0028).
 *
 * The web App Service authenticates with its user-assigned managed identity
 * (AZURE_MANAGED_IDENTITY_CLIENT_ID — the same identity used for Postgres, see
 * `src/lib/db/client.ts`). The token's `appid`/`azp` is that MI's client id, which the
 * backend matches against ALLOWED_CALLER_CLIENT_ID. `ManagedIdentityCredential` caches
 * tokens internally; we add a thin per-scope cache so we don't await it on every call
 * and refresh a minute before expiry.
 */
const credential = new ManagedIdentityCredential(
  process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID?.trim()
    ? { clientId: process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID.trim() }
    : {},
);
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getBearerToken(audience: string): Promise<string> {
  const scope = audience.endsWith("/.default") ? audience : `${audience}/.default`;
  const cached = tokenCache.get(scope);
  // Refresh 60s before the real expiry to avoid races at the boundary.
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;

  const result = await credential.getToken(scope);
  if (!result) throw new Error(`Failed to acquire managed-identity token for ${scope}.`);
  tokenCache.set(scope, { token: result.token, expiresAt: result.expiresOnTimestamp });
  return result.token;
}

/**
 * Call a JSON endpoint on an external service. Returns the parsed body, or throws
 * ServiceNotConfiguredError / ServiceCallError. Callers should catch and degrade.
 */
export async function callService<T = unknown>(
  service: ServiceDescriptor,
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const baseUrl = process.env[service.baseUrlEnv]?.trim();
  if (!baseUrl) throw new ServiceNotConfiguredError(service.name, service.baseUrlEnv);

  // Attach a managed-identity bearer token when the service sits behind Easy Auth
  // (ADR-0028). If audienceEnv is unset/empty the call goes out unauthenticated, which
  // is the current behavior for services not yet gated.
  const authHeaders: Record<string, string> = {};
  const audience = service.audienceEnv ? process.env[service.audienceEnv]?.trim() : undefined;
  if (audience) authHeaders.Authorization = `Bearer ${await getBearerToken(audience)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 30_000);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "content-type": "application/json", ...authHeaders, ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new ServiceCallError(service.name, res.status, await res.text());
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * POST a RAW (non-JSON) body to a backend endpoint and parse the JSON response — the
 * binary-upload sibling of `callService` (#899, ADR-0083 §Receipts). `callService`
 * always sends `content-type: application/json`; receipt upload streams the file BYTES
 * with its own `content-type` + custody headers (`x-filename`, `x-actor-user-id`), so it
 * needs a path that does NOT force the JSON content type. Reuses the SAME managed-identity
 * auth (ADR-0028), timeout, and error taxonomy (ServiceNotConfiguredError /
 * ServiceCallError) so the call-guard seam classifies failures identically. The bytes are
 * the request body; nothing about them is logged here. Callers catch and degrade.
 */
export async function callServiceRaw<T = unknown>(
  service: ServiceDescriptor,
  path: string,
  body: BodyInit,
  init?: { headers?: Record<string, string>; timeoutMs?: number },
): Promise<T> {
  const baseUrl = process.env[service.baseUrlEnv]?.trim();
  if (!baseUrl) throw new ServiceNotConfiguredError(service.name, service.baseUrlEnv);

  const authHeaders: Record<string, string> = {};
  const audience = service.audienceEnv ? process.env[service.audienceEnv]?.trim() : undefined;
  if (audience) authHeaders.Authorization = `Bearer ${await getBearerToken(audience)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 30_000);
  try {
    // No default content-type here: the caller sets it (the file's own MIME) alongside the
    // custody headers, so a JSON default would mislabel the bytes.
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      body,
      signal: controller.signal,
      headers: { ...authHeaders, ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new ServiceCallError(service.name, res.status, await res.text());
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
