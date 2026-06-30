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

import {
  type AutonomyTier,
  type LadderLevel,
  ladderAutoExecutes,
} from "@/lib/agent/action-autonomy";

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
  /**
   * ADR-0128 D3: the minimum canonical-ladder rung (L0–L5) at which this action
   * AUTO-EXECUTES. Below it the action parks to the cockpit. This is the action's inherent
   * risk floor on the universal ladder (`@/lib/agent/action-autonomy` {@link LadderLevel}),
   * NOT the operator's dial setting — the dial is the input, this is the threshold.
   */
  autoAtLevel: LadderLevel;
  /**
   * ADR-0128 D2/D3: the DIAL-PROOF hard ceiling. When true the action NEVER auto-executes at
   * any dial level — it always parks (gauntlet gate 8). Reserved for external commitments that
   * bind the company (send-for-signature, pricing/discount/term) and the hard money ceiling
   * (ADR-0109). The always-gate `data_class`es (`financial` / `security_credentials` /
   * `client_pii`, ADR-0118) are enforced SEPARATELY by the data-class ceiling — not duplicated
   * here — so this flag stays the explicit per-action commitment/money declaration.
   */
  alwaysGate: boolean;
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
    // L3 — a standard 1:1 external touch (ADR-0128 L3 auto-low-risk-external). Not an external
    // commitment, so `alwaysGate:false`; the client_pii data-class ceiling (ADR-0118) keeps it
    // parked in v1 until that ceiling is relaxed — capability is L3, posture is conservative.
    autoAtLevel: 3,
    alwaysGate: false,
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
    autoAtLevel: 3,
    alwaysGate: false,
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
    // L5 — a customer-facing public broadcast on OUR presence: only the maximal rung auto-runs
    // it (ADR-0128 L5). `operational` is NOT an always-gate data-class, so the conservative dial
    // (not a hard ceiling) is what keeps v1 human-approving every Social Action (ADR-0124 D4).
    autoAtLevel: 5,
    alwaysGate: false,
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
    autoAtLevel: 5,
    alwaysGate: false,
    executor: "threads_publish",
    schema: {
      // The Threads post/reply id we are replying to (the external_ref carried on the
      // interaction row, source=threads, kind=social_post|social_comment|mention).
      replyToId: { type: "string", required: true },
      text: { type: "string", required: true },
    },
  },
  // Social Media Management plane outbound (ADR-0124 #4, epic #1338 slice B #1358). The
  // unified set of 11 Social Action kinds — the AUTHORITATIVE deny-by-default copies are the
  // `agent_tool_grant` rows seeded for Belle (migration 0209) + the backend dispatcher (BE
  // #418); this catalog is the front-end half the GUI validates/labels against, kept in
  // lockstep with that seed (exactly like the Threads kinds above). EVERY social outbound is a
  // CUSTOMER-FACING public broadcast on OUR own presence → tier T3, `consentClass:'none'` (no
  // 1:1 contact-consent gate), HARD-ceiling, always cockpit-gated (v1 human-approves-all,
  // ADR-0124 #4). The backend re-asserts the grant + ceiling + per-channel token dormancy at
  // execution; the front end only PROPOSES. The 7 ORGANIC kinds are `client_pii` (third-party
  // author handles in the payload) at `autoAtLevel:3` — a routine organic post/reply on OUR own
  // presence is low-risk-external (Stream 01-A/01-D, ADR-0128 L3; the send_email/
  // autotask_post_reply L3 precedent). The PII guard is the client_pii data-class ceiling
  // (ADR-0118, backend gauntlet), NOT the rung; a large/new-audience escalation is a
  // workflow-layer always_gate (01-A); v1 keeps every kind withheld (grant 0209). The 4 MONEY/ad
  // kinds are `financial` — ADR-0109 HARD money ceiling, can NEVER be auto-granted, Mark-gated.
  social_publish_fb_post: {
    kind: "social_publish_fb_post",
    label: "Publish Facebook post",
    tier: "T3",
    dataClass: "client_pii",
    consentClass: "none",
    // L3 — a routine organic post/reply on OUR OWN presence is low-risk-external, execute-then-
    // notify (Stream 01-A/01-D; ADR-0128 L3; the send_email / autotask_post_reply L3 precedent).
    // client_pii (third-party author handles in the payload) → the data-class ceiling (ADR-0118)
    // is the PII guard at the BACKEND gauntlet, NOT this rung; a large/new-audience escalation is
    // a workflow-layer always_gate (01-A). v1 keeps it withheld (grant 0209). alwaysGate:false.
    autoAtLevel: 3,
    alwaysGate: false,
    executor: "social_dispatch",
    // socialPostId = the draft social_post being fanned out to this channel.
    schema: { socialPostId: { type: "string", required: true } },
  },
  social_reply_fb_comment: {
    kind: "social_reply_fb_comment",
    label: "Reply to Facebook comment",
    tier: "T3",
    dataClass: "client_pii",
    consentClass: "none",
    // L3 — a routine organic post/reply on OUR OWN presence is low-risk-external, execute-then-
    // notify (Stream 01-A/01-D; ADR-0128 L3; the send_email / autotask_post_reply L3 precedent).
    // client_pii (third-party author handles in the payload) → the data-class ceiling (ADR-0118)
    // is the PII guard at the BACKEND gauntlet, NOT this rung; a large/new-audience escalation is
    // a workflow-layer always_gate (01-A). v1 keeps it withheld (grant 0209). alwaysGate:false.
    autoAtLevel: 3,
    alwaysGate: false,
    executor: "social_dispatch",
    // engagementId = the social_engagement / interaction id being replied to.
    schema: { engagementId: { type: "string", required: true }, text: { type: "string", required: true } },
  },
  social_publish_ig_media: {
    kind: "social_publish_ig_media",
    label: "Publish Instagram media",
    tier: "T3",
    dataClass: "client_pii",
    consentClass: "none",
    // L3 — a routine organic post/reply on OUR OWN presence is low-risk-external, execute-then-
    // notify (Stream 01-A/01-D; ADR-0128 L3; the send_email / autotask_post_reply L3 precedent).
    // client_pii (third-party author handles in the payload) → the data-class ceiling (ADR-0118)
    // is the PII guard at the BACKEND gauntlet, NOT this rung; a large/new-audience escalation is
    // a workflow-layer always_gate (01-A). v1 keeps it withheld (grant 0209). alwaysGate:false.
    autoAtLevel: 3,
    alwaysGate: false,
    executor: "social_dispatch",
    schema: { socialPostId: { type: "string", required: true } },
  },
  social_reply_ig_comment: {
    kind: "social_reply_ig_comment",
    label: "Reply to Instagram comment",
    tier: "T3",
    dataClass: "client_pii",
    consentClass: "none",
    // L3 — a routine organic post/reply on OUR OWN presence is low-risk-external, execute-then-
    // notify (Stream 01-A/01-D; ADR-0128 L3; the send_email / autotask_post_reply L3 precedent).
    // client_pii (third-party author handles in the payload) → the data-class ceiling (ADR-0118)
    // is the PII guard at the BACKEND gauntlet, NOT this rung; a large/new-audience escalation is
    // a workflow-layer always_gate (01-A). v1 keeps it withheld (grant 0209). alwaysGate:false.
    autoAtLevel: 3,
    alwaysGate: false,
    executor: "social_dispatch",
    schema: { engagementId: { type: "string", required: true }, text: { type: "string", required: true } },
  },
  social_reply_ig_direct: {
    kind: "social_reply_ig_direct",
    label: "Reply to Instagram DM",
    tier: "T3",
    dataClass: "client_pii",
    consentClass: "none",
    // L3 — a routine organic post/reply on OUR OWN presence is low-risk-external, execute-then-
    // notify (Stream 01-A/01-D; ADR-0128 L3; the send_email / autotask_post_reply L3 precedent).
    // client_pii (third-party author handles in the payload) → the data-class ceiling (ADR-0118)
    // is the PII guard at the BACKEND gauntlet, NOT this rung; a large/new-audience escalation is
    // a workflow-layer always_gate (01-A). v1 keeps it withheld (grant 0209). alwaysGate:false.
    autoAtLevel: 3,
    alwaysGate: false,
    executor: "social_dispatch",
    schema: { engagementId: { type: "string", required: true }, text: { type: "string", required: true } },
  },
  social_post_threads: {
    kind: "social_post_threads",
    label: "Publish Threads post",
    tier: "T3",
    dataClass: "client_pii",
    consentClass: "none",
    // L3 — a routine organic post/reply on OUR OWN presence is low-risk-external, execute-then-
    // notify (Stream 01-A/01-D; ADR-0128 L3; the send_email / autotask_post_reply L3 precedent).
    // client_pii (third-party author handles in the payload) → the data-class ceiling (ADR-0118)
    // is the PII guard at the BACKEND gauntlet, NOT this rung; a large/new-audience escalation is
    // a workflow-layer always_gate (01-A). v1 keeps it withheld (grant 0209). alwaysGate:false.
    autoAtLevel: 3,
    alwaysGate: false,
    executor: "social_dispatch",
    schema: { socialPostId: { type: "string", required: true } },
  },
  social_reply_threads: {
    kind: "social_reply_threads",
    label: "Reply on Threads",
    tier: "T3",
    dataClass: "client_pii",
    consentClass: "none",
    // L3 — a routine organic post/reply on OUR OWN presence is low-risk-external, execute-then-
    // notify (Stream 01-A/01-D; ADR-0128 L3; the send_email / autotask_post_reply L3 precedent).
    // client_pii (third-party author handles in the payload) → the data-class ceiling (ADR-0118)
    // is the PII guard at the BACKEND gauntlet, NOT this rung; a large/new-audience escalation is
    // a workflow-layer always_gate (01-A). v1 keeps it withheld (grant 0209). alwaysGate:false.
    autoAtLevel: 3,
    alwaysGate: false,
    executor: "social_dispatch",
    schema: { engagementId: { type: "string", required: true }, text: { type: "string", required: true } },
  },
  social_boost_post: {
    kind: "social_boost_post",
    label: "Boost post (paid)",
    tier: "T3",
    dataClass: "financial",
    consentClass: "none",
    // HARD MONEY CEILING (ADR-0128 D2 / ADR-0109): paid spend binds the company → DIAL-PROOF.
    // `alwaysGate:true` parks at every level regardless of the dial; `auto_at_level` is moot but
    // pinned to the max rung for self-description. `financial` is also an always-gate data-class.
    autoAtLevel: 5,
    alwaysGate: true,
    executor: "social_dispatch",
    // socialPostId = the published post to boost; budgetUsd = the spend cap the approver sets.
    schema: { socialPostId: { type: "string", required: true }, budgetUsd: { type: "number", required: true } },
  },
  social_ad_deploy: {
    kind: "social_ad_deploy",
    label: "Deploy paid ad",
    tier: "T3",
    dataClass: "financial",
    consentClass: "none",
    // HARD MONEY CEILING (ADR-0128 D2 / ADR-0109): paid spend binds the company → DIAL-PROOF.
    // `alwaysGate:true` parks at every level regardless of the dial; `auto_at_level` is moot but
    // pinned to the max rung for self-description. `financial` is also an always-gate data-class.
    autoAtLevel: 5,
    alwaysGate: true,
    executor: "social_dispatch",
    schema: { campaignId: { type: "string", required: true }, budgetUsd: { type: "number", required: true } },
  },
  social_ad_pause: {
    kind: "social_ad_pause",
    label: "Pause paid ad",
    tier: "T3",
    dataClass: "financial",
    consentClass: "none",
    // HARD MONEY CEILING (ADR-0128 D2 / ADR-0109): paid spend binds the company → DIAL-PROOF.
    // `alwaysGate:true` parks at every level regardless of the dial; `auto_at_level` is moot but
    // pinned to the max rung for self-description. `financial` is also an always-gate data-class.
    autoAtLevel: 5,
    alwaysGate: true,
    executor: "social_dispatch",
    schema: { adId: { type: "string", required: true } },
  },
  social_ad_rebudget: {
    kind: "social_ad_rebudget",
    label: "Rebudget paid ad",
    tier: "T3",
    dataClass: "financial",
    consentClass: "none",
    // HARD MONEY CEILING (ADR-0128 D2 / ADR-0109): paid spend binds the company → DIAL-PROOF.
    // `alwaysGate:true` parks at every level regardless of the dial; `auto_at_level` is moot but
    // pinned to the max rung for self-description. `financial` is also an always-gate data-class.
    autoAtLevel: 5,
    alwaysGate: true,
    executor: "social_dispatch",
    schema: { adId: { type: "string", required: true }, budgetUsd: { type: "number", required: true } },
  },
  // ── Backend executor kinds (FE↔BE lockstep, #1497) ────────────────────────────────────────
  // The backend EXECUTES a broader set than the comms/social kinds above (the AI Technician
  // ticket loop #257 + the Pax8 procure→provision→bill sequence #360). These were absent from the
  // FE catalog + 0217, so the cockpit/dial-legend couldn't render them and the FE↔BE catalogs
  // diverged. Added here in lockstep with the backend `ActionDef` tags (ImperionCRM_Backend
  // src/shared/agent/action-catalog.ts, PR #441) — tier/dataClass/autoAtLevel/alwaysGate match
  // verbatim; schemas mirror the backend zod (the backend stays the authoritative validator —
  // its `at least one of status/queueId` refine and uuid checks are NOT re-modeled in the flat FE
  // schema, which only pre-flights presence/type). All are approval-gated, no contact-consent
  // channel (a ticket the client opened / internal procurement IS the context) → consentClass none.
  // The three FINANCIAL kinds (log_time, place_order, bill_attach) sit under the ADR-0109 hard
  // money ceiling → alwaysGate:true. The backend keeps each executor deploy-ahead safe
  // (unconfigured credential ⇒ `skipped`, never a fake success).
  autotask_update_ticket: {
    kind: "autotask_update_ticket",
    label: "Update Autotask ticket",
    tier: "T2",
    dataClass: "operational", // internal ticket field change — auto-eligible by class
    consentClass: "none",
    autoAtLevel: 2, // L2 auto-internal: an internal operational write, no external commitment.
    alwaysGate: false,
    executor: "autotask_write",
    // Backend requires at least one of status/queueId (refine) — both optional here; backend enforces.
    schema: {
      ticketId: { type: "number", required: true },
      status: { type: "number", required: false },
      queueId: { type: "number", required: false },
    },
  },
  autotask_post_reply: {
    kind: "autotask_post_reply",
    label: "Post Autotask client reply",
    tier: "T2",
    dataClass: "client_pii", // client-visible reply, customer-facing
    consentClass: "none",
    // L3 auto-low-risk-external: a client-visible touch. Not a commitment → alwaysGate:false; the
    // client_pii data-class ceiling (ADR-0118) is what keeps it parked in v1, enforced separately.
    autoAtLevel: 3,
    alwaysGate: false,
    executor: "autotask_write",
    schema: {
      ticketId: { type: "number", required: true },
      idempotencyKey: { type: "string", required: true },
      body: { type: "string", required: true },
      title: { type: "string", required: false },
    },
  },
  autotask_log_time: {
    kind: "autotask_log_time",
    label: "Log Autotask time entry",
    tier: "T2",
    dataClass: "financial", // billable time → invoicing
    consentClass: "none",
    // HARD MONEY CEILING (ADR-0128 D2 / ADR-0109): billable time feeds the invoice → DIAL-PROOF.
    // `auto_at_level` moot under always_gate but pinned to the max rung for self-description.
    autoAtLevel: 5,
    alwaysGate: true,
    executor: "autotask_write",
    schema: {
      ticketId: { type: "number", required: true },
      idempotencyKey: { type: "string", required: true },
      resourceId: { type: "number", required: true },
      dateWorked: { type: "string", required: true },
      hoursWorked: { type: "number", required: true },
      summaryNotes: { type: "string", required: true },
      internalNotes: { type: "string", required: false },
      billableToAccount: { type: "boolean", required: false },
    },
  },
  pax8_place_order: {
    kind: "pax8_place_order",
    label: "Place Pax8 order",
    tier: "T3",
    dataClass: "financial", // spends money
    consentClass: "none",
    // HARD MONEY CEILING (ADR-0128 D2 / ADR-0109): external money commit → DIAL-PROOF, always parks.
    autoAtLevel: 5,
    alwaysGate: true,
    executor: "procurement_dispatch",
    schema: {
      accountId: { type: "string", required: true },
      productId: { type: "string", required: true },
      quantity: { type: "number", required: true },
      idempotencyKey: { type: "string", required: true },
    },
  },
  m365_provision_license: {
    kind: "m365_provision_license",
    label: "Provision M365 license",
    tier: "T2",
    dataClass: "operational", // license assignment in the client tenant
    consentClass: "none",
    autoAtLevel: 2, // L2 auto-internal provisioning write — no external commitment.
    alwaysGate: false,
    executor: "procurement_dispatch",
    schema: {
      accountId: { type: "string", required: true },
      licenseSku: { type: "string", required: true },
      assignToUserPrincipalName: { type: "string", required: true },
      idempotencyKey: { type: "string", required: true },
    },
  },
  agreement_attach_license: {
    kind: "agreement_attach_license",
    label: "Attach license to agreement",
    tier: "T2",
    dataClass: "operational", // links a license_assignment row to a contract — internal
    consentClass: "none",
    autoAtLevel: 2, // L2 auto-internal — an internal record link, no external commitment.
    alwaysGate: false,
    executor: "procurement_dispatch",
    schema: {
      accountId: { type: "string", required: true },
      contractId: { type: "string", required: true },
      licenseAssignmentRef: { type: "string", required: true },
      idempotencyKey: { type: "string", required: true },
    },
  },
  bill_attach_license: {
    kind: "bill_attach_license",
    label: "Attach license to bill",
    tier: "T3",
    dataClass: "financial", // feeds invoicing / true-up
    consentClass: "none",
    // HARD MONEY CEILING (ADR-0128 D2 / ADR-0109): surfaces on billing / feeds the true-up → DIAL-PROOF.
    autoAtLevel: 5,
    alwaysGate: true,
    executor: "procurement_dispatch",
    schema: {
      accountId: { type: "string", required: true },
      contractId: { type: "string", required: true },
      idempotencyKey: { type: "string", required: true },
    },
  },
  // ── Marketing content/advocacy writes (#1701/#1702, epic #1696) ───────────────────────────
  // Belle's two INTERNAL silver writes (the content-studio + advocacy-capture workspaces). Both
  // are approval-gated executor writes — NEVER a direct silver write (the opportunity.write /
  // ticket.note precedent, ADR-0128 L2 auto-internal). The Constitution/room.yaml tool names are
  // `content.write` / `reference.write`; the executor kinds are snake_case here (the namespaces
  // are decoupled, like opportunity.write ↔ the autotask_* kinds).
  //   • content_write is OPERATIONAL (a marketing artifact draft/status/publish_ref/brand note,
  //     internal-reversible) → L2 auto-internal, no external commitment.
  //   • reference_write touches CLIENT_PII (names / verbatim client words) so the data-class
  //     ceiling (ADR-0118) parks it in v1 even though the action is an internal L2 write —
  //     alwaysGate stays false (no external commitment). The logo/name-use RIGHTS gate is a
  //     separate workflow-layer always_gate at advocacy-capture's rights-gate, not on this tool;
  //     a reference cannot reach captured/published without a recorded consent (the DB CHECK, D4).
  // PUBLISH is a HANDOFF to Loveable (a human-mediated export, D3), NOT a send — there is
  // deliberately NO content publish/send ActionDef here. brand_asset has NO write kind, ever (D5).
  content_write: {
    kind: "content_write",
    label: "Write marketing content asset",
    tier: "T2",
    dataClass: "operational",
    consentClass: "none",
    autoAtLevel: 2, // L2 auto-internal: an internal operational write, no external commitment.
    alwaysGate: false,
    executor: "content_write",
    schema: {
      contentAssetId: { type: "string", required: false }, // absent ⇒ create
      type: {
        type: "string",
        required: false,
        enum: ["blog", "case_study", "whitepaper", "battlecard", "one_pager", "press_release", "announcement"],
      },
      audience: { type: "string", required: false, enum: ["prospect", "seller", "press"] },
      status: { type: "string", required: false, enum: ["draft", "in_review", "approved", "published", "archived"] },
      title: { type: "string", required: false },
      publishRef: { type: "string", required: false }, // the Loveable-rendered URL stored at publish-handoff
    },
  },
  reference_write: {
    kind: "reference_write",
    label: "Write customer reference (consent-gated)",
    tier: "T2",
    dataClass: "client_pii", // holds names / verbatim client words → the data-class ceiling parks it
    consentClass: "none",
    autoAtLevel: 2, // L2 auto-internal write; the data-class ceiling (ADR-0118) is the v1 park, not alwaysGate.
    alwaysGate: false,
    executor: "reference_write",
    schema: {
      referenceId: { type: "string", required: false }, // absent ⇒ create
      kind: { type: "string", required: false, enum: ["testimonial", "review", "reference_case", "logo_use"] },
      accountId: { type: "string", required: false },
      status: {
        type: "string",
        required: false,
        enum: ["candidate", "consent_pending", "consented", "captured", "published", "withdrawn"],
      },
      consentEventId: { type: "string", required: false }, // the recorded consent basis (D4 precondition)
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

/** The actuation decision for an action at a dial level: auto-execute inline, or park to the cockpit. */
export type Actuation = "auto" | "park";

/**
 * Project a catalog action + a dial level onto the ADR-0128 D4 selection rule (gauntlet gate 7
 * `actuation_level` + gate 8 `hard_ceiling`): an action auto-executes IFF
 * `dial ≥ def.autoAtLevel AND NOT def.alwaysGate` — otherwise it PARKS. This is the front-end
 * MIRROR of the backend gauntlet's enforcement (#435); the backend is the runtime authority and
 * re-asserts the same rule (plus the data-class ceiling, consent, and grants) at dispatch. The
 * gauntlet-passes term of D4 is NOT modeled here — a caller may only treat `auto` as permission
 * once its own gauntlet has passed. Fail-closed: a non-ladder `dial` yields `park`.
 */
export function selectActuation(def: ActionDef, dial: LadderLevel): Actuation {
  return ladderAutoExecutes(dial, def.autoAtLevel, def.alwaysGate) ? "auto" : "park";
}
