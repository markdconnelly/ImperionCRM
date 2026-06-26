import { describe, expect, it } from "vitest";
import {
  costPerLead,
  mergeInbox,
  summarizeChannelMetrics,
  type SortableInboxItem,
} from "./social";
import type { SocialInboxItem, SocialMetricDatum } from "@/types";

/**
 * Unit tests for the Social inbox cross-origin merge (ADR-0124 #2 inbound split, #1340):
 * private DMs + public engagements folded into one newest-first list, capped. Pure — no DB.
 */
function dm(id: string, sort: number): SortableInboxItem {
  const item: SocialInboxItem = {
    id,
    origin: "dm",
    kind: "dm",
    channel: "messenger",
    body: `dm ${id}`,
    author: null,
    contact: null,
    occurredAt: null,
    engagementStatus: null,
    intent: null,
    assignedAgentKey: null,
    sourceUrl: null,
  };
  return { sort, item };
}

function eng(id: string, sort: number): SortableInboxItem {
  const item: SocialInboxItem = {
    id,
    origin: "engagement",
    kind: "comment",
    channel: "facebook",
    body: `eng ${id}`,
    author: "someone",
    contact: null,
    occurredAt: null,
    engagementStatus: "new",
    intent: "lead",
    assignedAgentKey: null,
    sourceUrl: null,
  };
  return { sort, item };
}

describe("mergeInbox", () => {
  it("interleaves both origins newest-first by sort key", () => {
    const merged = mergeInbox([dm("a", 30), dm("b", 10)], [eng("c", 20), eng("d", 5)], 100);
    expect(merged.map((m) => m.id)).toEqual(["a", "c", "b", "d"]);
  });

  it("caps the result to the limit after sorting", () => {
    const merged = mergeInbox([dm("a", 30), dm("b", 10)], [eng("c", 20)], 2);
    expect(merged.map((m) => m.id)).toEqual(["a", "c"]);
  });

  it("returns an empty list when both origins are empty", () => {
    expect(mergeInbox([], [], 50)).toEqual([]);
  });

  it("treats a non-positive limit as empty", () => {
    expect(mergeInbox([dm("a", 1)], [], 0)).toEqual([]);
  });

  it("preserves the full inbox item shape through the merge", () => {
    const [first] = mergeInbox([], [eng("c", 1)], 10);
    expect(first).toMatchObject({ id: "c", origin: "engagement", intent: "lead" });
  });
});

/** Slice D analytics helpers (ADR-0124 D, #1342) — pure, metric-name-tolerant (#135). */
function m(
  platform: string,
  metric: string,
  value: number,
  window: SocialMetricDatum["window"],
): SocialMetricDatum {
  return { platform, metric, value, window };
}

describe("summarizeChannelMetrics", () => {
  it("groups metrics by platform", () => {
    const out = summarizeChannelMetrics([
      m("facebook", "reach", 100, "lifetime"),
      m("instagram", "followers", 50, "lifetime"),
      m("facebook", "impressions", 200, "28d"),
    ]);
    expect(out.map((c) => c.platform)).toEqual(["facebook", "instagram"]);
    expect(out[0].metrics).toHaveLength(2);
  });

  it("orders channels by total metric volume (busiest first)", () => {
    const out = summarizeChannelMetrics([
      m("instagram", "reach", 10, "lifetime"),
      m("facebook", "reach", 900, "lifetime"),
    ]);
    expect(out.map((c) => c.platform)).toEqual(["facebook", "instagram"]);
  });

  it("orders metrics lifetime-first then alphabetically within a channel", () => {
    const out = summarizeChannelMetrics([
      m("facebook", "z_day", 5, "28d"),
      m("facebook", "a_day", 5, "28d"),
      m("facebook", "m_life", 5, "lifetime"),
    ]);
    expect(out[0].metrics.map((x) => x.metric)).toEqual(["m_life", "a_day", "z_day"]);
  });

  it("renders unknown/unnormalized metric names without dropping them (#135)", () => {
    const out = summarizeChannelMetrics([m("threads", "some_brand_new_metric", 1, "lifetime")]);
    expect(out[0].metrics[0].metric).toBe("some_brand_new_metric");
  });

  it("returns an empty list for no rows", () => {
    expect(summarizeChannelMetrics([])).toEqual([]);
  });
});

describe("costPerLead", () => {
  it("computes spend ÷ results rounded to cents", () => {
    expect(costPerLead(100, 8)).toBe(12.5);
  });

  it("returns null when there are no results (avoids divide-by-zero)", () => {
    expect(costPerLead(100, 0)).toBeNull();
    expect(costPerLead(0, 0)).toBeNull();
  });
});
