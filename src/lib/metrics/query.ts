/**
 * The agent + BI metric query interface (#1115, epic #1050; backend #259/ADR-0078).
 *
 * ONE query path so an agent and a human compute the IDENTICAL number. There are two
 * surfaces over the governed `metric_definition` store (front-end migrations 0159/0180/0189):
 *
 *   1. {@link queryMetric} — RESOLVE one governed metric to its scalar value. This delegates
 *      to the backend metric engine (`metricsService.lookup` → `/orchestration/metrics/{key}`,
 *      `src/shared/metrics.ts`), which evaluates the pre-vetted `metric_definition.expression`
 *      in a READ-ONLY transaction. The FE NEVER executes the expression itself — that would
 *      fork the read path (§1: every *process* calls the backend) and bypass the engine's
 *      param allow-list + statement-timeout guards. The `metric_lookup` sub-agent tool uses the
 *      SAME backend path, so agent + BI agree by construction.
 *
 *   2. {@link listGovernedMetrics} — the BI CATALOG: which governed numbers exist + their
 *      contracts (name/grain/unit/owner/data_class), for rendering a metric picker. A
 *      definition is NOT row-level data (it is a formula over aggregates), so this is a direct
 *      DB read for rendering (§1 permits direct reads for the GUI) carried through RLS via
 *      `withIdentity`.
 *
 * SECURITY — the data_class read axis (#1034, migration 0175). Every governed metric carries a
 * `data_class` sensitivity. The DATABASE RLS predicate (`app_data_class_allowed()`, 0175) is the
 * hard floor; on TOP of it this module applies the FE mirror ({@link permittedClassesForRoles})
 * so a caller never sees — and an agent never resolves — a metric whose class is outside their
 * permitted set. `queryMetric` resolves the metric's class from the catalog BEFORE asking the
 * backend for the value, and refuses (status `forbidden`) when it is out of ceiling: an
 * unauthorized caller never even triggers the value evaluation. Fail-closed throughout: an
 * unresolved caller (no roles) permits NO class.
 *
 * This is an agent-callable read surface, so the gate is deliberate and explicit; it is NOT an
 * arbitrary-SQL surface — only a metric KEY + temporal params cross the boundary, and the
 * backend binds those against pre-vetted definitions only.
 *
 * Server-only.
 */
import "server-only";
import { withIdentity } from "@/lib/db/identity";
import { requestIdentity } from "@/lib/auth/request-identity";
import {
  permittedClassesForRoles,
  isDataClass,
  type DataClass,
} from "@/lib/security/data-class";
import {
  metricsService,
  type MetricResultWire,
  type MetricParamsWire,
} from "@/lib/services";
import { ServiceNotConfiguredError, ServiceCallError } from "@/lib/services/external-client";

/** A governed metric's catalog contract — the definition shape, never a value. */
export interface GovernedMetric {
  key: string;
  name: string;
  description: string | null;
  grain: string;
  unit: string;
  owner: string | null;
  dataClass: string;
  /** True when the backend can evaluate it now (a bound `SELECT … AS value`); false = unbound. */
  bound: boolean;
}

/**
 * The resolved metric result the agent + BI both consume. Extends the backend's
 * {@link MetricResultWire} with two FE-only terminal statuses the value-resolve path can add
 * WITHOUT a backend round-trip:
 *   - `forbidden` — the caller's role-set may not read this metric's `data_class` (#1034);
 *   - `not_configured` — the metric engine base URL is unset (the backend isn't wired yet).
 * Both keep `value` null, so a caller handles one structured shape regardless of where the
 * read stopped.
 */
export interface MetricQueryResult extends Omit<MetricResultWire, "status"> {
  status: MetricResultWire["status"] | "forbidden" | "not_configured";
}

/** Only `period` / `period_start` / `period_end` (YYYY-MM-DD) — the engine's fixed allow-list. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Metric key shape (matches `metric_definition.key`); fail-closed on anything else. */
const KEY_RE = /^[a-z][a-z0-9_]*$/;

