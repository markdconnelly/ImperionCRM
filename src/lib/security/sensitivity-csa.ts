/**
 * Sensitivity labels + custom security attributes — account-scoped read surface
 * (#259, posture model ADR-0051, per-source bronze ADR-0039, golden-baseline
 * benchmark precedent ADR-0051 §3 / conditional_access_policies_golden).
 *
 * BOUNDARY (front end = GUI, ADR-0042): this is a pure READ. It joins the
 * (future) bronze feeds through `account_tenant` (ADR-0051 tenant scoping) and
 * routes through the optional-enrichment seam (#301/#302) — a not-yet-migrated
 * table/view degrades to an EMPTY result, never a blanked account page. The
 * bronze collectors are a separate on-prem lane (LocalPipeline #141); until they
 * (and their migration) land, every account renders the honest "absent" state.
 *
 * Bronze envelope follows the 0080 DNS-posture contract: flat text columns, the
 * loader stringifies, real types live in raw_payload. We therefore read text and
 * normalize defensively here.
 *
 * Schema source-of-truth still lives in `ImperionCRM` migrations; this lane adds
 * NO migration (the collector lane owns the bronze DDL). Follow-up: #575 tracks
 * the front-end bronze migration once the collector lane is ready.
 *
 * Never import into a client component — it touches the server-only pool.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import { isSchemaLagError } from "@/lib/data/postgres/fallback";

/** One Microsoft Purview / M365 sensitivity label observed in a mapped tenant. */
export interface SensitivityLabelRow {
  tenantId: string;
  labelId: string;
  name: string | null;
  /** Lower number = more sensitive in Purview's ordering; null when unknown. */
  priority: number | null;
  isActive: boolean;
  /** Bronze collection timestamp (date string), null when absent. */
  collectedAt: string | null;
}

/** One Entra custom security attribute DEFINITION observed in a mapped tenant. */
export interface CustomSecurityAttributeRow {
  tenantId: string;
  attributeSet: string;
  name: string;
  /** String|Integer|Boolean — text from bronze, not constrained here. */
  dataType: string | null;
  status: string | null;
  collectedAt: string | null;
}

export interface SensitivityCsaForAccount {
  labels: SensitivityLabelRow[];
  attributes: CustomSecurityAttributeRow[];
}

/**
 * The standard custom-security-attribute set the MSP benchmarks every customer
 * tenant against (golden-baseline pattern, ADR-0051 §3). Matched case-insensitively
 * on the attribute NAME within any attribute set. Kept here (not in the DB) because
 * it is a small, slow-moving MSP policy constant the read surface compares against —
 * the same shape as the secure-score control golden list.
 */
export const STANDARD_CSA_SET: readonly string[] = [
  "DataClassification",
  "OwnerTeam",
  "Environment",
  "Confidentiality",
] as const;

export interface CsaBenchmark {
  /** Standard attribute names PRESENT in the tenant's observed definitions. */
  present: string[];
  /** Standard attribute names MISSING from the tenant. */
  missing: string[];
  /** present / STANDARD_CSA_SET.length, 0..1. */
  coverage: number;
}

/**
 * Benchmark observed custom-security-attribute definitions against the MSP
 * standard set. Pure + deterministic — name match is case-insensitive and ignores
 * the attribute set (Entra scopes names within a set, but the MSP standard is by
 * name). Returns coverage as a 0..1 fraction.
 */
export function benchmarkCustomAttributes(
  attributes: Pick<CustomSecurityAttributeRow, "name">[],
  standard: readonly string[] = STANDARD_CSA_SET,
): CsaBenchmark {
  const observed = new Set(attributes.map((a) => a.name.trim().toLowerCase()));
  const present: string[] = [];
  const missing: string[] = [];
  for (const name of standard) {
    if (observed.has(name.trim().toLowerCase())) present.push(name);
    else missing.push(name);
  }
  const coverage = standard.length === 0 ? 1 : present.length / standard.length;
  return { present, missing, coverage };
}

function toBool(value: string | null): boolean {
  return (value ?? "").toLowerCase() === "true";
}

function toIntOrNull(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function fmtDate(value: string | null): string | null {
  return value ? value.slice(0, 10) : null;
}

/**
 * Read sensitivity labels + custom security attribute definitions for every
 * Customer Tenant mapped to an account. Schema-lag (collector not yet migrated)
 * → empty arrays; null pool (local/demo) → empty arrays. Never throws for the
 * absent-data case so the posture page degrades gracefully.
 */
export async function listSensitivityCsaForAccount(
  accountId: string,
): Promise<SensitivityCsaForAccount> {
  const pool = getPool();
  if (!pool) return { labels: [], attributes: [] };

  let labels: SensitivityLabelRow[] = [];
  let attributes: CustomSecurityAttributeRow[] = [];

  try {
    const { rows } = await pool.query<{
      tenant_id: string;
      label_id: string;
      name: string | null;
      priority: string | null;
      is_active: string | null;
      collected_at: string | null;
    }>(
      `SELECT l.tenant_id, l.label_id, l.name, l.priority, l.is_active,
              l.collected_at::text AS collected_at
         FROM m365_sensitivity_labels l
         JOIN account_tenant m ON m.tenant_id = l.tenant_id
        WHERE m.account_id = $1::uuid
        ORDER BY l.priority NULLS LAST, l.name NULLS LAST`,
      [accountId],
    );
    labels = rows.map((r) => ({
      tenantId: r.tenant_id,
      labelId: r.label_id,
      name: r.name,
      priority: toIntOrNull(r.priority),
      isActive: toBool(r.is_active),
      collectedAt: fmtDate(r.collected_at),
    }));
  } catch (err) {
    if (!isSchemaLagError(err)) throw err;
  }

  try {
    const { rows } = await pool.query<{
      tenant_id: string;
      attribute_set: string;
      name: string;
      data_type: string | null;
      status: string | null;
      collected_at: string | null;
    }>(
      `SELECT a.tenant_id, a.attribute_set, a.name, a.data_type, a.status,
              a.collected_at::text AS collected_at
         FROM entra_custom_security_attributes a
         JOIN account_tenant m ON m.tenant_id = a.tenant_id
        WHERE m.account_id = $1::uuid
        ORDER BY a.attribute_set, a.name`,
      [accountId],
    );
    attributes = rows.map((r) => ({
      tenantId: r.tenant_id,
      attributeSet: r.attribute_set,
      name: r.name,
      dataType: r.data_type,
      status: r.status,
      collectedAt: fmtDate(r.collected_at),
    }));
  } catch (err) {
    if (!isSchemaLagError(err)) throw err;
  }

  return { labels, attributes };
}
