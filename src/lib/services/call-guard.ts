/**
 * The GUI-side call-guard seam for backend service calls (#190, ADR-0018/0042).
 *
 * Seven callers grew four error dialects around `callService`. This module is the
 * ONE place that classifies a failed backend call and composes the user-facing
 * fallback, so every server action degrades the same way and the seam — not each
 * catch block — is the test surface.
 *
 * Taxonomy:
 *  - `not_configured` — the endpoint isn't built/wired in this environment:
 *    the base-URL env var is unset (ServiceNotConfiguredError) OR the backend
 *    answered a clean 501 (its own "not configured" signal, backend ADR-0038).
 *    These are the SAME condition to a user, resolved here once.
 *  - `rejected` — the backend answered with any other non-2xx (the call arrived;
 *    the service refused it).
 *  - `unreachable` — no usable answer: network failure, timeout/abort, bad JSON.
 *
 * Pure logic — no auth/db imports — so callers' tests stay light. The shared
 * acting-user resolver lives in `./acting-user` (it needs the session + pool).
 */
import { ServiceCallError, ServiceNotConfiguredError } from "@/lib/services/external-client";

export type ServiceFailureKind = "not_configured" | "rejected" | "unreachable";

/** Classify a thrown backend-call error into the taxonomy above. */
export function classifyServiceError(err: unknown): ServiceFailureKind {
  if (err instanceof ServiceNotConfiguredError) return "not_configured";
  if (err instanceof ServiceCallError) {
    return err.status === 501 ? "not_configured" : "rejected";
  }
  return "unreachable";
}

/** True when the backend (or its env wiring) says this endpoint isn't built yet. */
export function isBackendNotConfigured(err: unknown): boolean {
  return classifyServiceError(err) === "not_configured";
}

/** What a guarded call resolves to — callers branch on `ok`, never on error class. */
export type ServiceOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; kind: ServiceFailureKind; message: string };

export interface ServiceGuardMessages {
  /** Log label for real failures, e.g. "saveAgentSettingsAction". */
  label: string;
  /** Shown when the backend endpoint isn't configured/built in this environment. */
  notConfigured: string;
  /** Shown for everything else (the underlying error is console.error'd). */
  failed: string;
}

/**
 * Run a backend service call and fold any failure into a `ServiceOutcome` with a
 * ready-to-render message. `not_configured` is an expected deployment state
 * (ADR-0018 graceful degradation) and is NOT logged; `rejected`/`unreachable`
 * are logged under `messages.label`. Never throws.
 */
export async function callServiceWithFallback<T>(
  fn: () => Promise<T>,
  messages: ServiceGuardMessages,
): Promise<ServiceOutcome<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    const kind = classifyServiceError(err);
    if (kind !== "not_configured") console.error(`${messages.label} failed:`, err);
    return {
      ok: false,
      kind,
      message: kind === "not_configured" ? messages.notConfigured : messages.failed,
    };
  }
}
