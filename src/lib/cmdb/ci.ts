/**
 * CMDB Configuration Item (CI) read-model helpers (#645, epic #372, ADR-0078).
 *
 * The CMDB CI register is a READ-ONLY projection over EXISTING silver inventory —
 * no new ingest, no new bronze, no schema change. It recognises four CI types,
 * each projected over one silver entity:
 *
 *   account → silver `account`     (the managed client itself)
 *   user    → silver `contact`     (a managed-estate end-user identity)
 *   device  → silver `device`
 *   cloud   → silver `cloud_asset` (a provider-agnostic cloud resource — #874/#875)
 *
 * STAFF EXCLUSION (acceptance criterion). The CI set is the CLIENT managed estate
 * only — Imperion staff/admin identities are EXCLUDED. The internal employees who
 * authenticate into the app are modelled as `app_user`, a DIFFERENT table that the
 * CI union never touches; client end-users live in silver `contact`. We exclude
 * conservatively on top of that: a CI must have an owning `account_id` (a contact
 * or device with no client account is dropped), so an account-less / internal row
 * can never leak into the register. See `isClientCi`.
 *
 * This module is PURE — no `pg`, no env, no `node:*` — so the union typing and the
 * staff-exclusion rule are unit-testable without a database. The actual SQL UNION
 * lives in the postgres repository (`listConfigurationItems`); the mock returns [].
 */

import type { CiType, ConfigurationItem } from "@/types";

export const CI_TYPES: readonly CiType[] = ["account", "user", "device", "cloud"] as const;

/** Human label per CI type (filter chips + detail header). */
export const CI_TYPE_LABEL: Record<CiType, string> = {
  account: "Account",
  user: "End-user",
  device: "Device",
  cloud: "Cloud",
};

/** Lucide icon name per CI type — mirrors the nav/aesthetic vocabulary. */
export const CI_TYPE_ICON: Record<CiType, string> = {
  account: "Building2",
  user: "Contact",
  device: "MonitorSmartphone",
  cloud: "Cloud",
};

/** Narrow an arbitrary string to a known CI type (route param guard). */
export function asCiType(value: string | undefined): CiType | null {
  return value && (CI_TYPES as readonly string[]).includes(value)
    ? (value as CiType)
    : null;
}

/**
 * The stable cross-union key for a CI. `ciId` is unique only within a `ciType`
 * (an account id and a device id could in principle collide), so the register and
 * the detail route key on `${ciType}:${ciId}`.
 */
export function ciKey(ci: Pick<ConfigurationItem, "ciType" | "ciId">): string {
  return `${ci.ciType}:${ci.ciId}`;
}

/**
 * Whether a candidate row qualifies as a CLIENT CI — i.e. it carries an owning
 * managed `accountId`. This is the in-code guard backing the staff/internal
 * exclusion (the SQL already filters `account_id IS NOT NULL`; this keeps the rule
 * explicit and testable, and defends an in-code merge path too).
 */
export function isClientCi(row: { accountId: string | null | undefined }): boolean {
  return typeof row.accountId === "string" && row.accountId.length > 0;
}

/**
 * Project candidate rows into the CI set, dropping any without an owning account
 * (the staff/internal exclusion) and stamping each with its `ciType`. Pure — used
 * by an in-code merge path and by tests; the postgres path applies the same rule
 * in SQL.
 */
export function toConfigurationItems(
  rows: (Omit<ConfigurationItem, "accountId"> & { accountId: string | null })[],
): ConfigurationItem[] {
  return rows
    .filter(isClientCi)
    .map((r) => ({ ...r, accountId: r.accountId as string }));
}

/** Filter a CI list by optional type + account (the register's two filters). */
export function filterConfigurationItems(
  items: ConfigurationItem[],
  filters: { ciType?: CiType | null; accountId?: string | null },
): ConfigurationItem[] {
  return items.filter(
    (i) =>
      (!filters.ciType || i.ciType === filters.ciType) &&
      (!filters.accountId || i.accountId === filters.accountId),
  );
}
