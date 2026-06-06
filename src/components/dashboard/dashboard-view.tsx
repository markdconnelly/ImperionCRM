import { KpiRow } from "@/components/dashboard/kpi-row";
import { PipelineStrip } from "@/components/dashboard/pipeline-strip";
import { AttentionTable } from "@/components/dashboard/attention-table";

export function DashboardView() {
  return (
    <div className="flex flex-col gap-4">
      <KpiRow />
      <PipelineStrip />
      <AttentionTable />
    </div>
  );
}
