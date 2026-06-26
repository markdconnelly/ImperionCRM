/**
 * CMDB Configuration Item (CI) read-model helpers (#645, epic #372, ADR-0078).
 *
 * The CMDB CI register is a READ-ONLY projection over EXISTING silver inventory —
 * no new ingest, no new bronze, no schema change. It recognises four CI types,
 * each projected over one silver entity:
 *
 *   account  → silver `account`     (the managed client itself)
 *   user     → silver `contact`     (a managed-estate end-user identity)
 *   device   → silver `device`
 *   cloud    → silver `cloud_asset` (a provider-agnostic cloud resource — #874/#875)
 *   software → silver `software_ci` (a software install on a device — Intune apps, #652)
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
import type { DevicePolicyCompliance } from "@/lib/security/device-policy";

export const CI_TYPES: readonly CiType[] = [
  "account",
  "user",
  "device",
  "cloud",
  "software",
] as const;

/** Human label per CI type (filter chips + detail header). */
export const CI_TYPE_LABEL: Record<CiType, string> = {
  account: "Account",
  user: "End-user",
  device: "Device",
  cloud: "Cloud",
  software: "Software",
};

/** Lucide icon name per CI type — mirrors the nav/aesthetic vocabulary. */
export const CI_TYPE_ICON: Record<CiType, string> = {
  account: "Building2",
  user: "Contact",
  device: "MonitorSmartphone",
  cloud: "Cloud",
  software: "Package",
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

/**
 * Human label for the device CI policy-compliance indicator (#882) — the SAME
 * vocabulary the Devices-view inventory badge uses (`DeviceInventory`), so the two
 * device notions read identically now they are one CI.
 */
export const DEVICE_POLICY_LABEL: Record<DevicePolicyCompliance, string> = {
  compliant: "Compliant",
  drift: "Drift",
  ungoverned: "Ungoverned",
};

/**
 * Friendly label per `device_bronze_all` source code (#882) — the bronze provenance
 * the merged silver device was built from (migration 0036). Anything unmapped passes
 * through verbatim (forward-compatible with new device feeds).
 */
const DEVICE_ORIGIN_LABEL: Record<string, string> = {
  itglue: "IT Glue",
  m365_synced: "Intune",
  website: "Manual",
  datto_rmm: "Datto RMM",
};

/**
 * Turn the raw comma-joined `device_bronze_all.source` aggregate into a human source
 * list for the device CI's "Source" attribute (e.g. `"itglue,m365_synced"` →
 * `"IT Glue, Intune"`). PURE + unit-tested; null/empty in → null out (no Source row).
 */
export function labelDeviceOrigins(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const labels = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => DEVICE_ORIGIN_LABEL[s] ?? s);
  return labels.length > 0 ? labels.join(", ") : null;
}

/**
 * Append the device-only convergence signals (#882, epic #873) to a CI's display
 * attributes — Intune policy compliance + merged bronze origin — so they surface on
 * BOTH the register table and the CI detail (which both render `attributes` generically),
 * with no per-surface branching. PURE: the SQL projection sets `policyCompliance`/`origin`
 * on the device arm; this is the single place that turns them into display rows, and is
 * unit-tested here. A null/absent signal contributes NOTHING (absent beats a wrong value —
 * the inventory's cardinal rule, ADR-0051 §6). Non-device CIs are returned unchanged.
 */
export function deviceCiAttributes(
  ci: Pick<ConfigurationItem, "ciType" | "attributes" | "policyCompliance" | "origin">,
): { label: string; value: string }[] {
  if (ci.ciType !== "device") return ci.attributes;
  const extra: { label: string; value: string }[] = [];
  if (ci.policyCompliance) {
    extra.push({ label: "Policy", value: DEVICE_POLICY_LABEL[ci.policyCompliance] });
  }
  if (ci.origin && ci.origin.length > 0) {
    extra.push({ label: "Source", value: ci.origin });
  }
  return [...ci.attributes, ...extra];
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
