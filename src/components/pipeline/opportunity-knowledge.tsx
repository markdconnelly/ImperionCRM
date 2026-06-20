import { Icon } from "@/components/ui/icon";
import { ATTACHMENT_ACCEPT, formatBytes } from "@/lib/attachments";
import { addOpportunityKnowledgeAction } from "@/app/(app)/pipeline/actions";
import type { OpportunityKnowledgeRow } from "@/lib/data/repositories";

/**
 * Sales knowledge panel for the Deal 360 (#429, epic #425). The sales team captures the
 * context a machine feed can't — running free-text notes + uploaded documents about the
 * customer/deal — which the server action writes to the `website_opportunities` bronze
 * (source='website', highest merge precedence; ADR-0039). The uploaded knowledge feeds
 * the gold layer + the orchestrator (so the agent reasons over what sales knows).
 *
 * Pure server component over the data layer (ADR-0042): notes textarea (pre-filled with
 * the current website-sourced notes) + a single optional file input, posting to
 * `addOpportunityKnowledgeAction`. Already-uploaded knowledge is listed read-only.
 * `notice` surfaces a degraded-upload message when the backend blob custody is unwired.
 */
export function OpportunityKnowledge({
  opportunityId,
  knowledge,
  notice,
}: {
  opportunityId: string;
  knowledge: OpportunityKnowledgeRow;
  notice?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {notice ? (
        <p className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
          {notice}
        </p>
      ) : null}

      <form action={addOpportunityKnowledgeAction} className="flex flex-col gap-3">
        <input type="hidden" name="opportunityId" value={opportunityId} />

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-dim">Sales notes</span>
          <textarea
            name="notes"
            defaultValue={knowledge.notes ?? ""}
            rows={5}
            placeholder="Running notes about the customer / deal — context a machine feed can't capture."
            className="rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-dim">Attach knowledge (optional)</span>
          <input
            type="file"
            name="knowledge"
            accept={ATTACHMENT_ACCEPT}
            className="text-sm text-dim file:mr-3 file:rounded-md file:border file:border-border file:bg-panel-2 file:px-3 file:py-1.5 file:text-sm file:text-text hover:file:text-accent"
          />
          <span className="text-[11px] text-dim">
            Documents, images, or an archive up to 25 MB. Scanned + stored by the backend
            (ADR-0069); feeds the gold layer for the orchestrator.
          </span>
        </label>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/20"
          >
            <Icon name="Save" size={14} />
            Save knowledge
          </button>
        </div>
      </form>

      {knowledge.knowledge.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-medium text-dim">Uploaded knowledge</h4>
          <ul className="flex flex-col gap-1.5">
            {knowledge.knowledge.map((k, i) => (
              <li
                key={`${k.blobPath}-${i}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-panel-2 px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon name="FileText" size={14} />
                  <span className="truncate text-text">{k.filename}</span>
                </span>
                <span className="shrink-0 text-xs text-dim">
                  {k.byteSize ? formatBytes(k.byteSize) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-dim">No knowledge uploaded for this deal yet.</p>
      )}
    </div>
  );
}
