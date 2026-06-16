"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Design tokens (CLAUDE.md §6) — recharts needs explicit colors, not CSS classes.
const AXIS = "#8A93A6";
const GRID = "#1E2636";
const CURSOR = "rgba(91, 141, 239, 0.08)";
const tooltipStyle = {
  background: "#151B28",
  border: "1px solid #1E2636",
  borderRadius: 8,
  color: "#E6EAF2",
  fontSize: 12,
} as const;

// Conservative → optimistic, with closed-won as the realised floor.
const SCENARIO_COLORS: Record<string, string> = {
  "Closed-won": "#3FBF8F",
  Weighted: "#5B8DEF",
  Commit: "#3FBF8F",
  "+ Best case": "#E0A33E",
  "+ Pipeline": "#7C6BF0",
};

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export interface ScenarioDatum {
  label: string;
  value: number;
}

/**
 * The forecast scenarios side by side (ADR-0072 decision 3): the realised
 * closed-won floor, the weighted (Σ value×probability) pipeline-health number,
 * and the cumulative category ladder commit → +best_case → +pipeline.
 */
export function ForecastScenarioChart({ data }: { data: ScenarioDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          stroke={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          fontSize={11}
          interval={0}
        />
        <YAxis
          stroke={AXIS}
          tickLine={false}
          axisLine={false}
          fontSize={12}
          tickFormatter={(v: number) => usdCompact.format(v)}
          width={56}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: CURSOR }}
          formatter={(v) => [usdCompact.format(Number(v) || 0), "Forecast"]}
        />
        <Bar dataKey="value" name="Forecast" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.label} fill={SCENARIO_COLORS[d.label] ?? "#5B8DEF"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** A slim attainment bar: closed-won vs quota, capped visually at 100%+. */
export function AttainmentBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(pct, 1.5));
  const widthPct = Math.min(clamped / 1.5, 1) * 100;
  const color = pct >= 1 ? "#3FBF8F" : pct >= 0.6 ? "#E0A33E" : "#E2615A";
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-panel-2"
      role="img"
      aria-label={`${Math.round(pct * 100)}% of quota attained`}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${widthPct}%`, backgroundColor: color }}
      />
    </div>
  );
}
