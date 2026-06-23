import { describe, it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  stripSqlComments,
  parseMetricSeedRows,
  validateMetricRow,
  validateMetricSeedSql,
  unwrap,
  VALID_UNITS,
  VALID_DATA_CLASSES,
} from "./metric-seed-contract.mjs";

const MIGRATIONS_DIR = fileURLToPath(new URL("../db/migrations/", import.meta.url));

describe("parseMetricSeedRows", () => {
  it("ignores INSERTs that live inside SQL comments", () => {
    const sql = `-- INSERT INTO metric_definition (key) VALUES ('fake')\nSELECT 1;`;
    expect(parseMetricSeedRows(sql)).toEqual([]);
  });

  it("parses a multi-row seed, keeping commas/parens inside the expression intact", () => {
    const sql = `
      INSERT INTO metric_definition (key, name, unit, expression, owner, data_class) VALUES
        ('win_rate', 'Win Rate %', 'percent',
         'SELECT COUNT(*) FILTER (WHERE s = ''won'')::numeric / NULLIF(COUNT(*), 0) * 100 AS value FROM o',
         'sales', 'operational'),
        ('open_tickets', 'Open Tickets', 'count',
         'SELECT COUNT(*) AS value FROM ticket WHERE closed_at IS NULL',
         'service-delivery', 'operational')
      ON CONFLICT (key) DO NOTHING;`;
    const rows = parseMetricSeedRows(sql);
    expect(rows).toHaveLength(2);
    expect(unwrap(rows[0].key)).toBe("win_rate");
    // The doubled '' inside the FILTER must survive as a single quote, and the inner
    // parens/commas must not split the tuple.
    expect(unwrap(rows[0].expression)).toContain("FILTER (WHERE s = 'won')");
    expect(unwrap(rows[1].key)).toBe("open_tickets");
  });
});

describe("validateMetricRow", () => {
  const base = {
    key: "'mrr'",
    name: "'Monthly Recurring Revenue'",
    grain: "'company/monthly'",
    unit: "'usd'",
    expression: "'SELECT 1 AS value'",
    owner: "'finance'",
    data_class: "'financial'",
  };

  it("accepts a well-formed bound row", () => {
    expect(validateMetricRow(base)).toEqual([]);
  });

  it("rejects an out-of-taxonomy unit", () => {
    const errs = validateMetricRow({ ...base, unit: "'dollars'" });
    expect(errs.some((e) => e.includes("unit 'dollars'"))).toBe(true);
  });

  it("rejects an out-of-taxonomy data_class", () => {
    const errs = validateMetricRow({ ...base, data_class: "'secret'" });
    expect(errs.some((e) => e.includes("data_class 'secret'"))).toBe(true);
  });

  it("rejects an executable SELECT that does not project AS value", () => {
    const errs = validateMetricRow({ ...base, expression: "'SELECT COUNT(*) FROM ticket'" });
    expect(errs.some((e) => e.includes("AS value"))).toBe(true);
  });

  it("allows an unbound definitional fragment (no leading SELECT)", () => {
    const errs = validateMetricRow({
      ...base,
      expression: "'(revenue - cost) / NULLIF(revenue, 0) * 100'",
    });
    expect(errs).toEqual([]);
  });

  it("requires a key", () => {
    const errs = validateMetricRow({ ...base, key: null });
    expect(errs.some((e) => e.includes("key is required"))).toBe(true);
  });
});

describe("the #1114 metric-expansion migration conforms to the contract", () => {
  it("every seeded row in the metric-expansion migration is valid", async () => {
    const files = await readdir(MIGRATIONS_DIR);
    // Located by content, not number — the migration number is claimed at merge (§10.3).
    let target = null;
    let sql = "";
    for (const f of files.filter((f) => f.endsWith(".sql"))) {
      const text = await readFile(`${MIGRATIONS_DIR}${f}`, "utf8");
      if (
        /INSERT\s+INTO\s+metric_definition/i.test(stripSqlComments(text)) &&
        /new_business_mrr/.test(text)
      ) {
        target = f;
        sql = text;
        break;
      }
    }
    expect(target, "metric-expansion migration (seeds new_business_mrr) not found").toBeTruthy();

    const { rows, errors } = validateMetricSeedSql(sql);
    expect(errors).toEqual([]);
    expect(rows.length).toBe(7); // the seven new governed contracts

    // The whole new seed set is bound (executable) — no row is a bare fragment.
    for (const r of rows) {
      const expr = unwrap(r.expression);
      expect(expr, `${unwrap(r.key)} should be a bound SELECT … AS value`).toMatch(
        /^\s*select[\s\S]*\bas\s+value\b/i,
      );
      expect(VALID_UNITS).toContain(unwrap(r.unit));
      expect(VALID_DATA_CLASSES).toContain(unwrap(r.data_class));
    }
  });
});
