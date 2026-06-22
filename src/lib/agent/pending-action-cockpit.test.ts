import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pins the L4 oversight read (#1202, ADR-0107 D5 / ADR-0109): `listExecutedActions`
 * reads only terminal/executed `agent_pending_action` rows, maps the execution provenance
 * (status, decided_by/at, interaction_id) + the agent roster label + the ticket target,
 * and degrades to mock/empty exactly like the pending read (DB unset → sample; query
 * failure → []). The query is scoped to `status IN ('executed','expired')`.
 */
const { poolQuery, getPool } = vi.hoisted(() => {
  const poolQuery =
    vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(async () => ({
      rows: [],
    }));
  const getPool = vi.fn((): unknown => ({ query: poolQuery }));
  return { poolQuery, getPool };
});
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { listExecutedActions } from "./pending-action-cockpit";

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query: poolQuery });
  poolQuery.mockResolvedValue({ rows: [] });
});

describe("listExecutedActions", () => {
  it("scopes the query to executed + expired rows, newest decision first", async () => {
    await listExecutedActions();
    const [sql] = poolQuery.mock.calls[0];
    expect(sql).toContain("FROM agent_pending_action");
    expect(sql).toContain("status IN ('executed', 'expired')");
    expect(sql).toContain("decided_at DESC NULLS LAST");
  });

  it("maps execution provenance, the roster label, and a ticket target", async () => {
    poolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "row-1",
          agent_key: "sales",
          action_kind: "send_email",
          tier: "T2",
          rationale: "L4 follow-up",
          resolved_level: 4,
          resolved_ceiling: "T2",
          payload: { body: "Hi there", runId: "run-9" },
          status: "executed",
          decided_by_user_id: "user-7",
          decided_at: "2026-06-21T16:40:00Z",
          created_at: "2026-06-21T16:39:30Z",
          interaction_id: "int-3",
          ticket_id: "tkt-1",
          ticket_number: "T20260621.0051",
          ticket_title: "Switch flapping",
        },
      ],
    });
    const [item] = await listExecutedActions();
    expect(item).toMatchObject({
      id: "row-1",
      agentLabel: "Chase · Sales",
      status: "executed",
      resolvedLevel: 4,
      decidedByUserId: "user-7",
      interactionId: "int-3",
      draft: "Hi there",
      runId: "run-9",
    });
    expect(item.target).toMatchObject({ label: "T20260621.0051 · Switch flapping" });
    expect(item.target?.href).toContain("T20260621.0051");
  });

  it("falls back to mock executed rows in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    const items = await listExecutedActions();
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.status === "executed" || i.status === "expired")).toBe(true);
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it("returns [] on a query failure (never a page error)", async () => {
    poolQuery.mockRejectedValueOnce(new Error("db down"));
    await expect(listExecutedActions()).resolves.toEqual([]);
  });
});
