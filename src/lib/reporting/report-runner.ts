/**
 * Report runner — executes a *validated* report selection over an in-memory row set
 * (ADR-0075 §4 "render through the existing surface"; #411).
 *
 * ADR-0075 chose a governed semantic model as the ONLY query surface and "the read
 * model, not ad-hoc table scans, backs reports" (decision §5). So there is **no
 * dynamic SQL** here: the curated per-object reads (`curated-sources.ts`) hand this
 * runner a flat row set keyed by registry field keys, and the runner does the
 * projection / grouping / aggregation in memory. That keeps the self-serve query
 * surface incapable of touching anything the registry does not already expose, and
 * incapable of issuing an arbitrary scan against prod PII.
 *
 * The runner takes the selection **after** `validateReportSelection` has RBAC-stripped
 * it (ADR-0075 §2), so every field it sees is one the caller may read — it never
 * re-checks grants.
 *
 * Query-cost guardrails (ADR-0075 §5, #413) are enforced here, read from the per-object
 * {@link objectGuardrail} registry metadata — never an arbitrary limit baked into the runner:
 *   - **Detail-row cap** — detail output is capped at the object's `maxDetailRows` (default
 *     {@link MAX_DETAIL_ROWS}) and flagged `truncated` (never silently — ADR-0075 §5).
 *   - **Required-filter gate** — a high-cardinality object (e.g. contact, ticket) BLOCKS an
 *     unfiltered detail scan: with no effective filter the runner returns an empty, blocked
 *     result *without scanning*. Aggregate (group_by / measure) reports are exempt — they
 *     collapse the scan to bounded buckets, so the expensive detail-dump shape never arises.
 *
 * PURE / edge-safe: imports only the registry (no pg, no node:*, no env), so it is
 * unit-tested directly — mirroring `semantic-model.ts` and `policy.ts`.
 */
import type { Aggregation, ReportSelection } from "@/lib/reporting/semantic-model";
import {
  getReportableObject,
  objectGuardrail,
  DEFAULT_MAX_DETAIL_ROWS,
} from "@/lib/reporting/semantic-model";

/** A scalar cell in a loaded/aggregated report row. */
export type ReportCellValue = string | number | null;

/** A loaded source row OR an output row — keyed by registry field key (or column key). */
export type ReportRow = Record<string, ReportCellValue>;

/** One output column: the field/measure key, a human label, and how it was rolled up. */
export interface ReportColumn {
  key: string;
  label: string;
  /** `none` = a raw dimension/detail column; otherwise the applied aggregation. */
  aggregation: Aggregation;
  /** True for a numeric/currency measure column — drives right-alignment + charting. */
  numeric: boolean;
}

/** The guardrail state applied to a run (ADR-0075 §5, #413) — surfaced so the UI is honest. */
export interface ReportGuardrailState {
  /** The effective per-object detail-row cap that was in force. */
  maxDetailRows: number;
  /** Whether this object requires a filter for a detail report (high-cardinality). */
  requiresFilter: boolean;
  /**
   * Set when the run was BLOCKED before scanning (the required-filter gate tripped); `null`
   * when the report ran. A blocked result carries the intended columns but zero rows.
   */
  blockedReason: string | null;
}

/** The executed result: typed columns + shaped rows, with an honest truncation flag. */
export interface ReportResult {
  columns: ReportColumn[];
  rows: ReportRow[];
  /** Rows AFTER shaping (groups in aggregate mode; detail rows otherwise). */
  rowCount: number;
  /** Source rows scanned (before grouping) — surfaced so the UI can show "of N". */
  sourceCount: number;
  /** True when detail output was capped at the object's `maxDetailRows` (no silent truncation). */
  truncated: boolean;
  /** Guardrail state for this run (ADR-0075 §5, #413) — caps applied + any block reason. */
  guardrail: ReportGuardrailState;
}

/** Default detail-row cap when an object declares no per-object override (ADR-0075 §5). */
export const MAX_DETAIL_ROWS = DEFAULT_MAX_DETAIL_ROWS;

/** A filter the builder may apply: equality / contains / numeric & date comparisons. */
export type FilterOp = "eq" | "contains" | "gt" | "lt";

