import type { PipelineColumn } from "@/types";

export function PipelineStrip({ pipeline }: { pipeline: PipelineColumn[] }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <h2 className="mb-3 font-display text-sm font-semibold tracking-tight">
        Pipeline
      </h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {pipeline.map((col) => (
          <div
            key={col.stage}
            className="rounded-md border border-border bg-panel-2 p-3"
          >
            <div className="text-xs text-dim">{col.stage}</div>
            <div className="mt-2 font-display text-xl font-semibold">
              {col.count}
            </div>
            <div className="mt-0.5 text-xs text-dim">{col.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
