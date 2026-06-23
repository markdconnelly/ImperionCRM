/**
 * Agreement reconciliation — ACTUAL-count aggregation (#1079, epic #1041, the first
 * tracer slice).
 *
 * Epic #1041 reconciles **contracted** seat/device counts against **actual** deployed
 * counts to flag under-billing (Hormozi's "#1 MSP margin leak"). This module owns the
 * **actual** side only — the per-account roll-up of what is *actually* deployed in a
 * client's estate, read straight from the silver tier:
 *
 *   - **seats**   → silver `license_assignment.quantity` (the assigned, account-resolved
 *                   license fact; the distributor is authoritative, read-only — see its
 *                   OKF concept). One client may hold many license rows across products;
 *                   the actual seat count is their `quantity` sum.
 *   - **devices** → silver `device` row count for the account (the CMDB estate).
 *   - **backups** → silver `device` rows with `backup_protected = true` (the Datto BCDR
 *                   backup-posture field merged onto the device, matrix #683) — i.e. how
 *                   many of the deployed devices are actually protected.
 *
 * Later slices add the contracted side (#1080), drift / under-bill detection (#1081),
 * and SaaS cost-vs-bill recon (#1082). This slice deliberately stops at "here is the
 * actual count, per client" — no contract, no drift, no money.
 *
 * This module is PURE — no `pg`, no env, no `node:*` — so the roll-up rule is
 * unit-testable without a database. The SQL `GROUP BY account` lives in the postgres
 * repository (`listActualCounts`); the mock returns []. Counts are non-negative integers;
 * an account with silver inventory but zero of a given kind reports 0 (absent beats a
 * wrong value — the inventory's cardinal rule, ADR-0051 §6).
 */

/** Which kind of deployed unit an actual count measures. */
export type ActualCountKind = "seats" | "devices" | "backups";

/** Human label per actual-count kind (filter chips / column headers). */
export const ACTUAL_COUNT_LABEL: Record<ActualCountKind, string> = {
  seats: "Licensed seats",
  devices: "Devices",
  backups: "Protected devices",
};

/**
 * One client's actual deployed-unit counts, rolled up from silver. `accountId` is the
 * owning `account.id`; `accountName` is denormalised for display. Each count is the
 * actual side of the #1041 true-up for that kind.
 */
export interface ActualCountRow {
  accountId: string;
  accountName: string;
  /** Sum of `license_assignment.quantity` for the account (actual licensed seats). */
  seats: number;
  /** Count of silver `device` rows for the account (deployed devices). */
  devices: number;
  /** Count of those devices with `backup_protected = true` (actually protected). */
  backups: number;
}

/** A raw per-account aggregate row as the SQL projection emits it (counts may be null/string). */
export interface ActualCountAggregate {
  accountId: string;
  accountName: string | null;
  seats: number | string | null;
  devices: number | string | null;
  backups: number | string | null;
}

/** Coerce a SQL `count()` / `sum()` result (bigint comes back as a string in pg) to a
 *  non-negative integer; null / blank / unparseable → 0. */
export function toCount(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}

/**
 * Normalise the raw per-account aggregate rows into the actual-count read-model: coerce
 * every count to a non-negative integer, default a missing account name, and DROP any row
 * with no owning account id (defensive — the SQL already requires `account_id IS NOT NULL`,
 * mirroring the CMDB CI staff-exclusion guard). Pure: same input → same output. Returns a
 * NEW array; input is not mutated.
 */
export function toActualCounts(rows: ActualCountAggregate[]): ActualCountRow[] {
  return rows
    .filter((r) => typeof r.accountId === "string" && r.accountId.length > 0)
    .map((r) => ({
      accountId: r.accountId,
      accountName: r.accountName && r.accountName.length > 0 ? r.accountName : "(unnamed account)",
      seats: toCount(r.seats),
      devices: toCount(r.devices),
      backups: toCount(r.backups),
    }));
}

/**
 * Roll a set of per-account actual-count rows into one estate-wide total (the #1041
 * headline figure across all clients). Pure; the per-kind totals are simple column sums.
 */
export function totalActualCounts(rows: ActualCountRow[]): {
  accountCount: number;
  seats: number;
  devices: number;
  backups: number;
} {
  return rows.reduce(
    (acc, r) => ({
      accountCount: acc.accountCount + 1,
      seats: acc.seats + r.seats,
      devices: acc.devices + r.devices,
      backups: acc.backups + r.backups,
    }),
    { accountCount: 0, seats: 0, devices: 0, backups: 0 },
  );
}

/**
 * Order accounts for the actual-count surface: largest deployed estate first (devices,
 * then seats as a tiebreak), then account name for a stable final order. Returns a NEW
 * array; input is not mutated. Largest-first because the biggest estates carry the biggest
 * potential margin leak — the worklist the #1041 epic ultimately drives.
 */
export function sortByEstateSize(rows: ActualCountRow[]): ActualCountRow[] {
  return [...rows].sort((a, b) => {
    if (b.devices !== a.devices) return b.devices - a.devices;
    if (b.seats !== a.seats) return b.seats - a.seats;
    return a.accountName.localeCompare(b.accountName);
  });
}