/** Keep only well-formed YYYY-MM-DD temporal params; drop the rest (the backend re-validates). */
export function sanitizeParams(params?: MetricParamsWire): MetricParamsWire | undefined {
  if (!params) return undefined;
  const out: MetricParamsWire = {};
  for (const k of ["period", "period_start", "period_end"] as const) {
    const v = params[k];
    if (typeof v === "string" && DATE_RE.test(v)) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** A bound definition is one the engine can execute — a complete `SELECT …` (mirrors the engine). */
function isBound(expression: string | null): boolean {
  return typeof expression === "string" && /^\s*select\b/i.test(expression);
}

/**
 * The set of data classes the signed-in caller may read — the FE mirror of the RLS predicate.
 * Resolved from the session's app roles; an unresolved/role-less caller permits NO class
 * (fail-closed). Injectable `roles` for tests; defaults to the request identity's groups.
 */
export async function permittedClassesForCaller(roles?: readonly string[]): Promise<Set<DataClass>> {
  const groups = roles ?? (await requestIdentity()).groups;
  return permittedClassesForRoles(groups);
}

/**
 * List the governed metric definitions the caller may read (the BI catalog). Direct DB read
 * through RLS (`withIdentity`), then the FE data_class mirror filters anything outside the
 * caller's ceiling so the picker never offers a metric the caller cannot resolve. Returns []
 * in mock mode (no pool) — the BI surface degrades to an empty catalog rather than erroring.
 */
export async function listGovernedMetrics(): Promise<GovernedMetric[]> {
  const identity = await requestIdentity();
  const permitted = permittedClassesForRoles(identity.groups);

  const rows = await withIdentity(identity, async (client) => {
    const res = await client.query<{
      key: string;
      name: string;
      description: string | null;
      grain: string;
      unit: string;
      expression: string | null;
      owner: string | null;
      data_class: string;
    }>(
      `SELECT key, name, description, grain, unit, expression, owner, data_class
         FROM metric_definition
        WHERE active = true
        ORDER BY owner NULLS LAST, key`,
    );
    return res.rows;
  });

  if (!rows) return []; // mock mode

  return rows
    .filter((r) => isDataClass(r.data_class) && permitted.has(r.data_class))
    .map((r) => ({
      key: r.key,
      name: r.name,
      description: r.description,
      grain: r.grain,
      unit: r.unit,
      owner: r.owner,
      dataClass: r.data_class,
      bound: isBound(r.expression),
    }));
}

/** Resolve one active governed metric's catalog contract by key (RLS read), or null. */
export async function getGovernedMetric(key: string): Promise<GovernedMetric | null> {
  if (!KEY_RE.test(key)) return null;
  const identity = await requestIdentity();
  const rows = await withIdentity(identity, async (client) => {
    const res = await client.query<{
      key: string;
      name: string;
      description: string | null;
      grain: string;
      unit: string;
      expression: string | null;
      owner: string | null;
      data_class: string;
    }>(
      `SELECT key, name, description, grain, unit, expression, owner, data_class
         FROM metric_definition WHERE key = $1 AND active = true`,
      [key],
    );
    return res.rows[0] ?? null;
  });
  if (!rows) return null;
  return {
    key: rows.key,
    name: rows.name,
    description: rows.description,
    grain: rows.grain,
    unit: rows.unit,
    owner: rows.owner,
    dataClass: rows.data_class,
    bound: isBound(rows.expression),
  };
}

/** A terminal {@link MetricQueryResult} for a key that did not resolve to a value. */
function terminal(
  key: string,
  status: MetricQueryResult["status"],
  message: string,
  base?: Partial<MetricQueryResult>,
): MetricQueryResult {
  return {
    key,
    name: base?.name ?? key,
    value: null,
    unit: base?.unit ?? "",
    grain: base?.grain ?? "",
    asOf: new Date().toISOString(),
    dataClass: base?.dataClass ?? "operational",
    status,
    message,
  };
}

/**
 * Resolve a governed metric to its value for the signed-in caller — the agent + BI single
 * read path. Order of operations (the data_class gate runs BEFORE any value evaluation):
 *
 *   1. validate the key shape (fail-closed → not_found);
 *   2. load the metric's catalog contract through RLS — absent/inactive → not_found;
 *   3. ENFORCE the data_class read axis: if the metric's class is outside the caller's
 *      permitted set, return `forbidden` WITHOUT asking the backend for a value;
 *   4. delegate to the backend metric engine for the scalar (the one read path BI uses).
 *
 * Never throws for an expected condition (not_found / forbidden / not_configured / unbound /
 * error are all statuses) so callers consume one shape. `permittedClasses` is injectable for
 * tests; it defaults to the request identity's resolved classes.
 */
export async function queryMetric(
  key: string,
  params?: MetricParamsWire,
  permittedClasses?: ReadonlySet<DataClass>,
): Promise<MetricQueryResult> {
  if (!KEY_RE.test(key)) {
    return terminal(key, "not_found", `invalid metric key "${key}"`);
  }

  const def = await getGovernedMetric(key);
  if (!def) {
    return terminal(key, "not_found", `no active metric "${key}"`);
  }

  const permitted = permittedClasses ?? (await permittedClassesForCaller());
  if (!isDataClass(def.dataClass) || !permitted.has(def.dataClass)) {
    // Out of the caller's data_class ceiling — never trigger the value evaluation (#1034).
    return terminal(key, "forbidden", `data_class "${def.dataClass}" not permitted for caller`, def);
  }

  try {
    const wire = await metricsService.lookup(key, sanitizeParams(params));
    return { ...wire };
  } catch (err) {
    if (err instanceof ServiceNotConfiguredError) {
      return terminal(key, "not_configured", "metric engine is not configured", def);
    }
    if (err instanceof ServiceCallError) {
      return terminal(key, "error", `metric engine returned ${err.status}`, def);
    }
    return terminal(key, "error", err instanceof Error ? err.message : "metric lookup failed", def);
  }
}
