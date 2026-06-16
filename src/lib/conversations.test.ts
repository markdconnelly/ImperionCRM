import { describe, expect, it } from "vitest";
import {
  conversationSourceMeta,
  conversationStatusMeta,
  insightKindMeta,
  formatConversationDuration,
  insightText,
  sortInsights,
  filterConversationsForOpportunity,
} from "./conversations";
import type { ConversationInsightRow, ConversationRow } from "@/types";

function conversation(over: Partial<ConversationRow> = {}): ConversationRow {
  return {
    id: "c1",
    source: "acs",
    status: "analyzed",
    startedAt: "2026-06-15 09:30",
    durationSeconds: 600,
    contactId: null,
    opportunityId: null,
    hasTranscript: true,
    ...over,
  };
}

function insight(over: Partial<ConversationInsightRow> = {}): ConversationInsightRow {
  return {
    id: "i1",
    kind: "summary",
    payload: {},
    model: "claude-haiku",
    createdAt: "2026-06-15 10:00",
    ...over,
  };
}

describe("conversationSourceMeta", () => {
  it("maps the three known sources (ADR-0068 decision 2)", () => {
    expect(conversationSourceMeta("acs").label).toBe("Call (ACS)");
    expect(conversationSourceMeta("teams").icon).toBe("Video");
    expect(conversationSourceMeta("upload").label).toBe("Uploaded recording");
  });
  it("falls back legibly on an unknown source", () => {
    expect(conversationSourceMeta("zoom")).toEqual({ label: "zoom", icon: "Mic" });
  });
});

describe("conversationStatusMeta", () => {
  it("maps the lifecycle states (ADR-0068 decision 3)", () => {
    expect(conversationStatusMeta("captured").label).toBe("Captured");
    expect(conversationStatusMeta("analyzed").tone).toBe("text-green");
    expect(conversationStatusMeta("purged").label).toBe("Purged");
  });
  it("echoes an unknown status", () => {
    expect(conversationStatusMeta("weird").label).toBe("weird");
  });
});

describe("insightKindMeta", () => {
  it("maps each insight kind (ADR-0068 decision 1)", () => {
    expect(insightKindMeta("summary").label).toBe("Summary");
    expect(insightKindMeta("action_item").label).toBe("Action item");
    expect(insightKindMeta("risk").tone).toBe("text-red");
    expect(insightKindMeta("objection").icon).toBe("MessageSquareWarning");
  });
});

describe("formatConversationDuration", () => {
  it("returns — for null/negative", () => {
    expect(formatConversationDuration(null)).toBe("—");
    expect(formatConversationDuration(-5)).toBe("—");
  });
  it("formats sub-minute, minutes, and hours", () => {
    expect(formatConversationDuration(45)).toBe("45s");
    expect(formatConversationDuration(90)).toBe("1m");
    expect(formatConversationDuration(25 * 60)).toBe("25m");
    expect(formatConversationDuration(3 * 3600 + 7 * 60)).toBe("3h 7m");
  });
});

describe("insightText", () => {
  it("prefers text → summary → description → label → value", () => {
    expect(insightText({ text: "hi" })).toBe("hi");
    expect(insightText({ summary: "the gist" })).toBe("the gist");
    expect(insightText({ description: "do X" })).toBe("do X");
    expect(insightText({ value: "0.8" })).toBe("0.8");
  });
  it("falls back to a JSON preview for an unexpected shape", () => {
    expect(insightText({ score: 0.9 })).toBe('{"score":0.9}');
  });
  it("returns — for an empty payload", () => {
    expect(insightText({})).toBe("—");
  });
  it("ignores blank strings and keeps scanning", () => {
    expect(insightText({ text: "   ", summary: "kept" })).toBe("kept");
  });
});

describe("sortInsights", () => {
  it("orders summary → action_item → sentiment → objection → risk", () => {
    const out = sortInsights([
      insight({ id: "r", kind: "risk" }),
      insight({ id: "a", kind: "action_item" }),
      insight({ id: "s", kind: "summary" }),
      insight({ id: "o", kind: "objection" }),
      insight({ id: "se", kind: "sentiment" }),
    ]);
    expect(out.map((i) => i.id)).toEqual(["s", "a", "se", "o", "r"]);
  });
  it("does not mutate the input array", () => {
    const input = [insight({ id: "r", kind: "risk" }), insight({ id: "s", kind: "summary" })];
    sortInsights(input);
    expect(input[0].id).toBe("r");
  });
});

describe("filterConversationsForOpportunity (ADR-0068, #681)", () => {
  const rows = [
    conversation({ id: "a", opportunityId: "opp_1" }),
    conversation({ id: "b", opportunityId: "opp_2" }),
    conversation({ id: "c", opportunityId: "opp_1" }),
    conversation({ id: "d", opportunityId: null }), // account-wide, no deal link
  ];

  it("keeps only the rows tied to THIS deal", () => {
    expect(filterConversationsForOpportunity(rows, "opp_1").map((c) => c.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("excludes account-wide conversations with no opportunityId", () => {
    const out = filterConversationsForOpportunity(rows, "opp_2");
    expect(out.map((c) => c.id)).toEqual(["b"]);
    expect(out.some((c) => c.opportunityId == null)).toBe(false);
  });

  it("returns [] (empty state) when the deal has no conversations", () => {
    expect(filterConversationsForOpportunity(rows, "opp_absent")).toEqual([]);
    expect(filterConversationsForOpportunity([], "opp_1")).toEqual([]);
  });

  it("preserves input order", () => {
    expect(filterConversationsForOpportunity(rows, "opp_1").map((c) => c.id)).toEqual([
      "a",
      "c",
    ]);
  });
});
