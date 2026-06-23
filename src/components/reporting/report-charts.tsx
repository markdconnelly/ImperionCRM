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
import type { CountDatum, StageValueDatum } from "@/types";

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

const STAGE_COLORS: Record<string, string> = {
  lead: "#5B8DEF",
  qualified: "#7C6BF0",
  proposal: "#E0A33E",
  won: "#3FBF8F",
  lost: "#E2615A",
};

const humanize = (v: string) => v.replace(/_/g, " ");

/** Open-pipeline deal counts by sales stage, colored per stage. */
export function StagePipelineChart({ data }: { data: StageValueDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="stage"
          stroke={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          tickFormatter={humanize}
          fontSize={12}
        />
        <YAxis stroke={AXIS} tickLine={false} axisLine={false} allowDecimals={false} fontSize={12} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: CURSOR }} />
        {/* isAnimationActive={false}: under recharts 3 + React 19 the enter
            animation can leave bars stuck at zero height (axes draw, bars don't —
            #1139). Disabling it renders bars at full height immediately, matching
            the working charts in agile-charts/forecast-charts. */}
        <Bar dataKey="count" name="Deals" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.stage} fill={STAGE_COLORS[d.stage] ?? "#5B8DEF"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Generic categorical counts (proposals/projects by status). */
export function StatusBarChart({ data, color }: { data: CountDatum[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          stroke={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          tickFormatter={humanize}
          fontSize={12}
        />
        <YAxis stroke={AXIS} tickLine={false} axisLine={false} allowDecimals={false} fontSize={12} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: CURSOR }} />
        {/* isAnimationActive={false}: see StagePipelineChart — recharts 3 + React 19
            leaves animated bars at zero height (#1139). */}
        <Bar dataKey="count" name="Count" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
