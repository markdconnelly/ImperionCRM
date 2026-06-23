import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * curation_promotion data layer — the human-review surface of the cross-wall curation
 * identity (#981, ADR-0105 §3c). Pins the WIRING: reviewer-only access (defense-in-depth above
 * the RLS reviewer policy), reads/writes route through withIdentity (so the reviewer policy
 * applies), the status transition is fromStatus-guarded, and every applied/rejected decision is
 * ledgered to curation_event in the SAME transaction (the §3c append-only audit invariant).
 * Actual RLS enforcement + the promoter's non-impersonation are DB properties
 * (docs/testing/rls-access-spine.md); these pin the app-layer behaviour. Mocks the pool seam
 * (same style as personal-note.test.ts) so the real withIdentity transaction runs.
 */
const { connect, clientQuery, getPool } = vi.hoisted(() => {
  const clientQuery =
    vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(async () => ({
      rows: [],
    }));
  const release = vi.fn();
  const connect = vi.fn(async () => ({ query: clientQuery, release }));
  const getPool = vi.fn((): unknown => ({ connect }));
  return { connect, clientQuery, release, getPool };
});
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import {
  CURATION_EVENT_APPLIED,
  CURATION_EVENT_REJECTED,
  applyPromotion,
  approvePromotion,
  listPendingPromotions,
  rejectPromotion,
} from "./curation-promotion";

const REVIEWER_UID = "11111111-1111-1111-1111-111111111111";
const OWNER = "22222222-2222-2222-2222-222222222222";
const PROMO = "33333333-3333-3333-3333-333333333333";
const REVIEWER = { userId: REVIEWER_UID, groups: ["admin"] };
const TECH = { userId: REVIEWER_UID, groups: ["support"] };

function promoRow(status: string) {
  return {
    id: PROMO,
    source_kind: "personal_fact",
    source_id: "f1",
    source_owner_user_id: OWNER,
    proposed_subject: "AcmeCorp",
    proposed_predicate: "prefers",
    proposed_object: "weekly reports",
    rationale: "stated in 1:1",
    confidence: 0.9,
    status,
    proposed_by: "imperion-curation-promoter",
    proposed_at: "2026-06-23",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ connect });
  clientQuery.mockResolvedValue({ rows: [] });
});

describe("listPendingPromotions", () => {
  it("refuses (returns null) for a non-reviewer — never opens a transaction", async () => {
    const result = await listPendingPromotions(TECH);
    expect(result).toBeNull();
    expect(connect).not.toHaveBeenCalled();
  });

  it("runs inside a withIdentity transaction carrying app.groups for the reviewer policy", async () => {
    await listPendingPromotions(REVIEWER);
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(sqls.some((s) => s.includes("app.groups"))).toBe(true);
  });

  it("defaults to the draft (pending) status and maps rows", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM curation_promotion")) return { rows: [promoRow("draft")] };
      return { rows: [] };
    });
    const promos = await listPendingPromotions(REVIEWER);
    const select = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("FROM curation_promotion"),
    )!;
    expect((select[1] as unknown[])[0]).toBe("draft");
    expect(promos![0]).toMatchObject({
      id: PROMO,
      sourceOwnerUserId: OWNER,
      proposedSubject: "AcmeCorp",
      status: "draft",
      proposedBy: "imperion-curation-promoter",
    });
  });

  it("returns [] in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    expect(await listPendingPromotions(REVIEWER)).toEqual([]);
    expect(connect).not.toHaveBeenCalled();
  });
});

describe("approvePromotion", () => {
  it("refuses (returns null) for a non-reviewer", async () => {
    expect(await approvePromotion(TECH, PROMO)).toBeNull();
    expect(connect).not.toHaveBeenCalled();
  });

  it("flips draft → approved guarded on the from-status, and does NOT ledger (interim step)", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("UPDATE curation_promotion")) return { rows: [promoRow("approved")] };
      return { rows: [] };
    });
    const result = await approvePromotion(REVIEWER, PROMO);
    const update = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("UPDATE curation_promotion"),
    )!;
    // status=$1=approved, reviewer=$2, id=$3, from-status=$4=draft
    expect((update[1] as unknown[])[0]).toBe("approved");
    expect((update[1] as unknown[])[1]).toBe(REVIEWER_UID);
    expect((update[1] as unknown[])[3]).toBe("draft");
    expect(update[0] as string).toContain("AND status = $4");
    // approve is an interim decision — not a cross-wall curation_event
    const ledgered = clientQuery.mock.calls.some((c) =>
      (c[0] as string).includes("INSERT INTO curation_event"),
    );
    expect(ledgered).toBe(false);
    expect(result).toMatchObject({ status: "approved" });
  });

  it("returns null when no row matched the expected state (no ledger written)", async () => {
    clientQuery.mockResolvedValue({ rows: [] }); // UPDATE matched nothing
    const result = await approvePromotion(REVIEWER, PROMO);
    expect(result).toBeNull();
    const ledgered = clientQuery.mock.calls.some((c) =>
      (c[0] as string).includes("INSERT INTO curation_event"),
    );
    expect(ledgered).toBe(false);
  });
});

describe("applyPromotion", () => {
  it("flips approved → applied and LEDGERS a curation_event('applied') in the same transaction", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("UPDATE curation_promotion")) return { rows: [promoRow("applied")] };
      return { rows: [] };
    });
    const result = await applyPromotion(REVIEWER, PROMO);
    const update = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("UPDATE curation_promotion"),
    )!;
    expect((update[1] as unknown[])[0]).toBe("applied");
    expect((update[1] as unknown[])[3]).toBe("approved"); // from-status guard
    const ledger = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("INSERT INTO curation_event"),
    )!;
    const params = ledger[1] as unknown[];
    expect(params[0]).toBe("imperion-curation-promoter"); // actor = the service identity
    expect(params[1]).toBe(CURATION_EVENT_APPLIED);
    expect(params[2]).toBe(PROMO);
    expect(params[5]).toBe(OWNER); // crossed owner recorded
    // the ledger commits in the SAME transaction as the UPDATE (BEGIN … UPDATE … INSERT … COMMIT)
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(result).toMatchObject({ status: "applied" });
  });

  it("does NOT leak proposed content into the curation_event detail (no PII in the ledger)", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("UPDATE curation_promotion")) return { rows: [promoRow("applied")] };
      return { rows: [] };
    });
    await applyPromotion(REVIEWER, PROMO);
    const ledger = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("INSERT INTO curation_event"),
    )!;
    expect(JSON.stringify(ledger[1])).not.toContain("weekly reports");
    expect(JSON.stringify(ledger[1])).not.toContain("stated in 1:1");
  });
});

describe("rejectPromotion", () => {
  it("flips draft → rejected and LEDGERS a curation_event('rejected')", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("UPDATE curation_promotion")) return { rows: [promoRow("rejected")] };
      return { rows: [] };
    });
    const result = await rejectPromotion(REVIEWER, PROMO);
    const update = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("UPDATE curation_promotion"),
    )!;
    expect((update[1] as unknown[])[0]).toBe("rejected");
    expect((update[1] as unknown[])[3]).toBe("draft"); // from-status guard
    const ledger = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("INSERT INTO curation_event"),
    )!;
    expect((ledger[1] as unknown[])[1]).toBe(CURATION_EVENT_REJECTED);
    expect(result).toMatchObject({ status: "rejected" });
  });
});
