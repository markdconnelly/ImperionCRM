/**
 * The action-contract catalog (ADR-0107 D2, epic #990 slice 2C / issue #994).
 *
 * Generalizes outbound actions from the hardcoded two-value `ProposedActionKind`
 * (`send_email | send_sms`) into a **registered catalog**. Each action declares its
 * `kind`, a human `label`, an **input schema** (dependency-free validator), an ADR-0055
 * **tier**, an ADR-0032/0014 **consent class**, and the backend **executor binding** it
 * dispatches to. The web app resolves + validates a proposed action against this catalog
 * BEFORE forwarding it to the backend's approval-gated executor (the ONLY send path —
 * backend ADR-0033); the backend re-asserts consent at execution (the ADR-0058 property,
 * unchanged). Adding a governed action is a catalog entry here — no endpoint/dispatch edit.
 *
 * Ownership (§1, ADR-0042): the schema/catalog SHAPE is front-end-owned; the executor
 * RUNTIME is backend-owned. This module is the front-end half — the typed contract the
 * GUI validates and labels against. The backend keeps its own enforcement copy (repos
 * don't share code); keep the two in lockstep, exactly like {@link ./action-autonomy}.
 *
 * PURE: no `pg`, no `node:*`, no env, no zod (the repo carries no zod dependency — the
 * validator below is a tiny structural checker). Safe to import anywhere (edge / server /
 * client) and unit-test directly. Fail-closed: an unknown `kind` resolves to no def and a
 * caller MUST treat that as "refuse", never "pass through".
 */

import type { AutonomyTier } from "@/lib/agent/action-autonomy";

/**
 * Consent class for an action (ADR-0014 / ADR-0058). `none` = no contact-consent gate
 * (internal/operational); `contact_channel` = a 1:1 outbound message whose `current_consent`
 * the backend re-asserts at execution. The class is metadata for the operator surface +
 * the catalog's self-description; the AUTHORITATIVE consent check is always the backend's.
 */
export type ConsentClass = "none" | "contact_channel";

/** One field's expected primitive in an action input schema. */
type FieldType = "string" | "boolean" | "number";

/** A single declared input field: its type, whether it's required, and an optional enum. */
export interface FieldSpec {
  type: FieldType;
  /** Required fields must be present and non-empty (for strings). Defaults to true. */
  required?: boolean;
  /** When set, the value must be one of these (string fields only). */
  enum?: readonly string[];
}

/** A flat, dependency-free input schema: field name → spec. */
export type ActionInputSchema = Record<string, FieldSpec>;

/**
 * A registered action contract. `executor` names the backend binding the
 * `/agent/actions/execute` dispatcher routes to (the backend resolves the same catalog by
 * `kind`); the web app never executes — it forwards the validated `input` verbatim.
 */
export interface ActionDef {
  /** Catalog key, e.g. "send_email". Matches the `kind` on the execute payload. */
  kind: string;
  /** Operator-facing label for the approval surface. */
  label: string;
  /** ADR-0055 autonomy tier — drives the dial ceiling + the approval badge. */
  tier: AutonomyTier;
  /** Coarse ADR-0016 data-sensitivity class, e.g. "operational" | "client_pii". */
  dataClass: string;
  /** ADR-0014/0058 consent class — whether the backend re-checks contact consent. */
  consentClass: ConsentClass;
  /** The backend executor binding name (documentation/audit; the backend owns dispatch). */
  executor: string;
  /** The action's input contract (validated before forwarding). */
  schema: ActionInputSchema;
}

/** Outcome of validating an input payload against a catalog schema. */
export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

/**
 * Validate a flat input payload against an {@link ActionInputSchema}. Dependency-free; checks
 * presence of required fields, primitive type, non-empty strings for required string fields,
 * and enum membership. Unknown extra fields are allowed (forward-compatible — the backend is
 * the authoritative validator and may consume fields the catalog doesn't yet model).
 */
