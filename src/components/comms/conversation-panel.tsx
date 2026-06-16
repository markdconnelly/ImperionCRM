import { Icon } from "@/components/ui/icon";
import type { ConversationDetail, ConversationRow } from "@/types";
import {
  conversationSourceMeta,
  conversationStatusMeta,
  insightKindMeta,
  insightText,
  formatConversationDuration,
  sortInsights,
} from "@/lib/conversations";

/**
 * The conversational-intelligence 360 panel (ADR-0068, #379). Renders the voice
 * conversations — ACS calls, Teams meetings, uploaded recordings — tied to a
 * contact / account / deal, each with its AI-derived insights (summary, action
 * items, sentiment, objection, deal-risk per ADR-0068 decision 1). Read-only:
 * the capture → transcribe → analyze write path is a backend process (ADR-0042),
 * dormant until ACS/Speech creds land — so this surface degrades to an honest
 * empty state, never a failed page (the mock/Postgres readers return [] when the
 * pipeline is unwired or migration 0112 is not yet prod-applied).
 *
 * A conversation is an interaction; its summary also belongs on the unified
 * interaction timeline (ADR-0011) alongside emails and tickets — this panel is
 * the drill-down companion to that timeline entry.
 *
 * `details` resolves a row id → its loaded segments/insights (the page fetches
 * them server-side); a row absent from the map renders header-only.
 */
export function ConversationPanel({
  conversations,
  details,
  emptyHint = "No conversations captured for this record yet.",
}: {
  conversations: ConversationRow[];
  details?: Record<string, ConversationDetail | null>;
  emptyHint?: string;
}) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel px-4 py-8 text-center text-sm text-dim">
        {emptyHint}
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {conversations.map((c) => {
        const src = conversationSourceMeta(c.source);
        const status = conversationStatusMeta(c.status);
        const detail = details?.[c.id] ?? null;
        const insights = detail ? sortInsights(detail.insights) : [];
        return (
          <li
            key={c.id}
            className="rounded-lg border border-border bg-panel-2 p-3"
          >
            {/* Header: source · status · when · duration */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-text">
                <Icon name={src.icon} size={14} />
                {src.label}
              </span>
              <span className={status.tone}>· {status.label}</span>
              {c.startedAt && <span className="text-dim">· {c.startedAt}</span>}
              {c.durationSeconds != null && (
                <span className="text-dim">
                  · {formatConversationDuration(c.durationSeconds)}
                </span>
              )}
              {c.hasTranscript && (
                <span className="flex items-center gap-1 text-dim" title="Transcript captured">
                  · <Icon name="FileText" size={12} /> transcript
                </span>
              )}
            </div>

            {/* AI insights (ADR-0068 decision 1) — summary / action items /
                sentiment / objection / deal-risk, in reading order. */}
            {insights.length > 0 ? (
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {insights.map((ins) => {
                  const meta = insightKindMeta(ins.kind);
                  return (
                    <li
                      key={ins.id}
                      className="flex items-start gap-2 rounded-md border border-border bg-panel px-2.5 py-1.5"
                    >
                      <span
                        className={`mt-0.5 flex shrink-0 items-center gap-1 text-[11px] font-medium ${meta.tone}`}
                      >
                        <Icon name={meta.icon} size={12} />
                        {meta.label}
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-text">
                        {insightText(ins.payload)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-dim">
                {c.status === "analyzed"
                  ? "No insights recorded."
                  : "Not analyzed yet — insights appear once the backend completes analysis (ADR-0068)."}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
