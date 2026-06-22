import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Grounding-conflict + domain-owner data layer (#1035, ADR-0119). Pins that every op routes
 * through withIdentity, reads compose filters with positional params, raise inserts the conflict
 * AND ledgers it, resolve only touches an OPEN row (stamping the resolver) AND ledgers it, and the
 * registry reads/writes round-trip. Same pool-seam mock style as personal-vault-sync.test.ts.
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
  listConflicts,
  raiseConflict,
  resolveConflict,
} from "./grounding-conflict";
import { assignDomainOwner, listDomainOwners } from "./domain-owner";
import type { GroundingConflictDraft } from "@/lib/grounding/authority";

const UID = "11111111-1111-1111-1111-111111111111";
const CID = "44444444-4444-4444-4444-444444444444";
const IDENTITY = { userId: UID, groups: ["sales"] };

const callsTo = (needle: string) =>
  clientQuery.mock.calls.filter((c) => (c[0] as string).includes(needle));
const findSelect = (table: string) =>
  clientQuery.mock.calls.find((c) => (c[0] as string).includes(`FROM ${table}`))!;

const DRAFT: GroundingConflictDraft = {
  servedTier: "canon",
  servedLabel: "Canon (OKF): C",
  canonClaim: "C",
  companyClaim: "S",
  personalClaim: "P",
  detail: "account: grounding tiers disagree",
};

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ connect });
  clientQuery.mockResolvedValue({ rows: [] });
});

describe("listConflicts", () => {
  it("defaults to the open set and composes domain filter with positional params", async () => {
    await listConflicts(IDENTITY, { status: "open", domain: "sales" });
    const select = findSelect("grounding_conflict");
    const sql = select[0] as string;
    expect(sql).toContain("status = $1");
    expect(sql).toContain("domain = $2");
    expect(select[1] as unknown[]).toEqual(["open", "sales"]);
  });

  it("runs inside withIdentity (BEGIN/COMMIT)", async () => {
    await listConflicts(IDENTITY);
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
  });

  it("returns [] in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    expect(await listConflicts(IDENTITY)).toEqual([]);
    expect(connect).not.toHaveBeenCalled();
  });
});

describe("raiseConflict", () => {
  it("inserts the conflict from a draft then ledgers the raise", async () => {
    clientQuery.mockImplementation(async (sql: string) =>
      sql.includes("INSERT INTO grounding_conflict\n")
        ? {
            rows: [
              {
                id: CID,
                domain: "sales",
                concept: "account",
                canon_claim: "C",
                company_claim: "S",
                personal_claim: "P",
                detail: "x",
                served_tier: "canon",
                served_label: "Canon (OKF): C",
                status: "open",
                resolution_tier: null,
                resolution_note: null,
                resolved_by: null,
                resolved_at: null,
                raised_by: "felix",
                created_at: "2026-06-22",
                updated_at: "2026-06-22",
              },
            ],
          }
        : { rows: [] },
    );
    const res = await raiseConflict(IDENTITY, {
      domain: "sales",
      concept: "account",
      raisedBy: "felix",
      draft: DRAFT,
    });
    expect(res?.id).toBe(CID);
    // ledgered the raise
    const ledger = callsTo("INSERT INTO grounding_conflict_event");
    expect(ledger).toHaveLength(1);
    expect(ledger[0][1] as unknown[]).toContain("felix");
    expect((ledger[0][1] as unknown[])[2]).toBe(JSON.stringify({ servedTier: "canon", domain: "sales", concept: "account" }));
  });
});

describe("resolveConflict", () => {
  it("updates only an OPEN row stamping the resolver, records tier + note, ledgers resolve", async () => {
    clientQuery.mockImplementation(async (sql: string) =>
      sql.includes("UPDATE grounding_conflict")
        ? {
            rows: [
              {
                id: CID,
                domain: "sales",
                concept: null,
                canon_claim: "C",
                company_claim: "S",
                personal_claim: null,
                detail: "x",
                served_tier: "canon",
                served_label: "Canon (OKF): C",
                status: "resolved",
                resolution_tier: "company_silver",
                resolution_note: "silver is right",
                resolved_by: UID,
                resolved_at: "2026-06-22",
                raised_by: null,
                created_at: "2026-06-01",
                updated_at: "2026-06-22",
              },
            ],
          }
        : { rows: [] },
    );
    const res = await resolveConflict(IDENTITY, CID, "resolved", {
      resolutionTier: "company_silver",
      note: "silver is right",
    });
    const update = callsTo("UPDATE grounding_conflict")[0];
    expect(update[0] as string).toContain("status = 'open'"); // only resolves open rows
    expect(update[1] as unknown[]).toEqual([CID, "resolved", "company_silver", "silver is right", UID]);
    expect(res?.status).toBe("resolved");
    expect(res?.resolutionTier).toBe("company_silver");
    const ledger = callsTo("INSERT INTO grounding_conflict_event");
    expect(ledger).toHaveLength(1);
    expect((ledger[0][1] as unknown[])[2]).toBe("resolve");
  });

  it("ledgers a dismiss action when dismissed", async () => {
    clientQuery.mockImplementation(async (sql: string) =>
      sql.includes("UPDATE grounding_conflict")
        ? { rows: [{ id: CID, domain: "sales", status: "dismissed", served_tier: "canon", served_label: "x", detail: "x", concept: null, canon_claim: null, company_claim: null, personal_claim: null, resolution_tier: null, resolution_note: null, resolved_by: UID, resolved_at: "x", raised_by: null, created_at: "x", updated_at: "x" }] }
        : { rows: [] },
    );
    await resolveConflict(IDENTITY, CID, "dismissed");
    const ledger = callsTo("INSERT INTO grounding_conflict_event")[0];
    expect((ledger[1] as unknown[])[2]).toBe("dismiss");
  });

  it("refuses (returns null) when app_user.id is unresolved", async () => {
    const res = await resolveConflict({ groups: [] }, CID, "dismissed");
    expect(res).toBeNull();
    expect(connect).not.toHaveBeenCalled();
  });
});

describe("domain_owner registry", () => {
  it("lists the registry alphabetically with no owner WHERE clause", async () => {
    await listDomainOwners(IDENTITY);
    const select = findSelect("domain_owner")[0] as string;
    expect(select).toContain("ORDER BY domain ASC");
  });

  it("assigns an owner (and optional fallback) by domain", async () => {
    await assignDomainOwner(IDENTITY, "sales", UID, "support");
    const update = callsTo("UPDATE domain_owner")[0];
    const sql = update[0] as string;
    expect(sql).toContain("owner_user_id = $2");
    expect(sql).toContain("fallback_role_slug = $3");
    expect(update[1] as unknown[]).toEqual(["sales", UID, "support"]);
  });

  it("omits the fallback set when not provided", async () => {
    await assignDomainOwner(IDENTITY, "sales", null);
    const update = callsTo("UPDATE domain_owner")[0];
    expect(update[0] as string).not.toContain("fallback_role_slug =");
    expect(update[1] as unknown[]).toEqual(["sales", null]);
  });
});
