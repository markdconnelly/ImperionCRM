import Link from "next/link";
import { cn } from "@/lib/cn";
import { Scorecard } from "@/components/assessments/scorecard";
import type { AssessmentRow } from "@/types";

const statusTone: Record<string, string> = {
  proposed: "text-dim",
  scheduled: "text-accent",
  in_progress: "text-amber",
  delivered: "text-green",
  closed: "text-dim",
};

export function AssessmentsTable({
  assessments,
  deleteAction,
}: {
  assessments: AssessmentRow[];
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  if (assessments.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel px-4 py-8 text-center text-sm text-dim">
        No assessments yet. Every relationship starts with an AI Security Readiness
        Assessment — create one to get started.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {assessments.map((a) => (
        <div key={a.id} className="rounded-lg border border-border bg-panel p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{a.name}</div>
              <div className="mt-0.5 text-xs text-dim">
                {a.account}
                <span className={cn("ml-2", statusTone[a.status] ?? "text-dim")}>
                  · {a.status.replace(/_/g, " ")}
                </span>
                {a.fee !== "—" && <span className="ml-2">· {a.fee} fee</span>}
                {a.kickoff && <span className="ml-2">· kickoff {a.kickoff}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link href={`/assessments/${a.id}/edit`} className="text-dim hover:text-text">
                Edit
              </Link>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="text-dim hover:text-red">
                  Delete
                </button>
              </form>
            </div>
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <Scorecard scores={a.scores} />
          </div>
        </div>
      ))}
    </div>
  );
}
