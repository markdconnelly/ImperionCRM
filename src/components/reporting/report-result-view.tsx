"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportColumn, ReportResult } from "@/lib/reporting/report-runner";

/**
 * Renders an executed {@link ReportResult} (ADR-0075 §4, #411): always a table, plus a
 * Recharts bar/line chart when `viz` asks for one and the result has a categorical
 * dimension + a numeric measure. Reuses the reporting design tokens (CLAUDE.md §6) —
 * Recharts needs explicit colors. Truncation is shown, never silent (ADR-0075 §5).
 */
const AXIS = "#8A93A6";
const GRID = "#1E2636";
const CURSOR = "rgba(91, 141, 239, 0.08)";
const ACCENT = "#5B8DEF";
const tooltipStyle = {
  background: "#151B28",
  border: "1px solid #1E2636",
  borderRadius: 8,
  color: "#E6EAF2",
  fontSize: 12,
} as const;

const fmt = new Intl.NumberFormat("en-US");

function cell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return fmt.format(v);
  return String(v);
}

/** First non-numeric column = chart category; first numeric column = chart measure. */
function chartAxes(columns: ReportColumn[]): { x: ReportColumn; y: ReportColumn } | null {
  const x = columns.find((c) => !c.numeric);
  const y = columns.find((c) => c.numeric);
  if (!x || !y) return null;
  return { x, y };
}

export function ReportResultView({
  result,
  viz,
}: {
  result: ReportResult;
  viz: string;
}) {
  if (result.rows.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-panel p-8 text-center text-sm text-dim">
        No rows match this report.
      </p>
    );
  }

  const axes = viz === "bar" || viz === "line" ? chartAxes(result.columns) : null;
  const chartData = axes
    ? result.rows.map((r) => ({
        label: cell(r[axes.x.key]),
        value: typeof r[axes.y.key] === "number" ? (r[axes.y.key] as number) : 0,
      }))
    : null;

  return (
    <div className="flex flex-col gap-3">
      {chartData && axes && (
        <div className="rounded-lg border border-border bg-panel p-4">
          <div className="mb-3 text-xs text-dim">
            {axes.y.label} by {axes.x.label}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            {viz === "line" ? (
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" stroke={AXIS} tickLine={false} axisLine={{ stroke: GRID }} fontSize={12} />
                <YAxis stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: CURSOR }} />
                <Line type="monotone" dataKey="value" name={axes.y.label} stroke={ACCENT} strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="label" stroke={AXIS} tickLine={false} axisLine={{ stroke: GRID }} fontSize={12} />
                <YAxis stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: CURSOR }} />
                <Bar dataKey="value" name={axes.y.label} fill={ACCENT} radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-panel">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-dim">
            <tr>
              {result.columns.map((c) => (
                <th key={c.key} className={`px-3 py-2 font-medium ${c.numeric ? "text-right" : ""}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r, i) => (
              <tr key={i} className="border-t border-border/60">
                {result.columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 ${c.numeric ? "text-right tabular-nums" : ""}`}>
                    {cell(r[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-dim">
        {result.rowCount} {result.rowCount === 1 ? "row" : "rows"}
        {result.sourceCount !== result.rowCount && ` · ${result.sourceCount} scanned`}
        {result.truncated && ` · capped at ${result.rowCount} (refine filters to see all)`}
      </p>
    </div>
  );
}
