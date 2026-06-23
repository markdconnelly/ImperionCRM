// metric-seed-contract.mjs — parse + validate the `metric_definition` seed rows in a
// migration file against the governed-metric contract (#1114, epic #1050).
//
// WHY. `metric_definition` is the headless-BI contract (one governed row per business
// number). Its seeds are hand-authored SQL; a typo in a `unit`, a non-taxonomy `data_class`,
// or a "bound" expression that is actually a definitional fragment would silently corrupt the
// contract the metric engine (#259) binds and the BI hub (#288) reads. This validator parses
// the `INSERT INTO metric_definition … VALUES (…)` tuples out of a migration's SQL and checks
// each row's shape — a pure, DB-free guard the unit suite (and CI) can run. It does NOT
// execute SQL; it asserts contract conformance only.

// The allowed value sets, mirrored from the 0159 CHECK + the documented unit vocabulary.
export const VALID_UNITS = ["usd", "percent", "count", "hours", "ratio"];
export const VALID_DATA_CLASSES = [
  "operational",
  "financial",
  "people_hr",
  "security_credentials",
  "client_pii",
];

/** Strip `-- line` and block comments so prose in a migration never parses as a row. */
export function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

/**
 * Extract the row tuples from the FIRST `INSERT INTO metric_definition (…columns…) VALUES …`
 * statement in `sql`. Returns an array of objects keyed by the insert's column list. Only the
 * column order declared in the INSERT is assumed (matches the 0159/0188 seed shape).
 */
export function parseMetricSeedRows(sql) {
  const clean = stripSqlComments(sql);
  // Match the column list + the VALUES keyword only; the body is consumed by the
  // string/paren-aware scanner below (a regex terminator is unsafe — a `;` inside a
  // description string literal would truncate it). `body` runs to end-of-string; the scanner
  // stops collecting once it hits a top-level `ON CONFLICT` / `RETURNING` / `;` trailer.
  const insert = clean.match(/INSERT\s+INTO\s+metric_definition\s*\(([^)]*)\)\s*VALUES\b/i);
  if (!insert) return [];
  const columns = insert[1].split(",").map((c) => c.trim());
  const body = clean.slice(insert.index + insert[0].length);

  // Split the VALUES body into top-level (…) tuples, respecting single-quoted strings
  // (doubled '' escapes) and nested parens inside an expression. At depth 0 (between
  // tuples) a `;` or an `ON CONFLICT` / `RETURNING` keyword ends the statement.
  const rows = [];
  let depth = 0;
  let inStr = false;
  let cur = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      cur += ch;
      if (ch === "'") {
        if (body[i + 1] === "'") {
          cur += body[++i]; // escaped quote
        } else {
          inStr = false;
        }
      }
      continue;
    }
    if (ch === "'") {
      inStr = true;
      cur += ch;
    } else if (ch === "(") {
      if (depth > 0) cur += ch;
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth === 0) {
        rows.push(splitTuple(cur));
        cur = "";
      } else {
        cur += ch;
      }
    } else if (depth === 0) {
      // Between tuples: a `;` or the ON CONFLICT / RETURNING trailer ends the statement.
      if (ch === ";") break;
      if (/[a-z]/i.test(ch)) {
        const rest = body.slice(i);
        if (/^on\s+conflict\b/i.test(rest) || /^returning\b/i.test(rest)) break;
      }
    } else {
      cur += ch;
    }
  }

  return rows.map((vals) => {
    const row = {};
    columns.forEach((col, idx) => {
      row[col] = vals[idx];
    });
    return row;
  });
}

/** Split one tuple's comma-separated values at top level (respecting quotes + parens). */
function splitTuple(tuple) {
  const out = [];
  let depth = 0;
  let inStr = false;
  let cur = "";
  for (let i = 0; i < tuple.length; i++) {
    const ch = tuple[i];
    if (inStr) {
      cur += ch;
      if (ch === "'") {
        if (tuple[i + 1] === "'") cur += tuple[++i];
        else inStr = false;
      }
      continue;
    }
    if (ch === "'") {
      inStr = true;
      cur += ch;
    } else if (ch === "(") {
      depth++;
      cur += ch;
    } else if (ch === ")") {
      depth--;
      cur += ch;
    } else if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Unwrap a SQL string literal (`'…'` with `''` escapes) to its JS string, or null for NULL. */
export function unwrap(literal) {
  if (literal == null) return null;
  const t = literal.trim();
  if (/^null$/i.test(t)) return null;
  if (t.startsWith("'") && t.endsWith("'")) {
    return t.slice(1, -1).replace(/''/g, "'");
  }
  return t;
}

/**
 * Validate one parsed seed row against the metric contract. Returns an array of error
 * strings (empty = valid). A "bound" expression (one the engine executes) must be a
 * single-scalar `SELECT … AS value` read; an unbound definitional fragment is allowed but
 * must NOT masquerade as executable (no leading SELECT without the `AS value` projection).
 */
export function validateMetricRow(row) {
  const errs = [];
  const key = unwrap(row.key);
  const name = unwrap(row.name);
  const grain = unwrap(row.grain);
  const unit = unwrap(row.unit);
  const owner = unwrap(row.owner);
  const dataClass = unwrap(row.data_class);
  const expr = unwrap(row.expression);
  const label = key || "(missing key)";

  if (!key) errs.push(`${label}: key is required (NOT NULL UNIQUE)`);
  if (!name) errs.push(`${label}: name is required`);
  if (!grain) errs.push(`${label}: grain is required`);
  if (!owner) errs.push(`${label}: owner should be set (accountable role/team)`);

  if (!unit) errs.push(`${label}: unit is required`);
  else if (!VALID_UNITS.includes(unit))
    errs.push(`${label}: unit '${unit}' not in [${VALID_UNITS.join(", ")}]`);

  if (!dataClass) errs.push(`${label}: data_class is required`);
  else if (!VALID_DATA_CLASSES.includes(dataClass))
    errs.push(`${label}: data_class '${dataClass}' not in the #1034 taxonomy`);

  // Expression shape: a row that opens with SELECT is a "bound" executable scalar and MUST
  // project `AS value` (the engine reads the single `value` column). A non-SELECT fragment is
  // a legitimate unbound definition (engine returns status 'unbound') — not validated further.
  if (expr && /^\s*select\b/i.test(expr) && !/\bas\s+value\b/i.test(expr)) {
    errs.push(`${label}: executable expression must project a single 'AS value' scalar`);
  }

  return errs;
}

/** Validate every seed row in a migration's SQL. Returns { rows, errors }. */
export function validateMetricSeedSql(sql) {
  const rows = parseMetricSeedRows(sql);
  const errors = rows.flatMap(validateMetricRow);
  return { rows, errors };
}
