import { Icon } from "@/components/ui/icon";
import type { SourceRecordRow } from "@/types";

/**
 * At-a-glance "are this record's integrations working?" strip for the account /
 * contact 360 pages. Derives health from the per-source bronze citations the
 * page already fetched: each source that has ever fed this record gets a chip
 * with a freshness dot — green when the pipeline has seen it recently, amber
 * when it has gone stale, dim when it never carried a timestamp. Manual
 * (website) rows are the user's own edits, so they show as neutral provenance,
 * not a sync status.
 */

const SOURCE_DISPLAY: Record<string, { label: string; icon: string }> = {
  autotask: { label: "Autotask", icon: "Wrench" },
  itglue: { label: "IT Glue", icon: "BookOpen" },
  apollo: { label: "Apollo", icon: "Rocket" },
  m365_synced: { label: "Microsoft 365", icon: "Cloud" },
  website: { label: "Manual entry", icon: "PenLine" },
  imperion_crm_entered: { label: "Manual entry", icon: "PenLine" }, // legacy key
};

/** Sources newer than this are "live"; older are "stale" (bulk loads run daily). */
const FRESH_HOURS = 36;

type Freshness = "live" | "stale" | "unknown" | "manual";

const DOT_TONE: Record<Freshness, string> = {
  live: "bg-green",
  stale: "bg-amber",
  unknown: "bg-border",
  manual: "bg-accent",
};

const FRESH_LABEL: Record<Freshness, string> = {
  live: "syncing",
  stale: "stale",
  unknown: "no data",
  manual: "manual",
};

/** Parse the repo layer's "yyyy-mm-dd hh:mm" (UTC) timestamps. */
function parseSeen(s: string | null): number | null {
  if (!s) return null;
  const t = Date.parse(s.length === 16 ? `${s.replace(" ", "T")}:00Z` : s);
  return Number.isNaN(t) ? null : t;
}

export function IntegrationHealth({ sources }: { sources: SourceRecordRow[] }) {
  // One chip per source, keeping the freshest sighting.
  const bySource = new Map<string, number | null>();
  for (const s of sources) {
    const seen = parseSeen(s.lastSeenAt);
    const prev = bySource.get(s.source);
    if (!bySource.has(s.source) || (seen != null && (prev == null || seen > prev))) {
      bySource.set(s.source, seen);
    }
  }

  if (bySource.size === 0) {
    return (
      <p className="text-sm text-dim">
        No integrations feed this record yet. Connect a source under Settings →
        Company credentials.
      </p>
    );
  }

  const now = Date.now();
  const chips = [...bySource.entries()].map(([source, seen]) => {
    const display = SOURCE_DISPLAY[source] ?? { label: source, icon: "Circle" };
    const manual = source === "website" || source === "imperion_crm_entered";
    const freshness: Freshness = manual
      ? "manual"
      : seen == null
        ? "unknown"
        : now - seen <= FRESH_HOURS * 3600_000
          ? "live"
          : "stale";
    const age =
      seen == null ? null : Math.max(0, Math.round((now - seen) / 3600_000));
    return { source, display, freshness, age };
  });

  return (
    <ul className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <li
          key={c.source}
          className="flex items-center gap-2 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs"
          title={
            c.age == null
              ? `${c.display.label}: ${FRESH_LABEL[c.freshness]}`
              : `${c.display.label}: last seen ${c.age < 48 ? `${c.age}h` : `${Math.round(c.age / 24)}d`} ago`
          }
        >
          <Icon name={c.display.icon} size={13} />
          <span className="text-text">{c.display.label}</span>
          <span className={`h-2 w-2 rounded-full ${DOT_TONE[c.freshness]}`} />
          <span className="text-dim">{FRESH_LABEL[c.freshness]}</span>
        </li>
      ))}
    </ul>
  );
}
