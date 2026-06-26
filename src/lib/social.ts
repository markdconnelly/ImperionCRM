import type {
  SocialChannel,
  SocialChannelMetrics,
  SocialInboxItem,
  SocialMetricDatum,
} from "@/types";

/**
 * Social Media Management plane shared constants (ADR-0124, epic #1338, slice B #1340).
 *
 * The five Social Channels and their display metadata, used by the inbox channel filter
 * and the compose-once fan-out picker. "Connected" channels are derived from `connection`
 * rows at runtime (ADR-0124 #3) — this list is the full universe the plane can address.
 */
export interface SocialChannelMeta {
  key: SocialChannel;
  label: string;
  /** lucide-react icon name (resolved by <Icon />). */
  icon: string;
}

export const SOCIAL_CHANNELS: SocialChannelMeta[] = [
  { key: "facebook", label: "Facebook", icon: "Facebook" },
  { key: "instagram", label: "Instagram", icon: "Instagram" },
  { key: "threads", label: "Threads", icon: "AtSign" },
  { key: "linkedin", label: "LinkedIn", icon: "Linkedin" },
  { key: "messenger", label: "Messenger", icon: "MessageCircle" },
];

/** Tailwind tone classes for a social_post / social_post_channel publish status. */
export const PUBLISH_STATUS_TONE: Record<string, string> = {
  draft: "text-dim",
  scheduled: "text-amber-400",
  published: "text-emerald-400",
  archived: "text-dim",
  failed: "text-rose-400",
};

/** Tailwind tone classes for a social_engagement triage status. */
export const ENGAGEMENT_STATUS_TONE: Record<string, string> = {
  new: "text-sky-400",
  triaged: "text-amber-400",
  replied: "text-emerald-400",
  dismissed: "text-dim",
};

/** Human label for an inbox row's kind. */
export const INBOX_KIND_LABEL: Record<string, string> = {
  dm: "DM",
  comment: "Comment",
  mention: "Mention",
};

/** An inbox item paired with its sort key (epoch ms) for the cross-origin merge. */
export interface SortableInboxItem {
  sort: number;
  item: SocialInboxItem;
}

/**
 * Merge the two inbound origins of the Social inbox (ADR-0124 #2 inbound split) — private
 * DMs and public engagements — into one newest-first list, capped at `limit`. Pure: the
 * data layer builds the `{ sort, item }` pairs from its rows, this folds them. Stable for a
 * tie (DMs were appended before engagements upstream).
 */
export function mergeInbox(
  dms: SortableInboxItem[],
  engagements: SortableInboxItem[],
  limit: number,
): SocialInboxItem[] {
  return [...dms, ...engagements]
    .sort((a, b) => b.sort - a.sort)
    .slice(0, Math.max(limit, 0))
    .map((x) => x.item);
}

/**
 * Group flat `social_metric` data (slice D analytics, ADR-0124) into a per-channel
 * rollup. Pure: the data layer hands over the mapped {@link SocialMetricDatum} rows, this
 * folds them by `platform`. **Metric-name-tolerant (#135)** — it never whitelists metric
 * names, it just groups whatever exists, so unknown/retuned names still render. Channels
 * are ordered by total metric volume desc (busiest first); within a channel, lifetime
 * metrics lead the 28-day window, then alphabetically by metric for a stable view.
 */
export function summarizeChannelMetrics(rows: SocialMetricDatum[]): SocialChannelMetrics[] {
  const byPlatform = new Map<string, SocialMetricDatum[]>();
  for (const r of rows) {
    const list = byPlatform.get(r.platform);
    if (list) list.push(r);
    else byPlatform.set(r.platform, [r]);
  }
  const windowRank = (w: SocialMetricDatum["window"]) => (w === "lifetime" ? 0 : 1);
  const channels: SocialChannelMetrics[] = [...byPlatform.entries()].map(
    ([platform, metrics]) => ({
      platform,
      metrics: [...metrics].sort(
        (a, b) => windowRank(a.window) - windowRank(b.window) || a.metric.localeCompare(b.metric),
      ),
    }),
  );
  // Busiest channel first — by summed metric value, breaking ties by platform name.
  return channels.sort((a, b) => {
    const av = a.metrics.reduce((n, m) => n + m.value, 0);
    const bv = b.metrics.reduce((n, m) => n + m.value, 0);
    return bv - av || a.platform.localeCompare(b.platform);
  });
}

/** Cost per lead for a paid ad row: spend ÷ results, or null when there are no results. */
export function costPerLead(spend: number, results: number): number | null {
  if (results <= 0) return null;
  return Math.round((spend / results) * 100) / 100;
}
