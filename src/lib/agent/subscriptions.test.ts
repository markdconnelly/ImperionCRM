import { afterEach, describe, expect, it, vi } from "vitest";

// `server-only` is a Next.js build-time guard with no runtime export; stub it under vitest.
vi.mock("server-only", () => ({}));

// The read-side degrades on no-DB → mock rows, and on query failure → empty list. We mock the
// pool accessor to drive both tiers (mirrors the icm-runs read-side pattern).
const mocks = vi.hoisted(() => ({ getPool: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getPool: mocks.getPool }));

import { listAgentSubscriptions, type AgentSubscriptionPredicate } from "./subscriptions";

afterEach(() => vi.clearAllMocks());

describe("listAgentSubscriptions", () => {
  it("returns mock rows when the DB is unset", async () => {
    mocks.getPool.mockReturnValue(null);
    const rows = await listAgentSubscriptions();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toMatchObject({ eventType: "autotask.ticket.created", workflowKey: "technician" });
  });

  it("filters mock rows by event type when the DB is unset", async () => {
    mocks.getPool.mockReturnValue(null);
    const rows = await listAgentSubscriptions("autotask.ticket.created");
    expect(rows.every((r) => r.eventType === "autotask.ticket.created")).toBe(true);
  });

  it("maps DB rows (snake_case → camelCase, predicate defaulted to {})", async () => {
    const now = new Date("2026-06-22T00:00:00Z");
    mocks.getPool.mockReturnValue({
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: "s1",
            event_type: "autotask.ticket.created",
            workflow_key: "vcio",
            predicate: { field: "account.tier", op: "eq", value: "tier-1" },
            enabled: true,
            description: null,
            created_at: now,
            updated_at: now,
          },
          {
            id: "s2",
            event_type: "autotask.ticket.created",
            workflow_key: "technician",
            predicate: null, // NULL → {} (match-all)
            enabled: true,
            description: "wedge",
            created_at: now,
            updated_at: now,
          },
        ],
      }),
    });
    const rows = await listAgentSubscriptions("autotask.ticket.created");
    expect(rows[0]).toMatchObject({ id: "s1", workflowKey: "vcio" });
    expect(rows[0].predicate).toEqual({ field: "account.tier", op: "eq", value: "tier-1" });
    expect(rows[1].predicate).toEqual({}); // null normalized to match-all
  });

  it("degrades to an empty list on query failure (never throws)", async () => {
    mocks.getPool.mockReturnValue({ query: vi.fn().mockRejectedValue(new Error("db down")) });
    await expect(listAgentSubscriptions()).resolves.toEqual([]);
  });

  it("the predicate type admits leaf, compound, and match-all shapes (compile-time contract)", () => {
    const leaf: AgentSubscriptionPredicate = { field: "severity", op: "in", value: ["high"] };
    const compound: AgentSubscriptionPredicate = {
      all: [leaf, { not: { field: "queueId", op: "eq", value: 99 } }],
    };
    const matchAll: AgentSubscriptionPredicate = {};
    expect([leaf, compound, matchAll]).toHaveLength(3);
  });
});
