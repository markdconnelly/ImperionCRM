import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Curated Vault sync data layer (#1157, ADR-0114) — personal_vault_file,
 * personal_contradiction, personal_curation_event. Pins that every op routes
 * through withIdentity (owner-axis RLS), reads carry NO owner_user_id WHERE clause
 * (RLS supplies it), filters compose with positional params, and resolve only
 * touches an OPEN contradiction stamping the owner. Same pool-seam mock style as
 * memory-drawer.test.ts.
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

import { listVaultFiles } from "./personal-vault-file";
import { listContradictions, resolveContradiction } from "./personal-contradiction";
import { listCurationEvents } from "./personal-curation-event";

const UID = "11111111-1111-1111-1111-111111111111";
const CID = "44444444-4444-4444-4444-444444444444";
const IDENTITY = { userId: UID, groups: ["support"] };

const findSelect = (table: string) =>
  clientQuery.mock.calls.find((c) => (c[0] as string).includes(`FROM ${table}`))!;

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ connect });
  clientQuery.mockResolvedValue({ rows: [] });
});

describe("listVaultFiles", () => {
  it("runs inside withIdentity and relies on RLS — no owner_user_id WHERE", async () => {
    await listVaultFiles(IDENTITY);
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(sqls.some((s) => s.includes("app.user_id"))).toBe(true);
    const select = findSelect("personal_vault_file")[0] as string;
    expect(select).not.toContain("owner_user_id");
  });

  it("composes room_path + sync_state filters with positional params", async () => {
    await listVaultFiles(IDENTITY, { roomPath: "mark/projects", syncState: "conflict" });
    const select = findSelect("personal_vault_file");
    const sql = select[0] as string;
    expect(sql).toContain("room_path = $1");
    expect(sql).toContain("sync_state = $2");
    expect(select[1] as unknown[]).toEqual(["mark/projects", "conflict"]);
  });

  it("maps rows to the PersonalVaultFile shape", async () => {
    clientQuery.mockImplementation(async (sql: string) =>
      sql.includes("FROM personal_vault_file")
        ? {
            rows: [
              {
                id: "f1",
                room_path: "mark/projects",
                file_path: "mark/projects/decisions.md",
                blob_ref: "projects/decisions.md",
                content_hash: "abc",
                sync_state: "projected",
                synced_at: "2026-06-22",
                created_at: "2026-06-22",
                updated_at: "2026-06-22",
              },
            ],
          }
        : { rows: [] },
    );
    const files = await listVaultFiles(IDENTITY);
    expect(files[0]).toMatchObject({
      id: "f1",
      filePath: "mark/projects/decisions.md",
      blobRef: "projects/decisions.md",
      syncState: "projected",
    });
  });

  it("returns [] in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    expect(await listVaultFiles(IDENTITY)).toEqual([]);
    expect(connect).not.toHaveBeenCalled();
  });
});

describe("listContradictions", () => {
  it("defaults to the open set and relies on RLS", async () => {
    await listContradictions(IDENTITY);
    const select = findSelect("personal_contradiction");
    expect(select[0] as string).toContain("status = $1");
    expect(select[0] as string).not.toContain("owner_user_id");
    expect((select[1] as unknown[])[0]).toBe("open");
  });
});

describe("resolveContradiction", () => {
  it("updates only an OPEN row, stamping the owner as resolved_by", async () => {
    clientQuery.mockImplementation(async (sql: string) =>
      sql.includes("UPDATE personal_contradiction")
        ? {
            rows: [
              {
                id: CID,
                room_path: null,
                fact_a_id: null,
                fact_b_id: null,
                vault_file_id: null,
                detail: "x",
                status: "approved",
                resolved_by: UID,
                resolved_at: "2026-06-22",
                created_at: "2026-06-01",
                updated_at: "2026-06-22",
              },
            ],
          }
        : { rows: [] },
    );
    const res = await resolveContradiction(IDENTITY, CID, "approved");
    const update = clientQuery.mock.calls.find((c) =>
      (c[0] as string).includes("UPDATE personal_contradiction"),
    )!;
    expect(update[0] as string).toContain("status = 'open'"); // only resolves open rows
    const params = update[1] as unknown[];
    expect(params).toEqual([CID, "approved", UID]);
    expect(res?.status).toBe("approved");
    expect(res?.resolvedBy).toBe(UID);
  });

  it("refuses (returns null) when app_user.id is unresolved", async () => {
    const res = await resolveContradiction({ groups: [] }, CID, "dismissed");
    expect(res).toBeNull();
    expect(connect).not.toHaveBeenCalled();
  });
});

describe("listCurationEvents", () => {
  it("reads the caller's ledger newest-first via RLS, with a limit", async () => {
    await listCurationEvents(IDENTITY, 25);
    const select = findSelect("personal_curation_event");
    expect(select[0] as string).toContain("ORDER BY at DESC");
    expect(select[0] as string).not.toContain("owner_user_id");
    expect((select[1] as unknown[])[0]).toBe(25);
  });

  it("returns [] in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    expect(await listCurationEvents(IDENTITY)).toEqual([]);
  });
});
