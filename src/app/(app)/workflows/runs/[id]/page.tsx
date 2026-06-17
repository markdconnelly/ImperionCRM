import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getIcmRun } from "@/lib/agent/icm-runs";

export const dynamic = "force-dynamic";

const ROLE_TONE: Record<string, string> = {
  system: "text-dim",
  user: "text-accent",
  assistant: "text-green",
  tool: "text-accent-2",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString();
}

/**
 * Glass-box run detail (#278, ADR-0061): the ordered stage artifacts of one ICM run
 * (`agent_message` rows), each readable. Editing-between-stages is the backend's
 * parked-checkpoint path (ADR-0042) surfaced as the approval queue on /workflows/runs;
 * here every stage's content + tool calls are inspectable plain text.
 */
export default async function WorkflowRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getIcmRun(id);
  if (!run) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`${run.agentName} run`}
        description={`${run.status} · started ${fmt(run.startedAt)}${
          run.finishedAt ? ` · finished ${fmt(run.finishedAt)}` : ""
        } · $${run.costUsd.toFixed(4)}`}
      >
        <Link href="/workflows/runs" className="text-sm text-dim hover:text-text">
          ← Runs
        </Link>
      </PageHeader>

      {run.awaitingApproval && (
        <p className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">
          Parked at a checkpoint — review the drafted artifact in the approval queue on the runs
          page before it can proceed.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="font-display text-sm font-semibold tracking-tight">Stage artifacts</h3>
        {run.stages.length === 0 ? (
          <p className="text-sm text-dim">No stage artifacts recorded for this run yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {run.stages.map((s, i) => (
              <li key={s.id} className="rounded-lg border border-border bg-panel-2 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs text-dim">
                    {i + 1}
                  </span>
                  <span className={`text-xs font-medium uppercase tracking-wide ${ROLE_TONE[s.role] ?? "text-dim"}`}>
                    {s.role}
                  </span>
                  <span className="text-[11px] text-dim" title={s.createdAt}>
                    {fmt(s.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-text">{s.content}</p>
                {s.toolCalls != null && (
                  <pre className="mt-2 overflow-x-auto rounded border border-border bg-panel p-2 text-[11px] text-dim">
                    {JSON.stringify(s.toolCalls, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {Object.keys(run.permissionScope).length > 0 && (
        <section>
          <h3 className="mb-2 font-display text-sm font-semibold tracking-tight">Permission scope</h3>
          <pre className="overflow-x-auto rounded-lg border border-border bg-panel-2 p-3 text-[11px] text-dim">
            {JSON.stringify(run.permissionScope, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
