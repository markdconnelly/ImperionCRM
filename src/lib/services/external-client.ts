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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 30_000);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new ServiceCallError(service.name, res.status, await res.text());
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
