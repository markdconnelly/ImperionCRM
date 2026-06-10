import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  groupTranscript,
  parseRationale,
  sessionStatusMeta,
  timeAgo,
  truncate,
  type BoardTranscriptMessage,
} from "./session";

describe("sessionStatusMeta", () => {
  it("maps every 0056 status to a tone", () => {
    expect(sessionStatusMeta("concluded")).toEqual({ label: "concluded", tone: "text-green" });
    expect(sessionStatusMeta("failed")).toEqual({ label: "failed", tone: "text-red" });
    expect(sessionStatusMeta("deliberating").tone).toBe("text-amber");
    expect(sessionStatusMeta("open").tone).toBe("text-accent");
  });
  it("never throws on unknown statuses", () => {
    expect(sessionStatusMeta("weird")).toEqual({ label: "weird", tone: "text-dim" });
    expect(sessionStatusMeta("")).toEqual({ label: "unknown", tone: "text-dim" });
  });
});

describe("parseRationale", () => {
  it("normalizes the backend's structured rationale", () => {
    const out = parseRationale({
      stances: [{ role: "CFO", stance: "Support with an uplift." }],
      agreements: ["Bundle it"],
      disagreements: ["Margin risk"],
    });
    expect(out).toEqual({
      stances: [{ role: "CFO", stance: "Support with an uplift." }],
      agreements: ["Bundle it"],
      disagreements: ["Margin risk"],
      parseError: false,
    });
  });

  it("accepts a JSON string (pg jsonb sometimes arrives serialized)", () => {
    const out = parseRationale('{"stances":[],"agreements":["a"],"disagreements":[]}');
    expect(out.agreements).toEqual(["a"]);
    expect(out.parseError).toBe(false);
  });

  it("carries the backend's parseError flag through", () => {
    expect(parseRationale({ parseError: true, stances: [] }).parseError).toBe(true);
  });

  it("drops malformed stances and non-string list items", () => {
    const out = parseRationale({
      stances: [
        { role: "CEO", stance: "ok" },
        { role: 42, stance: "bad role" },
        { role: "COO" }, // missing stance
        "not an object",
        { role: "CMO", stance: "   " }, // blank stance
      ],
      agreements: ["fine", 7, null, ""],
      disagreements: "not an array",
    });
    expect(out.stances).toEqual([{ role: "CEO", stance: "ok" }]);
    expect(out.agreements).toEqual(["fine"]);
    expect(out.disagreements).toEqual([]);
  });

  it("never throws on garbage", () => {
    expect(parseRationale(null)).toMatchObject({ stances: [], parseError: false });
    expect(parseRationale(undefined).parseError).toBe(false);
    expect(parseRationale("not json").parseError).toBe(true);
    expect(parseRationale([1, 2]).parseError).toBe(true);
    expect(parseRationale(42).parseError).toBe(true);
    expect(parseRationale({}).parseError).toBe(false);
  });
});

function msg(id: string, agentId: string | null, at: string): BoardTranscriptMessage {
  return { id, agentId, name: agentId, personaRole: null, content: id, createdAt: at };
}

describe("groupTranscript", () => {
  it("splits persona messages into rounds by occurrence and isolates the synthesis voice", () => {
    const { rounds, synthesis } = groupTranscript([
      msg("a1", "ceo", "2026-06-09T10:00:00Z"),
      msg("b1", "cfo", "2026-06-09T10:00:10Z"),
      msg("a2", "ceo", "2026-06-09T10:01:00Z"),
      msg("b2", "cfo", "2026-06-09T10:01:10Z"),
      msg("syn", null, "2026-06-09T10:02:00Z"),
    ]);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].map((m) => m.id)).toEqual(["a1", "b1"]);
    expect(rounds[1].map((m) => m.id)).toEqual(["a2", "b2"]);
    expect(synthesis.map((m) => m.id)).toEqual(["syn"]);
  });

  it("handles a failed session whose only message is the NULL-agent explanation", () => {
    const { rounds, synthesis } = groupTranscript([msg("fail", null, "2026-06-09T10:00:00Z")]);
    expect(rounds).toHaveLength(0);
    expect(synthesis).toHaveLength(1);
  });

  it("tolerates a persona that dropped out after round 1", () => {
    const { rounds } = groupTranscript([
      msg("a1", "ceo", "t1"),
      msg("b1", "cfo", "t2"),
      msg("a2", "ceo", "t3"), // CFO's round-2 call failed — kept round-1 position
    ]);
    expect(rounds[0].map((m) => m.id)).toEqual(["a1", "b1"]);
    expect(rounds[1].map((m) => m.id)).toEqual(["a2"]);
  });

  it("returns empty groups for an empty transcript", () => {
    expect(groupTranscript([])).toEqual({ rounds: [], synthesis: [] });
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-06-10T12:00:00Z").getTime();
  it("renders minutes, hours, and days", () => {
    expect(timeAgo("2026-06-10T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-06-10T11:30:00Z", now)).toBe("30m ago");
    expect(timeAgo("2026-06-10T09:00:00Z", now)).toBe("3h ago");
    expect(timeAgo("2026-06-07T12:00:00Z", now)).toBe("3d ago");
  });
  it("falls back on bad input", () => {
    expect(timeAgo("garbage", now)).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("formats a compact UTC stamp", () => {
    expect(formatDateTime("2026-06-09T15:10:00Z")).toBe("2026-06-09 15:10 UTC");
  });
  it("falls back on null and garbage", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("nope")).toBe("—");
  });
});

describe("truncate", () => {
  it("keeps short text intact and trims long text with an ellipsis", () => {
    expect(truncate("short")).toBe("short");
    const long = "x".repeat(200);
    const out = truncate(long, 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith("…")).toBe(true);
  });
});
