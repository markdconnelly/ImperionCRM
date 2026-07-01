import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pin for the golden/drift envelope contract (#1662).
 *
 * Posture golden tables (the 0038 templated five, dns_golden 0080) carry the GOLDEN
 * contract: `golden_hash text NOT NULL` + a golden payload jsonb, keyed
 * `(tenant_id, policy_id)` — that is what the LP drift evaluator
 * (`Get-ImperionPolicyDrift`) joins on (`g.golden_hash`). Migration 0119 created
 * `purview_compliance_golden` with the BRONZE landing envelope
 * (`content_hash`, PK `(tenant_id, source, external_id)`) instead, which crashed the
 * drift loop with 42703 and took down the nightly vectorize sync (LP #409).
 *
 * This test pins the repair: the LAST migration to define `purview_compliance_golden`
 * must define it with the golden contract, never the bronze envelope. "Last definition
 * wins" — 0119 keeps its historical (wrong) CREATE, the fix migration drops and
 * recreates, and any FUTURE migration that redefines the table is held to the same bar.
 */

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");
const TABLE = "purview_compliance_golden";

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort();
}

/** Strip `--` line comments so we scan executable SQL only (headers legitimately
 *  describe the very antipattern we ban). */
function stripSql(file: string): string {
  return readFileSync(join(MIGRATIONS_DIR, file), "utf8")
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

/** Extract the body of a `CREATE TABLE [IF NOT EXISTS] <table> ( … )` statement. */
function createTableBody(sql: string, table: string): string | null {
  const re = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${table}\\s*\\(([\\s\\S]*?)\\)\\s*;`,
    "i",
  );
  const m = re.exec(sql);
  return m ? m[1] : null;
}

describe(`golden envelope guard: ${TABLE} (#1662)`, () => {
  const files = migrationFiles();
  const defining = files.filter((f) => createTableBody(stripSql(f), TABLE) !== null);

  it("at least two migrations define the table (0119 original + the fix)", () => {
    expect(defining.length).toBeGreaterThanOrEqual(2);
    expect(defining.some((f) => f.startsWith("0119_"))).toBe(true);
  });

  it("the LAST definition carries the golden contract, not the bronze envelope", () => {
    const last = defining[defining.length - 1];
    const body = createTableBody(stripSql(last), TABLE) as string;

    // Golden contract (0038 template / dns_golden 0080).
    expect(body).toMatch(/\bgolden_hash\s+text\s+NOT\s+NULL\b/i);
    expect(body).toMatch(/\bgolden_payload\s+jsonb\s+NOT\s+NULL\b/i);
    expect(body).toMatch(/PRIMARY\s+KEY\s*\(\s*tenant_id\s*,\s*policy_id\s*\)/i);

    // Bronze landing envelope must be gone.
    expect(body).not.toMatch(/\bcontent_hash\b/i);
    expect(body).not.toMatch(/\braw_payload\b/i);
    expect(body).not.toMatch(/\bexternal_id\b/i);
  });

  it("the fix migration guards its DROP so a golden-contract table is never dropped", () => {
    const last = defining[defining.length - 1];
    const sql = stripSql(last);
    if (/\bDROP\s+TABLE\b/i.test(sql)) {
      // The drop must be conditioned on the misshapen bronze envelope being present.
      expect(sql).toMatch(/content_hash/);
      expect(sql).toMatch(/NOT\s+EXISTS[\s\S]*golden_hash/i);
    }
  });
});
