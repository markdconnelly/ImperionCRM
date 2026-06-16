/**
 * Presentation helpers for the conversational-intelligence 360 panel
 * (ADR-0068, #379). Pure data + formatting — safe to import from a server or
 * client component, and unit-tested in `conversations.test.ts`. The panel reads
 * `ConversationRow`/`ConversationInsightRow` (silver `conversation_intelligence`,
 * migration 0112) and surfaces summary / action items / sentiment / risk
 * (ADR-0068 decision 1). No row-level data is shaped here; this is label + icon
 * mapping only.
 */
import type {
  ConversationRow,
  ConversationInsightRow,
} from "@/types";

export interface ChipMeta {
  label: string;
  icon: string; // lucide-react icon name (resolved by <Icon/>)
}

/** Conversation source (system of origin, ADR-0068 decision 2) → display. */
const SOURCE_META: Record<ConversationRow["source"], ChipMeta> = {
  acs: { label: "Call (ACS)", icon: "Phone" },
  teams: { label: "Teams meeting", icon: "Video" },
  upload: { label: "Uploaded recording", icon: "Upload" },
};

export function conversationSourceMeta(source: string): ChipMeta {
  return (
    SOURCE_META[source as ConversationRow["source"]] ?? {
      label: source,
      icon: "Mic",
    }
  );
}

/**
 * Pipeline status (ADR-0068 decision 3 lifecycle: captured → transcribed →
 * analyzed, plus purged once retention expires). Tone is a token class.
 */
export function conversationStatusMeta(
  status: string,
): { label: string; tone: string } {
  switch (status) {
    case "captured":
      return { label: "Captured", tone: "text-dim" };
    case "transcribed":
      return { label: "Transcribed", tone: "text-accent" };
    case "analyzed":
      return { label: "Analyzed", tone: "text-green" };
    case "purged":
      return { label: "Purged", tone: "text-amber" };
    default:
      return { label: status, tone: "text-dim" };
  }
}

/** Insight kind (ADR-0068 decision 1 structured outputs) → label, icon, tone. */
export function insightKindMeta(
  kind: ConversationInsightRow["kind"],
): ChipMeta & { tone: string } {
  switch (kind) {
    case "summary":
      return { label: "Summary", icon: "FileText", tone: "text-text" };
    case "action_item":
      return { label: "Action item", icon: "ListChecks", tone: "text-accent" };
    case "sentiment":
      return { label: "Sentiment", icon: "Smile", tone: "text-green" };
    case "objection":
      return { label: "Objection", icon: "MessageSquareWarning", tone: "text-amber" };
    case "risk":
      return { label: "Deal risk", icon: "TriangleAlert", tone: "text-red" };
    default:
      return { label: kind, icon: "Circle", tone: "text-dim" };
  }
}

/** Whole-minute "Hh Mm" / "Mm Ss" duration label from seconds; "—" when null. */
export function formatConversationDuration(seconds: number | null): string {
  if (seconds == null || seconds < 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Pull the human-readable text out of an insight's opaque jsonb `payload`
 * (carried untyped from the backend analyzer, ADR-0068 decision 1). Looks at the
 * common shapes the analyzer emits — `text` / `summary` / `description` /
 * `label` — and falls back to a compact JSON preview so an unexpected shape is
 * still legible rather than blank. Pure; never throws on odd input.
 */
export function insightText(payload: Record<string, unknown>): string {
  for (const key of ["text", "summary", "description", "label", "value"]) {
    const v = payload[key];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  try {
    const json = JSON.stringify(payload);
    if (json && json !== "{}") return json;
  } catch {
    /* circular / unserializable → fall through */
  }
  return "—";
}

/**
 * Order insights for display: summary first, then action items, sentiment,
 * objections, deal-risk (ADR-0068 decision 1 reading order — the rep wants the
 * gist, then what to do, then how it felt, then the warnings).
 */
const KIND_ORDER: Record<ConversationInsightRow["kind"], number> = {
  summary: 0,
  action_item: 1,
  sentiment: 2,
  objection: 3,
  risk: 4,
};

export function sortInsights(
  insights: ConversationInsightRow[],
): ConversationInsightRow[] {
  return [...insights].sort(
    (a, b) => (KIND_ORDER[a.kind] ?? 99) - (KIND_ORDER[b.kind] ?? 99),
  );
}
