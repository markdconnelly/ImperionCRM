import { describe, expect, it } from "vitest";
import { mergeInbox, type SortableInboxItem } from "./social";
import type { SocialInboxItem } from "@/types";

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
