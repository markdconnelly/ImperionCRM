import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * personal_note data layer (#975). Pins that reads/writes route through
 * withIdentity (so the RLS owner policy applies), the SELECT relies on RLS
 * rather than an owner_user_id WHERE clause, and INSERT stamps owner_user_id
 * from the resolved app_user.id. Mocks the pool seam (same style as
 * delivery-templates.test.ts) so the real withIdentity transaction runs.
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
  PERSONAL_NOTE_GODVIEW_ACTION,
  createPersonalNote,
  listAllPersonalNotesAsAdmin,
  listPersonalNotes,
} from "./personal-note";

const UID = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const IDENTITY = { userId: UID, groups: ["support"] };
const ADMIN = { userId: UID, groups: ["admin"] };

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ connect });
  clientQuery.mockResolvedValue({ rows: [] });
});

describe("listPersonalNotes", () => {
  it("runs inside a withIdentity transaction that sets app.user_id", async () => {
    await listPersonalNotes(IDENTITY);
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(sqls.some((s) => s.includes("app.user_id"))).toBe(true);
  });

  it("the SELECT relies on RLS — no owner_user_id WHERE clause", async () => {
    await listPersonalNotes(IDENTITY);
    const select = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("FROM personal_note"),
    )![0] as string;
    expect(select).not.toMatch(/where/i);
    expect(select).not.toContain("owner_user_id");
  });

  it("maps rows to the PersonalNote shape", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM personal_note")) {
        return {
          rows: [{ id: "n1", body: "hi", created_at: "2026-06-20", updated_at: "2026-06-20" }],
        };
      }
      return { rows: [] };
    });
    const notes = await listPersonalNotes(IDENTITY);
    expect(notes).toEqual([
      { id: "n1", body: "hi", createdAt: "2026-06-20", updatedAt: "2026-06-20" },
    ]);
  });

  it("returns [] in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    expect(await listPersonalNotes(IDENTITY)).toEqual([]);
    expect(connect).not.toHaveBeenCalled();
  });
});

describe("createPersonalNote", () => {
  it("INSERTs with owner_user_id = the resolved app_user.id", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO personal_note")) {
        return {
          rows: [{ id: "n1", body: "note", created_at: "t", updated_at: "t" }],
        };
      }
      return { rows: [] };
    });
    const note = await createPersonalNote(IDENTITY, "note");
    const insert = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("INSERT INTO personal_note"),
    )!;
    expect(insert[0] as string).toContain("owner_user_id");
    expect((insert[1] as unknown[])[0]).toBe(UID); // owner = app_user.id
    expect(note).toEqual({ id: "n1", body: "note", createdAt: "t", updatedAt: "t" });
  });

  it("refuses (returns null) when app_user.id is unresolved — no owner, no row", async () => {
    const note = await createPersonalNote({ groups: [] }, "note");
    expect(note).toBeNull();
    expect(connect).not.toHaveBeenCalled(); // never opens a transaction
  });
});

describe("listAllPersonalNotesAsAdmin (audited god-view, #980)", () => {
  it("refuses (returns null) for a non-admin caller — never opens a transaction", async () => {
    const result = await listAllPersonalNotesAsAdmin(IDENTITY); // support, not admin
    expect(result).toBeNull();
    expect(connect).not.toHaveBeenCalled();
  });

  it("runs inside a withIdentity transaction (carrying app.groups for the policy)", async () => {
    await listAllPersonalNotesAsAdmin(ADMIN);
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(sqls.some((s) => s.includes("app.groups"))).toBe(true);
  });

  it("the SELECT relies on the permissive RLS policy — no owner_user_id WHERE clause", async () => {
    await listAllPersonalNotesAsAdmin(ADMIN);
    const select = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("FROM personal_note"),
    )![0] as string;
    expect(select).not.toMatch(/where/i);
  });

  it("ledgers ONE audit_log event when rows the admin does not own are returned", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM personal_note")) {
        return {
          rows: [
            { id: "n1", owner_user_id: OTHER, body: "a", created_at: "t", updated_at: "t" },
            { id: "n2", owner_user_id: OTHER, body: "b", created_at: "t", updated_at: "t" },
            { id: "n3", owner_user_id: UID, body: "mine", created_at: "t", updated_at: "t" },
          ],
        };
      }
      return { rows: [] };
    });
    const notes = await listAllPersonalNotesAsAdmin(ADMIN);
    const audits = clientQuery.mock.calls.filter((c) =>
      (c[0] as string).includes("INSERT INTO audit_log"),
    );
    expect(audits).toHaveLength(1); // one per access event, not per row
    const [audit] = audits;
    const params = audit[1] as unknown[];
    expect(params[0]).toBe(UID); // actor = admin's app_user.id
    expect(params[1]).toBe(PERSONAL_NOTE_GODVIEW_ACTION);
    expect(params[2]).toBe(2); // only the two cross-owner notes counted
    expect(JSON.parse(params[3] as string)).toEqual([OTHER]); // distinct owners crossed
    expect(notes).toHaveLength(3); // all rows returned (god-view), owner carried back
    expect(notes![0]).toMatchObject({ id: "n1", ownerUserId: OTHER });
  });

  it("does NOT audit when the admin saw only their own notes (not a god-view event)", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM personal_note")) {
        return {
          rows: [{ id: "n1", owner_user_id: UID, body: "mine", created_at: "t", updated_at: "t" }],
        };
      }
      return { rows: [] };
    });
    await listAllPersonalNotesAsAdmin(ADMIN);
    const audited = clientQuery.mock.calls.some((c) =>
      (c[0] as string).includes("INSERT INTO audit_log"),
    );
    expect(audited).toBe(false);
  });

  it("does NOT log note bodies into the audit detail (no PII in the ledger)", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM personal_note")) {
        return {
          rows: [
            { id: "n1", owner_user_id: OTHER, body: "SECRET-BODY", created_at: "t", updated_at: "t" },
          ],
        };
      }
      return { rows: [] };
    });
    await listAllPersonalNotesAsAdmin(ADMIN);
    const audit = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("INSERT INTO audit_log"),
    )!;
    expect(JSON.stringify(audit[1])).not.toContain("SECRET-BODY");
  });

  it("returns [] in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    expect(await listAllPersonalNotesAsAdmin(ADMIN)).toEqual([]);
    expect(connect).not.toHaveBeenCalled();
  });
});
