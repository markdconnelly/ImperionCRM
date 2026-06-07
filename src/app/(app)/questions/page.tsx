import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";
import type { QuestionRow } from "@/types";

function QuestionSet({ kind, title, questions }: { kind: string; title: string; questions: QuestionRow[] }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold tracking-tight">{title}</h2>
        <Link
          href={`/questions/new?kind=${kind}`}
          className="rounded-md border border-border px-2.5 py-1 text-xs text-dim hover:text-text"
        >
          + Add question
        </Link>
      </div>
      <div className="rounded-lg border border-border bg-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-dim">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Prompt</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Dimension</th>
                <th className="px-4 py-2 font-medium">Flags</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id} className="border-t border-border hover:bg-panel-2">
                  <td className="px-4 py-2.5 text-dim">{q.ordinal}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{q.prompt}</div>
                    <div className="text-[11px] text-dim">{q.key}</div>
                  </td>
                  <td className="px-4 py-2.5 text-dim">{q.responseType.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2.5 text-dim">{q.dimension ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {q.required && <span className="mr-2 text-amber">required</span>}
                    <span className={q.active ? "text-green" : "text-dim"}>
                      {q.active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/questions/${q.id}/edit`} className="text-dim hover:text-text">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {questions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-dim">
                    No questions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default async function QuestionsPage() {
  const { engagements } = getRepositories();
  const [discovery, assessment] = await Promise.all([
    engagements.listQuestionsForEditor("discovery"),
    engagements.listQuestionsForEditor("assessment"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Questions"
        description="Edit the discovery and assessment questionnaires. Changes apply to new engagements; historical answers keep their original questions."
      />
      <QuestionSet kind="discovery" title="Discovery questions" questions={discovery} />
      <QuestionSet kind="assessment" title="Assessment questions" questions={assessment} />
    </div>
  );
}
