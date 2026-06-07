import type { WorkflowRow } from "@/types";

const KIND_LABEL: Record<string, string> = {
  nurture: "Nurture",
  pre_discovery: "Pre-discovery",
  re_engagement: "Re-engagement",
};

export function WorkflowsTable({ workflows }: { workflows: WorkflowRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Workflow</th>
              <th className="px-4 py-2 font-medium">Kind</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Steps</th>
              <th className="px-4 py-2 font-medium">Active enrollments</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((w) => (
              <tr key={w.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">{w.name}</td>
                <td className="px-4 py-3 text-dim">{KIND_LABEL[w.kind] ?? w.kind}</td>
                <td className={`px-4 py-3 ${w.status === "active" ? "text-green" : "text-dim"}`}>
                  {w.status}
                </td>
                <td className="px-4 py-3 text-dim">{w.stepCount}</td>
                <td className="px-4 py-3 text-dim">{w.activeEnrollments}</td>
              </tr>
            ))}
            {workflows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-dim">
                  No workflows yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
