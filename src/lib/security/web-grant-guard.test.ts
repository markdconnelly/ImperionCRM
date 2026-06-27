import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CI guard for ADR-0127 (web role least-privilege; issue #1390).
 *
 * After migration 0216 re-baselined the web identity to SELECT-by-default + an explicit
 * write allowlist, no migration may re-introduce the migration-0002 antipattern: a blanket
 * INSERT/UPDATE/DELETE grant to the web role via `ON ALL TABLES IN SCHEMA public`, or a
 * write `ALTER DEFAULT PRIVILEGES … TO web`. New GUI-written tables get a DELIBERATE,
 * reviewable per-table grant in their own migration — never a blanket one.
 *
 * 0002 itself is the grandfathered exception (0216 neutralizes it); everything else is banned.
 */

const WEB_ROLE = "mgid-imperioncrm-web-prd";
const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");
const GRANDFATHERED = new Set(["0002"]); // the original blanket grant, neutralized by 0216

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort();
}

function migrationNumber(file: string): string {
  return file.slice(0, 4);
}

/** Strip `--` line comments so the guard scans executable SQL only (migration headers
 *  legitimately describe the very antipattern we ban). */
function stripSql(file: string): string {
  return readFileSync(join(MIGRATIONS_DIR, file), "utf8")
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

/** A GRANT of any write privilege to the web role over ALL TABLES in the schema. */
function hasBlanketWriteGrantToWeb(sql: string): boolean {
  // GRANT … INSERT|UPDATE|DELETE … ON ALL TABLES IN SCHEMA public … TO "<web>"
  const re = new RegExp(
    `GRANT[^;]*\\b(INSERT|UPDATE|DELETE)\\b[^;]*ON\\s+ALL\\s+TABLES\\s+IN\\s+SCHEMA\\s+public[^;]*TO\\s+"?${WEB_ROLE}"?`,
    "is",
  );
  return re.test(sql);
}

/** An ALTER DEFAULT PRIVILEGES that GRANTS a write default to the web role. */
function hasWriteDefaultGrantToWeb(sql: string): boolean {
  const re = new RegExp(
    `ALTER\\s+DEFAULT\\s+PRIVILEGES[^;]*\\bGRANT\\b[^;]*\\b(INSERT|UPDATE|DELETE)\\b[^;]*TO\\s+"?${WEB_ROLE}"?`,
    "is",
  );
  return re.test(sql);
}

describe("web role grant guard (ADR-0127 / #1390)", () => {
  const files = migrationFiles();

  it("finds migration files to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("no migration (except grandfathered 0002) blanket-grants web writes on ALL TABLES", () => {
    const offenders = files.filter(
      (f) =>
        !GRANDFATHERED.has(migrationNumber(f)) &&
        hasBlanketWriteGrantToWeb(stripSql(f)),
    );
    expect(offenders, `blanket web write grant must be a deliberate per-table grant, not ON ALL TABLES`).toEqual([]);
  });

  it("no migration (except grandfathered 0002) grants a web write DEFAULT PRIVILEGE", () => {
    const offenders = files.filter(
      (f) =>
        !GRANDFATHERED.has(migrationNumber(f)) &&
        hasWriteDefaultGrantToWeb(stripSql(f)),
    );
    expect(offenders, `new tables must be web-SELECT-only by default (ADR-0127)`).toEqual([]);
  });

  it("the 0216 baseline revokes blanket web writes and flips the default to SELECT-only", () => {
    const baseline = files.find((f) => f.startsWith("0216_"));
    expect(baseline, "0216 baseline migration must exist").toBeTruthy();
    const sql = stripSql(baseline as string);
    expect(sql).toMatch(
      new RegExp(`REVOKE[^;]*\\b(INSERT|UPDATE|DELETE)\\b[^;]*ON\\s+ALL\\s+TABLES[^;]*FROM\\s+"?${WEB_ROLE}"?`, "is"),
    );
    expect(sql).toMatch(
      new RegExp(`ALTER\\s+DEFAULT\\s+PRIVILEGES[^;]*REVOKE[^;]*\\b(INSERT|UPDATE|DELETE)\\b[^;]*FROM\\s+"?${WEB_ROLE}"?`, "is"),
    );
  });
});
