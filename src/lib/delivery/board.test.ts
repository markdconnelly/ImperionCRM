import { describe, expect, it } from "vitest";
import {
  groupByProvisionState,
  normalizeProvisionState,
  isContractGateOpen,
  canScheduleFire,
  planFireIntent,
  autotaskTicketUrl,
  fireStateCounts,
  PROVISION_STATES,
} from "./board";
import type { DeliveryBoardProject, DeliveryBoardTask } from "@/types";

// Pure read-model shaping + fire-intent transition tests for the delivery board
// (ADR-0080 §4/§7, ADR-0042). No pg, no clock — the repo supplies the rows and
// the server action mints the "fire now" timestamp.

function task(over: Partial<DeliveryBoardTask> & { taskId: string }): DeliveryBoardTask {
  return {
    title: "Task",
    dueAt: null,
    fire: {
      fireState: "none",
      scheduledFor: null,
      autotaskQueueId: null,
      autotaskTicketId: null,
      lastError: null,
    },
    ...over,
  };
}

function project(over: Partial<DeliveryBoardProject> & { projectId: string }): DeliveryBoardProject {
  return {
    name: "Proj",
    account: "Acme",
    provisionState: "pending",
    contractState: "none",
    autotaskProjectId: null,
    deliveryTemplateName: null,
    lastError: null,
    tasks: [],
    ...over,
  };
}

describe("groupByProvisionState", () => {
  it("returns all four columns in lifecycle order, even when empty", () => {
    const cols = groupByProvisionState([]);
    expect(cols.map((c) => c.state)).toEqual([...PROVISION_STATES]);
    expect(cols.every((c) => c.projects.length === 0)).toBe(true);
  });

  it("buckets projects into their provisioning state", () => {
    const cols = groupByProvisionState([
      project({ projectId: "a", provisionState: "pending" }),
      project({ projectId: "b", provisionState: "created" }),
      project({ projectId: "c", provisionState: "failed" }),
    ]);
    const find = (s: string) => cols.find((c) => c.state === s)!;
    expect(find("pending").projects.map((p) => p.projectId)).toEqual(["a"]);
    expect(find("created").projects.map((p) => p.projectId)).toEqual(["b"]);
    expect(find("failed").projects.map((p) => p.projectId)).toEqual(["c"]);
    expect(find("creating").projects).toHaveLength(0);
  });

  it("defaults an unknown provisioning state into 'pending'", () => {
    const cols = groupByProvisionState([project({ projectId: "x", provisionState: "garbage" })]);
    expect(cols.find((c) => c.state === "pending")!.projects).toHaveLength(1);
  });
});

describe("normalizeProvisionState", () => {
  it("passes through known states and defaults unknowns", () => {
    expect(normalizeProvisionState("created")).toBe("created");
    expect(normalizeProvisionState("")).toBe("pending");
    expect(normalizeProvisionState("nope")).toBe("pending");
  });
});

describe("isContractGateOpen", () => {
  it("is open only when signed", () => {
    expect(isContractGateOpen("signed")).toBe(true);
    expect(isContractGateOpen("sent")).toBe(false);
    expect(isContractGateOpen("none")).toBe(false);
  });
});

describe("canScheduleFire", () => {
  it("is false for a non-dispatching task (no fire row)", () => {
    expect(canScheduleFire(task({ taskId: "t", fire: null }))).toBe(false);
  });
  it("is false for an already-fired task", () => {
    expect(
      canScheduleFire(task({ taskId: "t", fire: { fireState: "fired", scheduledFor: null, autotaskQueueId: null, autotaskTicketId: 9, lastError: null } })),
    ).toBe(false);
  });
  it("is true for none/scheduled/failed (failed = retry)", () => {
    for (const s of ["none", "scheduled", "failed"] as const) {
      expect(
        canScheduleFire(task({ taskId: "t", fire: { fireState: s, scheduledFor: null, autotaskQueueId: null, autotaskTicketId: null, lastError: null } })),
      ).toBe(true);
    }
  });
});

describe("planFireIntent", () => {
  it("resolves a schedulable task to a 'scheduled' intent with the given date", () => {
    const intent = planFireIntent(task({ taskId: "t" }), "2026-07-01");
    expect(intent).toEqual({ fireState: "scheduled", scheduledFor: "2026-07-01" });
  });
  it("trims the date", () => {
    expect(planFireIntent(task({ taskId: "t" }), "  2026-07-01 ").scheduledFor).toBe("2026-07-01");
  });
  it("throws for an empty date", () => {
    expect(() => planFireIntent(task({ taskId: "t" }), "   ")).toThrow(/date is required/);
  });
  it("throws for an already-fired task", () => {
    const fired = task({ taskId: "t", fire: { fireState: "fired", scheduledFor: null, autotaskQueueId: null, autotaskTicketId: 1, lastError: null } });
    expect(() => planFireIntent(fired, "2026-07-01")).toThrow(/already fired/);
  });
});

describe("autotaskTicketUrl", () => {
  it("returns null without a base or without a ticket id (stub-off)", () => {
    expect(autotaskTicketUrl(123, null)).toBeNull();
    expect(autotaskTicketUrl(123, "")).toBeNull();
    expect(autotaskTicketUrl(null, "https://at.example.com")).toBeNull();
  });
  it("builds the ticket deep-link once a base is configured (trailing slash tolerated)", () => {
    expect(autotaskTicketUrl(123, "https://at.example.com/")).toBe(
      "https://at.example.com/Mvc/ServiceDesk/TicketDetail.mvc?ticketId=123",
    );
  });
});

describe("fireStateCounts", () => {
  it("counts by fire-state and ignores non-dispatching tasks", () => {
    const counts = fireStateCounts([
      task({ taskId: "a", fire: { fireState: "fired", scheduledFor: null, autotaskQueueId: null, autotaskTicketId: 1, lastError: null } }),
      task({ taskId: "b", fire: { fireState: "scheduled", scheduledFor: "2026-07-01", autotaskQueueId: null, autotaskTicketId: null, lastError: null } }),
      task({ taskId: "c", fire: null }),
    ]);
    expect(counts).toEqual({ none: 0, scheduled: 1, fired: 1, failed: 0 });
  });
});
