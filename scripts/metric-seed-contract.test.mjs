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

describe("the #1116 profitability/ROI migration conforms to the contract", () => {
  it("every seeded profitability/ROI row is a valid bound contract", async () => {
    const files = await readdir(MIGRATIONS_DIR);
    // Located by content, not number — the migration number is claimed at merge (§10.3).
    // `recognized_revenue` is unique to the #1116 slice.
    let target = null;
    let sql = "";
    for (const f of files.filter((f) => f.endsWith(".sql"))) {
      const text = await readFile(`${MIGRATIONS_DIR}${f}`, "utf8");
      if (
        /INSERT\s+INTO\s+metric_definition/i.test(stripSqlComments(text)) &&
        /recognized_revenue/.test(text)
      ) {
        target = f;
        sql = text;
        break;
      }
    }
    expect(target, "profitability/ROI migration (seeds recognized_revenue) not found").toBeTruthy();

    const { rows, errors } = validateMetricSeedSql(sql);
    expect(errors).toEqual([]);
    expect(rows.length).toBe(5); // the five new profitability + ROI contracts

    // The slice wires the profitability (#1044) + ROI (#1048) numbers onto the governed store.
    const keys = rows.map((r) => unwrap(r.key));
    expect(keys).toEqual([
      "recognized_revenue",
      "gross_profit",
      "effective_hourly_rate",
      "agent_tickets_worked",
      "agent_cost_per_run",
    ]);

    // Every row is a bound (executable) SELECT … AS value scalar — none is a bare fragment,
    // so the metric engine (#259) and the #1115 query interface resolve them with no further
    // binding. This is what makes profitability/ROI consume the governed path, not an ad-hoc one.
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

describe("the #1091 cost-allocation migration conforms to the contract", () => {
  it("seeds the two bound cost-to-serve contracts, financial + usd", async () => {
    const files = await readdir(MIGRATIONS_DIR);
    // Located by content, not number — the migration number is claimed at merge (§10.3).
    // `labor_cost_to_serve` is unique to the #1091 cost-allocation slice.
    let target = null;
    let sql = "";
    for (const f of files.filter((f) => f.endsWith(".sql"))) {
      const text = await readFile(`${MIGRATIONS_DIR}${f}`, "utf8");
      if (
        /INSERT\s+INTO\s+metric_definition/i.test(stripSqlComments(text)) &&
        /labor_cost_to_serve/.test(text)
      ) {
        target = f;
        sql = text;
        break;
      }
    }
    expect(target, "cost-allocation migration (seeds labor_cost_to_serve) not found").toBeTruthy();

    const { rows, errors } = validateMetricSeedSql(sql);
    expect(errors).toEqual([]);
    expect(rows.length).toBe(2); // labor cost + total cost-to-serve

    // The cost-allocation model (#1091) gives the profitability metrics a real labor basis.
    const keys = rows.map((r) => unwrap(r.key));
    expect(keys).toEqual(["labor_cost_to_serve", "cost_to_serve"]);

    // Both are bound (executable) money scalars the metric engine (#259) resolves — the labor
    // dollar lives ONLY here (the sole pay_rate reader), never in the broadly-granted view.
    for (const r of rows) {
      const expr = unwrap(r.expression);
      expect(expr, `${unwrap(r.key)} should be a bound SELECT … AS value`).toMatch(
        /^\s*select[\s\S]*\bas\s+value\b/i,
      );
      expect(unwrap(r.unit)).toBe("usd");
      expect(unwrap(r.data_class)).toBe("financial");
    }
  });
});
