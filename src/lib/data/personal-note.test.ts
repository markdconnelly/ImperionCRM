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

import { createPersonalNote, listPersonalNotes } from "./personal-note";

const UID = "11111111-1111-1111-1111-111111111111";
const IDENTITY = { userId: UID, groups: ["support"] };

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