export function validateInput(
  schema: ActionInputSchema,
  input: unknown,
): ValidationResult {
  const errors: string[] = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: ["input must be an object"] };
  }
  const obj = input as Record<string, unknown>;
  for (const [name, spec] of Object.entries(schema)) {
    const present = Object.prototype.hasOwnProperty.call(obj, name) && obj[name] !== undefined;
    const required = spec.required !== false;
    if (!present) {
      if (required) errors.push(`missing required field: ${name}`);
      continue;
    }
    const value = obj[name];
    if (spec.type === "string") {
      if (typeof value !== "string") {
        errors.push(`field ${name} must be a string`);
        continue;
      }
      if (required && value.trim() === "") errors.push(`field ${name} must not be empty`);
      if (spec.enum && !spec.enum.includes(value)) {
        errors.push(`field ${name} must be one of: ${spec.enum.join(", ")}`);
      }
    } else if (spec.type === "boolean") {
      if (typeof value !== "boolean") errors.push(`field ${name} must be a boolean`);
    } else if (spec.type === "number") {
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors.push(`field ${name} must be a number`);
      }
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

/**
 * The registered actions. Migrating `send_email` + `send_sms` in with IDENTICAL behavior:
 * both are T2 client-facing, `client_pii`, consent-gated comms sends executed by the
 * backend's `comms_send` binding (the existing `/agent/actions/execute` path). Adding a new
 * governed action = add an entry here, nothing else (proven by the test-fixture action).
 */
const REGISTRY: Record<string, ActionDef> = {
  send_email: {
    kind: "send_email",
    label: "Send email",
    tier: "T2",
    dataClass: "client_pii",
    consentClass: "contact_channel",
    executor: "comms_send",
    schema: {
      contactId: { type: "string", required: true },
      channel: { type: "string", required: true, enum: ["email"] },
      subject: { type: "string", required: false },
      body: { type: "string", required: true },
    },
  },
  send_sms: {
    kind: "send_sms",
    label: "Send SMS",
    tier: "T2",
    dataClass: "client_pii",
    consentClass: "contact_channel",
    executor: "comms_send",
    schema: {
      contactId: { type: "string", required: true },
      channel: { type: "string", required: true, enum: ["sms"] },
      body: { type: "string", required: true },
    },
  },
  // Threads outbound (ADR-0125 D3 / epic #1334 S5). A public Threads post or reply is
  // CUSTOMER-FACING → a HARD autonomy ceiling (ADR-0109/0121): tier T3, never auto-executes
  // above the dial ceiling, always routes to the approval cockpit, v1 every Social Action is
  // human-approved (ADR-0124 D4). No `contact_channel` consent gate — these are broadcast on
  // OUR own company presence, not a 1:1 contact message; `consentClass:'none'`. The backend
  // `threads_publish` executor (S4 BE #417) resolves the conn-company-threads token from Key
  // Vault and calls graph.threads.net; it stays dormant/fail-closed until the token lands and
  // Meta App Review clears the threads_content_publish / threads_manage_replies scopes (D5).
  publish_threads: {
    kind: "publish_threads",
    label: "Publish Threads post",
    tier: "T3",
    dataClass: "operational",
    consentClass: "none",
    executor: "threads_publish",
    schema: {
      text: { type: "string", required: true },
    },
  },
  reply_threads: {
    kind: "reply_threads",
    label: "Reply on Threads",
    tier: "T3",
    dataClass: "operational",
    consentClass: "none",
    executor: "threads_publish",
    schema: {
      // The Threads post/reply id we are replying to (the external_ref carried on the
      // interaction row, source=threads, kind=social_post|social_comment|mention).
      replyToId: { type: "string", required: true },
      text: { type: "string", required: true },
    },
  },
};

/**
 * Register (or replace) an action contract at runtime. This is how a NEW governed action is
 * added — a single catalog entry, with no edit to the dispatch/approval path (ADR-0107 D2 /
 * #994 acceptance). Built-ins above are registered the same way conceptually; this is also
 * the seam a test-fixture action uses to prove the no-endpoint-edit property.
 */
export function registerActionDef(def: ActionDef): void {
  REGISTRY[def.kind] = def;
}

/** Look up a registered action by kind. Returns undefined for an unregistered kind (fail-closed). */
export function getActionDef(kind: string): ActionDef | undefined {
  return REGISTRY[kind];
}

/** Whether a kind is registered in the catalog. */
export function isRegisteredAction(kind: string): boolean {
  return Object.prototype.hasOwnProperty.call(REGISTRY, kind);
}

/** All registered action kinds (stable order). */
export function listActionKinds(): string[] {
  return Object.keys(REGISTRY);
}

/** All registered action defs (for admin/catalog surfaces). */
export function listActionDefs(): ActionDef[] {
  return Object.values(REGISTRY);
}

/** Operator-facing label for a kind (falls back to the raw kind). */
export function actionLabel(kind: string): string {
  return REGISTRY[kind]?.label ?? kind;
}

/**
 * Outcome of resolving a proposed action's `input` against the catalog.
 *
 * - `registered` → the kind is in the catalog AND its payload passed the schema (`def` set).
 * - `passthrough` → the kind is NOT (yet) in the front-end catalog. The backend is the
 *   authoritative validator + dispatcher (ADR-0042 / ADR-0107), and the generalized
 *   forward-verbatim path (#1130) must not drop a backend action the front end hasn't
 *   cataloged. So an unknown kind is FORWARDED, not refused — the catalog adds typed
 *   validation where it knows the action; it never narrows what the backend can execute.
 * - `invalid` → a REGISTERED kind whose payload failed the action's schema: refuse locally
 *   (a malformed call to a known contract is a bug we can catch before the round-trip).
 */
export type ResolveResult =
  | { ok: true; mode: "registered"; def: ActionDef }
  | { ok: true; mode: "passthrough"; kind: string }
  | { ok: false; reason: "invalid"; def: ActionDef; errors: string[] };

/**
 * Resolve a proposed action's verbatim `input` (whose own `kind` field names the action) to
 * its catalog def. This is the single front-end choke point that replaces the old hardcoded
 * `send_email | send_sms` enum + switch: callers dispatch via the catalog, not literal kinds.
 *
 * Registered kinds are validated against their schema (a malformed payload is refused before
 * the round-trip). UNREGISTERED kinds pass through to the backend, which is the authoritative
 * validator/dispatcher — preserving the generalized forward-verbatim contract (#1130). The
 * backend always re-asserts consent at execution (ADR-0058); this pre-flight tightens the
 * gate for known actions, never loosens it.
 */
export function resolveAction(input: Record<string, unknown>): ResolveResult {
  const kind = typeof input.kind === "string" ? input.kind : "";
  const def = getActionDef(kind);
  if (!def) return { ok: true, mode: "passthrough", kind };
  const validation = validateInput(def.schema, input);
  if (!validation.ok) return { ok: false, reason: "invalid", def, errors: validation.errors };
  return { ok: true, mode: "registered", def };
}
