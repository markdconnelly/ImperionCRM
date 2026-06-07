import type { AnswerReviewRow } from "@/types";

const STATUS_TONE: Record<string, string> = {
  draft: "text-amber",
  confirmed: "text-green",
  rejected: "text-red",
};

/**
 * Pre-discovery agent/automation answers awaiting the salesperson's stamp (ADR-0027).
 * Human-entered answers are not shown here — only what the agents gathered, which the
 * rep confirms or rejects before the fit verdict is locked.
 */
export function AgentAnswersReview({
  answers,
  discoveryId,
  confirmAction,
  rejectAction,
}: {
  answers: AnswerReviewRow[];
  discoveryId: string;
  confirmAction: (formData: FormData) => void | Promise<void>;
  rejectAction: (formData: FormData) => void | Promise<void>;
}) {
  const agentAnswers = answers.filter((a) => a.source !== "human");
  if (agentAnswers.length === 0) {
    return (
      <p className="text-sm text-dim">
        No agent-gathered answers to review. Pre-discovery automation pre-fills these
        before the call; they appear here for confirmation.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {agentAnswers.map((a) => (
        <li key={a.id} className="rounded-md border border-border bg-panel-2 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-text">{a.prompt}</p>
              <p className="mt-0.5 text-sm text-dim">{a.value ?? "—"}</p>
              <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-dim">
                <span className="uppercase">{a.source}</span>
                {a.confidence != null && <span>· {Math.round(a.confidence * 100)}% confidence</span>}
                <span className={STATUS_TONE[a.status] ?? "text-dim"}>· {a.status}</span>
              </div>
            </div>
            {a.status === "draft" && (
              <div className="flex shrink-0 items-center gap-2">
                <form action={confirmAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="discoveryId" value={discoveryId} />
                  <button type="submit" className="text-xs text-dim hover:text-green">
                    Confirm
                  </button>
                </form>
                <form action={rejectAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="discoveryId" value={discoveryId} />
                  <button type="submit" className="text-xs text-dim hover:text-red">
                    Reject
                  </button>
                </form>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