/** One filter clause against a selected field. */
export interface ReportFilter {
  field: string;
  op: FilterOp;
  value: string;
}

const isNumeric = (v: ReportCellValue): v is number => typeof v === "number" && !Number.isNaN(v);

/** Coerce a cell to a number for sum/avg/numeric-min/max; null when not numeric. */
function toNumber(v: ReportCellValue): number | null {
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** Apply one filter clause to a row (string-insensitive contains; numeric gt/lt when both sides parse). */
function rowMatchesFilter(row: ReportRow, f: ReportFilter): boolean {
  const cell = row[f.field] ?? null;
  switch (f.op) {
    case "eq":
      return String(cell ?? "").toLowerCase() === f.value.toLowerCase();
    case "contains":
      return String(cell ?? "").toLowerCase().includes(f.value.toLowerCase());
    case "gt":
    case "lt": {
      const a = toNumber(cell);
      const b = toNumber(f.value);
      if (a != null && b != null) return f.op === "gt" ? a > b : a < b;
      // Fall back to lexical compare (dates as yyyy-mm-dd sort correctly).
      const sa = String(cell ?? "");
      return f.op === "gt" ? sa > f.value : sa < f.value;
    }
    default:
      return true;
  }
}

/** Aggregate a column of cells per the chosen aggregation. */
function aggregate(agg: Aggregation, cells: ReportCellValue[]): ReportCellValue {
  const present = cells.filter((c) => c !== null && c !== "");
  switch (agg) {
    case "count":
      return present.length;
    case "sum": {
      const nums = present.map(toNumber).filter(isNumeric);
      return nums.reduce((a, b) => a + b, 0);
    }
    case "avg": {
      const nums = present.map(toNumber).filter(isNumeric);
      if (nums.length === 0) return null;
      return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
    }
    case "min":
    case "max": {
      if (present.length === 0) return null;
      const nums = present.map(toNumber).filter(isNumeric);
      // Numeric min/max when every present cell is numeric; lexical otherwise (ISO dates ok).
      if (nums.length === present.length) {
        return agg === "min" ? Math.min(...nums) : Math.max(...nums);
      }
      const strs = present.map((c) => String(c)).sort();
      return agg === "min" ? strs[0] : strs[strs.length - 1];
    }
    case "none":
    default:
      return present.length ? present[0] : null;
  }
}

/**
 * Execute a validated selection over `sourceRows`. Two modes:
 *   - **Aggregate** (group_by present, or any field aggregation ≠ `none`): group by the
 *     group_by dimensions and roll up each measure. Columns = dimensions then measures.
 *   - **Detail** (no group_by and every aggregation is `none`): project the selected
 *     fields per row, capped at the object's `maxDetailRows`.
 *
 * Guardrails (ADR-0075 §5, #413): a detail report over a `requiresFilter` object with no
 * effective filter is BLOCKED before scanning; detail output is capped per-object and flagged.
 *
 * `selection` MUST be the registry-validated, RBAC-stripped selection
 * (`validateReportSelection(...).selection`) — every field is assumed allowed.
 */
export function runReport(
  selection: ReportSelection,
  sourceRows: readonly ReportRow[],
  filters: readonly ReportFilter[] = [],
): ReportResult {
  const obj = getReportableObject(selection.root_object);
  const labelOf = (key: string) => obj?.fields.find((f) => f.key === key)?.label ?? key;
  const typeOf = (key: string) => obj?.fields.find((f) => f.key === key)?.type;
  const isMeasureType = (key: string) => {
    const t = typeOf(key);
    return t === "number" || t === "currency";
  };

  const { maxDetailRows, requiresFilter } = objectGuardrail(selection.root_object);

  // Only filters on selected fields are honoured (the builder offers no others) — so an
  // "effective" filter is one whose field is in the selection. That same set decides both
  // the actual row filtering and the required-filter gate below.
  const selectedKeys = new Set(selection.fields.map((f) => f.field));
  const effectiveFilters = filters.filter((f) => selectedKeys.has(f.field));

  const groupBy = selection.group_by ?? [];
  const measures = selection.fields.filter((f) => f.aggregation !== "none");
  const aggregateMode = groupBy.length > 0 || measures.length > 0;

  if (!aggregateMode) {
    // Detail projection — selected fields, one output row per source row.
    const columns: ReportColumn[] = selection.fields.map((f) => ({
      key: f.field,
      label: labelOf(f.field),
      aggregation: "none",
      numeric: isMeasureType(f.field),
    }));

    // Required-filter gate: block an unfiltered full detail scan of a high-cardinality
    // object — return empty + a reason WITHOUT scanning (ADR-0075 §5: blocked, visible).
    if (requiresFilter && effectiveFilters.length === 0) {
      return {
        columns,
        rows: [],
        rowCount: 0,
        sourceCount: 0,
        truncated: false,
        guardrail: {
          maxDetailRows,
          requiresFilter,
          blockedReason: `A detail report on ${obj?.label ?? selection.root_object} must include at least one filter — an unfiltered scan is blocked. Add a filter, or group/aggregate instead.`,
        },
      };
    }

    const rows = sourceRows.filter((r) => effectiveFilters.every((f) => rowMatchesFilter(r, f)));
    const capped = rows.slice(0, maxDetailRows);
    const outRows = capped.map((r) => {
      const out: ReportRow = {};
      for (const f of selection.fields) out[f.field] = r[f.field] ?? null;
      return out;
    });
    return {
      columns,
      rows: outRows,
      rowCount: outRows.length,
      sourceCount: rows.length,
      truncated: rows.length > maxDetailRows,
      guardrail: { maxDetailRows, requiresFilter, blockedReason: null },
    };
  }

  // Aggregate mode — exempt from the required-filter gate (rows collapse to bounded buckets).
  const rows = sourceRows.filter((r) => effectiveFilters.every((f) => rowMatchesFilter(r, f)));

  // Aggregate mode — dimensions = group_by; measures = fields with a real aggregation.
  const dimColumns: ReportColumn[] = groupBy.map((k) => ({
    key: k,
    label: labelOf(k),
    aggregation: "none",
    numeric: isMeasureType(k),
  }));
  const measureColumns: ReportColumn[] = measures.map((m) => ({
    key: `${m.field}__${m.aggregation}`,
    label: `${labelOf(m.field)} (${m.aggregation})`,
    aggregation: m.aggregation,
    numeric: m.aggregation !== "min" && m.aggregation !== "max" ? true : isMeasureType(m.field),
  }));

  // Bucket rows by their dimension tuple (a single grand-total bucket when no group_by).
  const buckets = new Map<string, { dims: ReportCellValue[]; rows: ReportRow[] }>();
  for (const r of rows) {
    const dims = groupBy.map((k) => r[k] ?? null);
    const key = groupBy.length ? dims.map((d) => String(d ?? "∅")).join(" ") : "__all__";
    let b = buckets.get(key);
    if (!b) {
      b = { dims, rows: [] };
      buckets.set(key, b);
    }
    b.rows.push(r);
  }

  const outRows: ReportRow[] = [];
  for (const b of buckets.values()) {
    const out: ReportRow = {};
    groupBy.forEach((k, i) => {
      out[k] = b.dims[i];
    });
    for (const m of measures) {
      const cells = b.rows.map((r) => r[m.field] ?? null);
      out[`${m.field}__${m.aggregation}`] = aggregate(m.aggregation, cells);
    }
    outRows.push(out);
  }

  // Stable order: by the first measure descending when present, else by first dimension.
  if (measureColumns.length) {
    const k = measureColumns[0].key;
    outRows.sort((a, b) => (toNumber(b[k]) ?? -Infinity) - (toNumber(a[k]) ?? -Infinity));
  } else if (dimColumns.length) {
    const k = dimColumns[0].key;
    outRows.sort((a, b) => String(a[k] ?? "").localeCompare(String(b[k] ?? "")));
  }

  return {
    columns: [...dimColumns, ...measureColumns],
    rows: outRows,
    rowCount: outRows.length,
    sourceCount: rows.length,
    truncated: false,
    guardrail: { maxDetailRows, requiresFilter, blockedReason: null },
  };
}
