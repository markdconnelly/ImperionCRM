import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * memory_drawer data layer (#1163, ADR-0113). Pins that reads/writes route through
 * withIdentity (so the two-axis RLS applies), the recent-memory SELECT relies on
 * RLS rather than an owner_user_id WHERE clause, conversation drill-down filters by
 * conversation_id, and a user note stamps owner_user_id from the resolved
 * app_user.id (refusing when unresolved). Same pool-seam mock style as
 * personal-note.test.ts.
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

import { createDrawerNote, listConversationDrawers, listRecentDrawers } from "./memory-drawer";

const UID = "11111111-1111-1111-1111-111111111111";
const CONV = "22222222-2222-2222-2222-222222222222";
const IDENTITY = { userId: UID, groups: ["support"] };

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ connect });
  clientQuery.mockResolvedValue({ rows: [] });
});

describe("listConversationDrawers", () => {
  it("runs inside a withIdentity transaction and filters by conversation_id", async () => {
    await listConversationDrawers(IDENTITY, CONV);
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(sqls.some((s) => s.includes("app.user_id"))).toBe(true);
    const select = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("FROM memory_drawer"),
    )!;
    expect(select[0] as string).toContain("conversation_id = $1");
    expect((select[1] as unknown[])[0]).toBe(CONV);
  });

  it("maps rows to the MemoryDrawerTurn shape", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM memory_drawer")) {
        return {
          rows: [
            {
              id: "t1",
              conversation_id: CONV,
              turn_index: 0,
              wing: `user:${UID}`,
              room: "kickoff-call",
              role: "participant",
              body: "verbatim text",
              created_at: "2026-06-21",
            },
          ],
        };
      }
      return { rows: [] };
    });
    const turns = await listConversationDrawers(IDENTITY, CONV);
    expect(turns).toEqual([
      {
        id: "t1",
        conversationId: CONV,
        turnIndex: 0,
        wing: `user:${UID}`,
        room: "kickoff-call",
        role: "participant",
        body: "verbatim text",
        createdAt: "2026-06-21",
      },
    ]);
  });
});

describe("listRecentDrawers", () => {
  it("the SELECT relies on RLS — no owner_user_id WHERE clause", async () => {
    await listRecentDrawers(IDENTITY);
    const select = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("FROM memory_drawer"),
    )![0] as string;
    expect(select).not.toMatch(/where/i);
    expect(select).not.toContain("owner_user_id");
  });

  it("returns [] in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    expect(await listRecentDrawers(IDENTITY)).toEqual([]);
    expect(connect).not.toHaveBeenCalled();
  });
});

describe("createDrawerNote", () => {
  it("INSERTs an owner-scoped note with owner_user_id = the resolved app_user.id", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO memory_drawer")) {
        return {
          rows: [
            {
              id: "t1",
              conversation_id: CONV,
              turn_index: null,
              wing: `user:${UID}`,
              room: null,
              agent_id: null,
              role: "note",
              body: "remember this",
              created_at: "t",
            },
          ],
        };
      }
      return { rows: [] };
    });
    const note = await createDrawerNote(IDENTITY, { body: "remember this" });
    const insert = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("INSERT INTO memory_drawer"),
    )!;
    expect(insert[0] as string).toContain("owner_user_id");
    expect(insert[0] as string).toContain("md5($5)"); // content_hash computed in SQL
    // params: [conversationId, wing, room, owner_user_id, body]
    expect((insert[1] as unknown[])[3]).toBe(UID);
    expect((insert[1] as unknown[])[1]).toBe(`user:${UID}`); // default wing
    expect(note?.role).toBe("note");
  });

  it("refuses (returns null) when app_user.id is unresolved — no owner, no row", async () => {
    const note = await createDrawerNote({ groups: [] }, { body: "x" });
    expect(note).toBeNull();
    expect(connect).not.toHaveBeenCalled();
  });
});
