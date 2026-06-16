"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BurndownPoint, SprintVelocityRow } from "@/types";

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

/** Short day label (e.g. "Jun 3") from a yyyy-mm-dd key. */
const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/**
 * Sprint burndown (C5, ADR-0066, #345): the ideal straight line (total effort →
 * 0 across the sprint window) against the actual remaining effort derived from
 * task completions. The actual line stops at today (future days are null → the
 * line ends rather than implying zero work remains). `unit` labels the Y axis.
 */
export function BurndownChart({
  data,
  unit,
}: {
  data: BurndownPoint[];
  unit: string | null;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          stroke={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          fontSize={11}
          minTickGap={16}
          tickFormatter={dayLabel}
        />
        <YAxis
          stroke={AXIS}
          tickLine={false}
          axisLine={false}
          fontSize={12}
          allowDecimals={false}
          width={44}
          label={
            unit
              ? { value: unit, angle: -90, position: "insideLeft", fill: AXIS, fontSize: 11 }
              : undefined
          }
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ stroke: GRID }}
          labelFormatter={(d) => dayLabel(String(d))}
          formatter={(v, name) => [v == null ? "—" : v, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: AXIS }} />
        <Line
          type="monotone"
          dataKey="ideal"
          name="Ideal"
          stroke="#8A93A6"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="remaining"
          name="Remaining"
          stroke="#5B8DEF"
          strokeWidth={2}
          dot={{ r: 2, fill: "#5B8DEF" }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Velocity datum the chart consumes (one bar group per sprint). */
export interface VelocityDatum {
  name: string;
  committed: number;
  completed: number;
}

/**
 * Sprint velocity (C5, #345): committed vs completed effort per sprint, oldest →
 * newest left-to-right (the read returns completed-first, so the page reverses for
 * chronological display). Completed in accent-green, committed as the lighter target.
 */
export function VelocityChart({ data }: { data: VelocityDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="name"
          stroke={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          fontSize={11}
          interval={0}
        />
        <YAxis stroke={AXIS} tickLine={false} axisLine={false} allowDecimals={false} fontSize={12} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: CURSOR }} />
        <Legend wrapperStyle={{ fontSize: 12, color: AXIS }} />
        <Bar dataKey="committed" name="Committed" fill="#2A3346" radius={[4, 4, 0, 0]} />
        <Bar dataKey="completed" name="Completed" fill="#3FBF8F" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Re-export so a page can pass the read row straight through. */
export type { SprintVelocityRow };
