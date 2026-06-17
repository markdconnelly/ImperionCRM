/**
 * CMDB asset lifecycle helpers (#649, epic #372, ADR-0078).
 *
 * A DERIVED, READ-ONLY lifecycle state per asset CI — NOT hand-edited (the grilled
 * decision: lifecycle is computed from source signals, never part of the IT Glue
 * curated layer). The state is recomputed from the silver attributes a CI already
 * carries plus the Intune managed-device signal — NO new ingest, NO new silver
 * column. There is no override twin (unlike criticality, #648): an asset's lifecycle
 * is an observation of source systems, not a human assertion, so there is nothing to
 * override and nothing to persist. A view migration (0133) is OPTIONAL and DORMANT;
 * this module is the single rule and the read path derives entirely in code.
 *
 * Pure module (no `pg`, no env, no `node:*`) so the rule is unit-testable without a
 * database. The same signals the postgres `listConfigurationItems` read already
 * projects (device `status`, `last_seen_at`, Intune `management_state`/enrollment)
 * feed `deriveLifecycle`; an absent signal degrades to `unknown`, never a crash.
 *
 * THE DERIVED RULE (v1), in priority order, evaluated only for `device` CIs:
 *   1. An Autotask config-item/asset `status` that names a terminal state wins —
 *      `disposed` (scrapped/disposed) or `retired` (retired/inactive/decommissioned).
 *   2. A `status` that names stock (in stock / available / spare) → `in-stock`.
 *   3. Otherwise, the activity signal: an Intune-enrolled device, OR a device seen
 *      recently (within the activity window), is `in-use`; a device last seen long
 *      ago with no enrollment is `retired` (aged out); anything we cannot vouch for
 *      is `unknown`.
 * `account` and `user` CIs are not physical assets — they have no asset lifecycle —
 * so they always resolve to `unknown` (the badge is then suppressed by the UI).
 */

import type { CiType } from "@/types";

/**
 * The asset lifecycle scale (#649). `unknown` is the graceful fallback whenever the
 * source signals cannot place an asset (missing/ambiguous status, never-seen device,
 * or a non-asset CI). Kept in lock-step with the `AssetLifecycle` union in types.
 */
export const LIFECYCLE_STATES = [
  "in-use",
  "in-stock",
  "retired",
  "disposed",
  "unknown",
] as const;

export type AssetLifecycle = (typeof LIFECYCLE_STATES)[number];

/** Human label per state (badge text). */
export const LIFECYCLE_LABEL: Record<AssetLifecycle, string> = {
  "in-use": "In use",
  "in-stock": "In stock",
  retired: "Retired",
  disposed: "Disposed",
  unknown: "Unknown",
};

/** Design-token tone per state (badge tint) — maps to globals.css tokens. */
export const LIFECYCLE_TONE: Record<AssetLifecycle, "green" | "accent" | "amber" | "dim"> = {
  "in-use": "green",
  "in-stock": "accent",
  retired: "amber",
  disposed: "dim",
  unknown: "dim",
};

/** Narrow an arbitrary string to a known lifecycle state (filter/route guard). */
export function asLifecycle(value: string | null | undefined): AssetLifecycle | null {
  return value && (LIFECYCLE_STATES as readonly string[]).includes(value)
    ? (value as AssetLifecycle)
    : null;
}

/**
 * A device that has not been seen in this many days, with no live Intune enrollment,
 * is treated as aged out of service (→ `retired`). Mirrors the conservative posture
 * of `device-policy.ts`: a stale signal is not current truth.
 */
export const STALE_SEEN_DAYS = 90;

/** Autotask config-item/asset `status` tokens that mean a terminal/disposed state. */
const DISPOSED_TOKENS = ["disposed", "scrapped", "destroyed", "written off", "write-off"];
/** `status` tokens that mean retired/decommissioned (out of service, not destroyed). */
const RETIRED_TOKENS = ["retired", "decommissioned", "inactive", "end of life", "eol"];
/** `status` tokens that mean held in stock / not yet deployed. */
const IN_STOCK_TOKENS = ["in stock", "in-stock", "stock", "available", "spare", "new", "unassigned"];
/** `status` tokens that explicitly mean deployed / in service. */
const IN_USE_TOKENS = ["active", "in use", "in-use", "deployed", "in service", "in-service", "online"];

/** Intune `management_state` values that mean the device is actively managed/enrolled. */
const ENROLLED_STATES = new Set(["managed", "retrypending", "wipepending", "discovered"]);

/**
 * The minimal source signals the lifecycle rule reads. All optional — an
 * unknown/absent signal falls through to `unknown` (never a crash). Mirrors the
 * columns the postgres `listConfigurationItems` read projects per CI.
 */
export interface CiLifecycleInputs {
  /** device CI — Autotask config-item/asset `device.status` (free text). */
  deviceStatus?: string | null;
  /** device CI — silver `device.last_seen_at` (ISO timestamp) or null. */
  lastSeenAt?: string | null;
  /** device CI — Intune `management_state` (e.g. `managed`), null if not enrolled. */
  intuneManagementState?: string | null;
  /** device CI — Intune `enrolled_date_time` (ISO), null if never enrolled. */
  intuneEnrolledAt?: string | null;
}

function hasAny(haystack: string, tokens: string[]): boolean {
  return tokens.some((t) => haystack.includes(t));
}

/**
 * Compute the DERIVED lifecycle state for a CI from its source signals. Deterministic
 * and side-effect-free. Only `device` CIs carry an asset lifecycle; `account`/`user`
 * are not physical assets and always resolve to `unknown`.
 */
export function deriveLifecycle(
  ciType: CiType,
  inputs: CiLifecycleInputs,
  now: Date = new Date(),
): AssetLifecycle {
  if (ciType !== "device") return "unknown";

  const status = (inputs.deviceStatus ?? "").trim().toLowerCase();

  // 1. A terminal status wins outright (most authoritative signal).
  if (status) {
    if (hasAny(status, DISPOSED_TOKENS)) return "disposed";
    if (hasAny(status, RETIRED_TOKENS)) return "retired";
    // 2. Held in stock — but only if not also clearly in use.
    if (hasAny(status, IN_STOCK_TOKENS) && !hasAny(status, IN_USE_TOKENS)) return "in-stock";
    if (hasAny(status, IN_USE_TOKENS)) return "in-use";
  }

  // 3. Fall back to the activity signal. A live Intune enrollment is proof of use.
  const enrolled =
    ENROLLED_STATES.has((inputs.intuneManagementState ?? "").trim().toLowerCase()) ||
    isParseableDate(inputs.intuneEnrolledAt);
  if (enrolled) return "in-use";

  const seenAgeDays = daysSince(inputs.lastSeenAt, now);
  if (seenAgeDays === null) return "unknown"; // never seen, no enrollment, no status
  if (seenAgeDays <= STALE_SEEN_DAYS) return "in-use";
  return "retired"; // seen, but long ago and not enrolled → aged out of service
}

/** Parse an ISO timestamp to an age in days, or null if absent/unparseable. */
function daysSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (now.getTime() - t) / 86_400_000;
}

/** Whether a string is a parseable date (an enrollment timestamp = ever-enrolled). */
function isParseableDate(iso: string | null | undefined): boolean {
  return !!iso && !Number.isNaN(Date.parse(iso));
}
