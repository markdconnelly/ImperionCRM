import { cn } from "@/lib/cn";
import type { Kpi } from "@/types";

const toneClass = {
  up: "text-green",
  down: "text-red",
  neutral: "text-dim",
} as const;

export function KpiRow({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="rounded-lg border border-border bg-panel p-4"
        >
          <div className="text-xs text-dim">{k.label}</div>
          <div className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {k.value}
          </div>
          {k.delta && (
            <div
              className={cn(
                "mt-1 text-xs",
                toneClass[k.deltaTone ?? "neutral"]
              )}
            >
              {k.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
