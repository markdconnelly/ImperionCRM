import type { EnrollmentRow } from "@/types";

const STATUS_TONE: Record<string, string> = {
  active: "text-green",
  completed: "text-dim",
  exited: "text-amber",
};

export function EnrollmentsTable({
  enrollments,
  exitAction,
}: {
  enrollments: EnrollmentRow[];
  exitAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dim">
              <th className="px-4 py-2 font-medium">Contact</th>
              <th className="px-4 py-2 font-medium">Workflow</th>
              <th className="px-4 py-2 font-medium">Step</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Enrolled</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e.id} className="border-t border-border hover:bg-panel-2">
                <td className="px-4 py-3 font-medium">{e.contact ?? "—"}</td>
                <td className="px-4 py-3 text-dim">{e.workflow}</td>
                <td className="px-4 py-3 text-dim">{e.currentStep}</td>
                <td className={`px-4 py-3 ${STATUS_TONE[e.status] ?? "text-dim"}`}>{e.status}</td>
                <td className="px-4 py-3 text-dim">{e.enrolledAt ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {e.status === "active" && (
                    <form action={exitAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="text-dim hover:text-amber">
                        Exit
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {enrollments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-dim">
                  No active enrollments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
