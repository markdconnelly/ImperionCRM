import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * personal_fact data layer (#1155, ADR-0114) — the personal-tier temporal KG.
 * Pins that every op routes through withIdentity (so owner-axis RLS applies),
 * reads carry NO owner_user_id WHERE clause (RLS supplies it), add stamps the
 * resolved app_user.id and maps polymorphic provenance, invalidate only closes a
 * live window, and timeline/current shape their predicates. Same pool-seam mock
 * style as memory-drawer.test.ts.
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

import { addFact, current, invalidateFact, timeline } from "./personal-fact";

const UID = "11111111-1111-1111-1111-111111111111";
const FID = "33333333-3333-3333-3333-333333333333";
const SRC = "22222222-2222-2222-2222-222222222222";
const IDENTITY = { userId: UID, groups: ["support"] };

const ROW = {
  id: FID,
  room_path: "user/clients/acme",
  subject: "acme",
  predicate: "uses",
  object: "Autotask",
  valid_from: "2026-06-01",
  valid_to: null,
  source_kind: "memory_drawer",
  source_id: SRC,
  confidence: 0.9,
  created_at: "2026-06-01",
  updated_at: "2026-06-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ connect });
  clientQuery.mockResolvedValue({ rows: [] });
});

describe("addFact", () => {
  it("INSERTs an owner-scoped fact stamping owner_user_id and polymorphic source", async () => {
    clientQuery.mockImplementation(async (sql: string) =>
      sql.includes("INSERT INTO personal_fact") ? { rows: [ROW] } : { rows: [] },
    );
    const fact = await addFact(IDENTITY, {
      roomPath: "user/clients/acme",
      subject: "acme",
      predicate: "uses",
      object: "Autotask",
      source: { kind: "memory_drawer", id: SRC },
      confidence: 0.9,
    });
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(sqls.some((s) => s.includes("app.user_id"))).toBe(true);
    const insert = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("INSERT INTO personal_fact"),
    )!;
    expect(insert[0] as string).toContain("owner_user_id");
    const params = insert[1] as unknown[];
    expect(params[0]).toBe(UID); // owner stamped from resolved app_user.id
    expect(params[6]).toBe("memory_drawer"); // source_kind
    expect(params[7]).toBe(SRC); // source_id
    // maps the polymorphic source pair back to a structured ref
    expect(fact?.source).toEqual({ kind: "memory_drawer", id: SRC });
    expect(fact?.validTo).toBeNull();
  });

  it("passes null source when omitted (both-or-neither)", async () => {
    await addFact(IDENTITY, {
      roomPath: "user/notes",
      subject: "x",
      predicate: "is",
      object: "y",
    });
    const insert = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("INSERT INTO personal_fact"),
    )!;
    const params = insert[1] as unknown[];
    expect(params[6]).toBeNull(); // source_kind
    expect(params[7]).toBeNull(); // source_id
  });

  it("refuses (returns null) when app_user.id is unresolved — no owner, no row", async () => {
    const fact = await addFact(
      { groups: [] },
      { roomPath: "r", subject: "s", predicate: "p", object: "o" },
    );
    expect(fact).toBeNull();
    expect(connect).not.toHaveBeenCalled();
  });

  it("returns null in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    const fact = await addFact(IDENTITY, {
      roomPath: "r",
      subject: "s",
      predicate: "p",
      object: "o",
    });
    expect(fact).toBeNull();
  });
});

describe("invalidateFact", () => {
  it("closes only a live window (valid_to IS NULL) and returns the updated fact", async () => {
    clientQuery.mockImplementation(async (sql: string) =>
      sql.includes("UPDATE personal_fact")
        ? { rows: [{ ...ROW, valid_to: "2026-06-22" }] }
        : { rows: [] },
    );
    const fact = await invalidateFact(IDENTITY, FID);
    const update = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("UPDATE personal_fact"),
    )!;
    expect(update[0] as string).toContain("SET valid_to = now()");
    expect(update[0] as string).toContain("valid_to IS NULL");
    expect((update[1] as unknown[])[0]).toBe(FID);
    expect(fact?.validTo).toBe("2026-06-22");
  });

  it("returns null when nothing matched (already closed / not owned)", async () => {
    const fact = await invalidateFact(IDENTITY, FID);
    expect(fact).toBeNull();
  });
});

describe("timeline", () => {
  it("orders by validity window and relies on RLS — no owner_user_id WHERE", async () => {
    await timeline(IDENTITY, "acme");
    const select = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("FROM personal_fact"),
    )![0] as string;
    expect(select).toContain("subject = $1");
    expect(select).toContain("ORDER BY valid_from ASC");
    expect(select).not.toContain("owner_user_id");
  });

  it("adds a room_path filter when given", async () => {
    await timeline(IDENTITY, "acme", { roomPath: "user/clients/acme" });
    const select = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("FROM personal_fact"),
    )!;
    expect(select[0] as string).toContain("room_path = $2");
    expect((select[1] as unknown[])[1]).toBe("user/clients/acme");
  });
});

describe("current", () => {
  it("filters to the live set (valid_to IS NULL) and relies on RLS", async () => {
    await current(IDENTITY);
    const select = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("FROM personal_fact"),
    )![0] as string;
    expect(select).toContain("valid_to IS NULL");
    expect(select).not.toContain("owner_user_id");
  });

  it("composes subject + room_path filters with positional params", async () => {
    await current(IDENTITY, { subject: "acme", roomPath: "user/clients/acme" });
    const select = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("FROM personal_fact"),
    )!;
    const sql = select[0] as string;
    expect(sql).toContain("subject = $1");
    expect(sql).toContain("room_path = $2");
    expect(select[1] as unknown[]).toEqual(["acme", "user/clients/acme"]);
  });

  it("returns [] in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    expect(await current(IDENTITY)).toEqual([]);
    expect(connect).not.toHaveBeenCalled();
  });
});
