/**
 * entity-resolution — the FE-side contract for the golden-record identity spine (#1111, epic
 * #1049).
 *
 * The DATABASE is authoritative: the spine is `entity_xref` (migration 0160) and the forward
 * resolver is the SQL function `entity_resolve(entity_type, source_system, source_key)`
 * (migration 0190; made BITEMPORAL by migration 0191, #1112). This module is the TypeScript
 * mirror — the canonical vocabularies + the resolver-call descriptor — so app/services code
 * resolves a source identity through ONE typed contract instead of hand-building the SQL, exactly
 * as `lib/security/data-class.ts` mirrors `app_data_class_allowed()`. Keep the vocabularies in
 * lockstep with the 0160 CHECK constraints and `CLIENT_MAPPING_ADAPTERS` (two copies of one
 * fact, the 0156 ↔ SEEDED_TOOL_GRANTS precedent).
 *
 * Bitemporal (migration 0191, #1112, epic #1049): `entity_xref` carries a valid-time interval
 * (`valid_from`/`valid_to` — "what was true when") and a system-time interval
 * (`system_from`/`system_to` — "what we believed when we acted"). `entity_resolve()` returns the
 * row that is valid NOW under the CURRENT belief; `isLiveMapping` below is the FE mirror of that
 * exact predicate so a renderer can pick the live version out of a row's bitemporal history
 * without re-deriving the SQL.
 *
 * No PII, no secrets — `entity_type` / `source_system` are classification labels and a
 * `source_key` is a source-system identifier (e.g. an Autotask company id), never personal data.
 */

/** The polymorphic entity kinds the spine resolves — the 0160 `entity_type` CHECK constraint. */
export const ENTITY_TYPES = ["account", "contact", "device", "asset", "opportunity"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Type guard — narrows an arbitrary string to a known spine entity_type. */
export function isEntityType(value: string): value is EntityType {
  return (ENTITY_TYPES as readonly string[]).includes(value);
}

/**
 * The source systems a `source_key` can come from. NOT a DB CHECK (0160 leaves `source_system`
 * open text so a new connector needs no migration), but this is the curated known set, kept in
 * lockstep with `CLIENT_MAPPING_ADAPTERS` (client-mapping.ts) and the `connection_provider`
 * enum. `website` is the CRM's own ingest source and has no client-mapping adapter.
 */
export const SOURCE_SYSTEMS = [
  "website",
  "autotask",
  "itglue",
  "m365",
  "kqm",
  "quotemanager",
  "qbo",
  "apollo",
  "pax8",
  "unifi",
  "televy",
  "myitprocess",
] as const;
export type SourceSystem = (typeof SOURCE_SYSTEMS)[number];

/** True when `value` is a known source system (label/validate only — unknowns still resolve). */
export function isKnownSourceSystem(value: string): boolean {
  return (SOURCE_SYSTEMS as readonly string[]).includes(value);
}

/** The SQL function the database exposes as the single forward-lookup entry point (migration 0190). */
export const ENTITY_RESOLVE_FN = "entity_resolve" as const;

/** A source identity to resolve: which kind, which system, and the id within that system. */
export interface SourceIdentity {
  entityType: EntityType;
  sourceSystem: string;
  sourceKey: string;
}

/**
 * Normalize a source identity before it hits the spine, so a writer and a later reader agree on
 * the exact `(source_system, source_key)` bytes the unique index is keyed on. Trims whitespace
 * and lower-cases the `source_system` (systems are case-insensitive tokens); `source_key` is left
 * verbatim except for trimming — source ids are opaque and may be case-sensitive (e.g. base64
 * GUIDs), so we never fold their case. Returns null when either part is empty after trimming
 * (an unresolvable identity — fail-closed, never a blank-key spine row).
 */
export function normalizeSourceIdentity(identity: SourceIdentity): SourceIdentity | null {
  const sourceSystem = identity.sourceSystem.trim().toLowerCase();
  const sourceKey = identity.sourceKey.trim();
  if (!isEntityType(identity.entityType) || !sourceSystem || !sourceKey) return null;
  return { entityType: identity.entityType, sourceSystem, sourceKey };
}

/**
 * Build the positional argument tuple for an `entity_resolve($1,$2,$3)` call from a normalized
 * identity — the single place the FE encodes the resolver's arg order so callers don't re-derive
 * it. Returns null for an identity that can't be normalized (so the caller skips the round-trip
 * rather than querying with a blank key).
 */
export function entityResolveArgs(identity: SourceIdentity): [string, string, string] | null {
  const n = normalizeSourceIdentity(identity);
  return n ? [n.entityType, n.sourceSystem, n.sourceKey] : null;
}

/**
 * A spine row's bitemporal stamps (migration 0191, #1112). Valid-time
 * (`validFrom`/`validTo`) is "what was true when"; system-time (`systemFrom`/`systemTo`) is "what
 * we believed when". A `null` end means open-ended: `validTo === null` ⇒ still valid in the
 * world, `systemTo === null` ⇒ the current belief. Dates are the resolved values of the
 * `timestamptz` columns; only the columns the FE needs to pick the live version are mirrored
 * here (the audit columns `created_at`/`updated_at` are not part of this contract).
 */
export interface BitemporalValidity {
  validFrom: Date;
  validTo: Date | null;
  systemFrom: Date;
  systemTo: Date | null;
}

/**
 * The FE mirror of the `entity_resolve()` live-row predicate (migration 0191): a mapping is LIVE
 * iff it is valid at `at` (`validFrom <= at < validTo`, open-ended `validTo` treated as infinity)
 * AND it is the current belief (`systemTo === null`). Use this to pick the live version out of a
 * row's bitemporal history client-side without re-deriving the SQL — the DB stays authoritative,
 * but a lineage/"same entity across systems" panel can label which version the resolver would
 * return. `at` defaults to now. Mirrors the resolver exactly: keep it in lockstep with the 0191
 * function body.
 */
export function isLiveMapping(validity: BitemporalValidity, at: Date = new Date()): boolean {
  const t = at.getTime();
  const validNow = validity.validFrom.getTime() <= t && (validity.validTo === null || t < validity.validTo.getTime());
  const currentBelief = validity.systemTo === null;
  return validNow && currentBelief;
}
