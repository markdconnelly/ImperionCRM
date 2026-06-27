import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pins the agent-governance write actions (#1408): each admin save UPDATEs the right
 * seeded key in `agent_governance_setting` with a JSON-encoded value, clamps numeric
 * input to the documented bounds, normalizes the kill-switch slug lists, stamps
 * `updated_by`, and is a no-op (no query) when no DB is configured. The capability
 * gate is asserted by mocking `requireCapability`.
 */
const { poolQuery, getPool, requireCapability } = vi.hoisted(() => {
  const poolQuery = vi.fn(async () => ({ rows: [] }));
  const getPool = vi.fn((): unknown => ({ query: poolQuery }));
  const requireCapability = vi.fn(async () => ["admin"]);
  return { poolQuery, getPool, requireCapability };
});
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("@/lib/auth/guard", () => ({ requireCapability }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { email: "admin@imperion.test" } })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("server-only", () => ({}));

import { saveKillSwitchAction, saveOptoutDefaultAction, saveCapsAction } from "./actions";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

/** Find the [sql, params] of the UPDATE that targets `key`. */
function callForKey(key: string): [string, unknown[]] | undefined {
  return poolQuery.mock.calls.find((c) => (c as unknown[])[1] && ((c as unknown[])[1] as unknown[])[2] === key) as
    | [string, unknown[]]
    | undefined;
}

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query: poolQuery });
  poolQuery.mockResolvedValue({ rows: [] });
  requireCapability.mockResolvedValue(["admin"]);
});

describe("saveKillSwitchAction", () => {
  it("requires agents:operate and writes a normalized scope", async () => {
    await saveKillSwitchAction(form({ global: "on", per_agent: "Felix, chase", per_workflow: "technician" }));
    expect(requireCapability).toHaveBeenCalledWith("agents:operate");
    const call = callForKey("killswitch.scope");
    expect(call).toBeDefined();
    const [sql, params] = call!;
    expect(sql).toContain("UPDATE agent_governance_setting");
    expect(JSON.parse(params[0] as string)).toEqual({
      global: true,
      per_agent: ["felix", "chase"],
      per_workflow: ["technician"],
    });
    expect(params[1]).toBe("admin@imperion.test"); // updated_by attribution
  });

  it("unchecked global + empty lists writes an all-off scope", async () => {
    await saveKillSwitchAction(form({ per_agent: "", per_workflow: "" }));
    const [, params] = callForKey("killswitch.scope")!;
    expect(JSON.parse(params[0] as string)).toEqual({ global: false, per_agent: [], per_workflow: [] });
  });
});

describe("saveOptoutDefaultAction", () => {
  it("accepts a valid literal", async () => {
    await saveOptoutDefaultAction(form({ optout_default: "opt_out" }));
    expect(JSON.parse(callForKey("optout.default")![1][0] as string)).toBe("opt_out");
  });
  it("falls back to the default on a bad value", async () => {
    await saveOptoutDefaultAction(form({ optout_default: "garbage" }));
    expect(JSON.parse(callForKey("optout.default")![1][0] as string)).toBe("opt_in");
  });
});

describe("saveCapsAction", () => {
  it("clamps out-of-range values and writes all five keys", async () => {
    await saveCapsAction(
      form({
        rate_per_minute: "0", // below min 1 → 1
        fanout_per_run: "99999", // above max 1000 → 1000
        cost_usd_per_run: "5.005", // → 5.01 (2dp)
        error_rate: "2", // above max 1 → 1
        approval_ttl_days: "10",
      }),
    );
    expect(JSON.parse(callForKey("caps.rate_per_minute")![1][0] as string)).toBe(1);
    expect(JSON.parse(callForKey("caps.fanout_per_run")![1][0] as string)).toBe(1000);
    expect(JSON.parse(callForKey("caps.cost_usd_per_run")![1][0] as string)).toBe(5.01);
    expect(JSON.parse(callForKey("circuit_breaker.error_rate")![1][0] as string)).toBe(1);
    expect(JSON.parse(callForKey("approval.ttl_days")![1][0] as string)).toBe(10);
    expect(poolQuery).toHaveBeenCalledTimes(5);
  });
});

describe("no DB configured", () => {
  it("is a no-op (no query) in mock mode", async () => {
    getPool.mockReturnValue(null);
    await saveCapsAction(form({ rate_per_minute: "30" }));
    expect(poolQuery).not.toHaveBeenCalled();
  });
});
