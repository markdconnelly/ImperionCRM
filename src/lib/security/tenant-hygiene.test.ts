import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam (same pattern as sensitivity-csa.test.ts) — the
// account-scoped tenant-hygiene reads (#260) are exercised against a fake pg pool,
// a null pool, and a schema-lag error. The benchmark functions are pure.
const { query, getPool } = vi.hoisted(() => ({
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [] }),
  ),
  getPool: vi.fn((): unknown => ({ query })),
}));
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({})); // Next.js marker module — inert under vitest

import {
  benchmarkAppCredentials,
  benchmarkRoleAssignments,
  listTenantHygieneForAccount,
  TENANT_HYGIENE_STANDARD,
} from "./tenant-hygiene";

describe("benchmarkRoleAssignments (#260 — ADR-0051 golden-baseline)", () => {
  it("counts DISTINCT privileged principals, de-duping a principal with several privileged roles", () => {
    const b = benchmarkRoleAssignments([
      { isPrivileged: true, principalId: "p1" },
      { isPrivileged: true, principalId: "p1" }, // same principal, second priv role
      { isPrivileged: true, principalId: "p2" },
      { isPrivileged: false, principalId: "p3" }, // non-priv — counts toward total only
      { isPrivileged: true, principalId: "" }, // blank id ignored
    ]);
    expect(b.privilegedPrincipals).toBe(2);
    expect(b.totalPrincipals).toBe(3);
    expect(b.cap).toBe(TENANT_HYGIENE_STANDARD.maxPrivilegedPrincipals);
    expect(b.status).toBe("ok");
  });

  it("warns past the cap, fails past 2x the cap", () => {
    const cap = TENANT_HYGIENE_STANDARD.maxPrivilegedPrincipals;
    const mk = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ isPrivileged: true, principalId: `p${i}` }));
    expect(benchmarkRoleAssignments(mk(cap)).status).toBe("ok");
    expect(benchmarkRoleAssignments(mk(cap + 1)).status).toBe("warn");
    expect(benchmarkRoleAssignments(mk(cap * 2)).status).toBe("warn");
    expect(benchmarkRoleAssignments(mk(cap * 2 + 1)).status).toBe("fail");
  });

  it("empty assignments are vacuously ok", () => {
    expect(benchmarkRoleAssignments([])).toMatchObject({
      privilegedPrincipals: 0,
      totalPrincipals: 0,
      status: "ok",
    });
  });
});

describe("benchmarkAppCredentials (#260 — ADR-0051 golden-baseline)", () => {
  const now = new Date("2026-06-17T00:00:00Z");

  it("fails on any expired credential (flag or past date), warns on expiring-soon, ok otherwise", () => {
    const b = benchmarkAppCredentials(
      [
        { earliestCredentialExpiry: "2026-01-01", hasExpiredCredential: true }, // flagged expired
        { earliestCredentialExpiry: "2026-06-25", hasExpiredCredential: false }, // 8d out -> soon
        { earliestCredentialExpiry: "2027-01-01", hasExpiredCredential: false }, // far out -> ok
        { earliestCredentialExpiry: null, hasExpiredCredential: false }, // no creds -> ignored
      ],
      now,
    );
    expect(b.total).toBe(4);
    expect(b.expired).toBe(1);
    expect(b.expiringSoon).toBe(1);
    expect(b.status).toBe("fail"); // any expired dominates
  });

  it("a past expiry date without the flag still counts as expired", () => {
    const b = benchmarkAppCredentials(
      [{ earliestCredentialExpiry: "2026-06-10", hasExpiredCredential: false }],
      now,
    );
    expect(b.expired).toBe(1);
    expect(b.status).toBe("fail");
  });

  it("warns (not fails) when something only expires soon", () => {
    const b = benchmarkAppCredentials(
      [{ earliestCredentialExpiry: "2026-07-01", hasExpiredCredential: false }],
      now,
    );
    expect(b.status).toBe("warn");
    expect(b.expiringSoon).toBe(1);
  });

  it("no apps -> ok", () => {
    expect(benchmarkAppCredentials([], now).status).toBe("ok");
  });
});

describe("listTenantHygieneForAccount (#260)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPool.mockReturnValue({ query });
    query.mockResolvedValue({ rows: [] });
  });

  it("returns empty arrays when no pool is configured (local/demo)", async () => {
    getPool.mockReturnValue(null);
    await expect(listTenantHygieneForAccount("acc-1")).resolves.toEqual({
      domains: [],
      appRegistrations: [],
      roleAssignments: [],
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("maps bronze text columns into typed rows across the three feeds", async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            tenant_id: "t-1",
            domain_name: "contoso.com",
            external_id: "contoso.com",
            is_verified: "true",
            is_default: "true",
            is_initial: "false",
            authentication_type: "Managed",
            collected_at: "2026-06-14T03:00:00Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            tenant_id: "t-1",
            external_id: "app-obj-1",
            app_id: "00000000-app",
            display_name: "Imperion Collector",
            earliest_credential_expiry: "2026-07-01T00:00:00Z",
            has_expired_credential: "false",
            collected_at: "2026-06-14T03:00:00Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            tenant_id: "t-1",
            external_id: "ra-1",
            role_display_name: "Global Administrator",
            is_privileged: "true",
            principal_id: "p-1",
            principal_type: "User",
            principal_display_name: "Admin One",
            collected_at: "2026-06-14T03:00:00Z",
          },
        ],
      });

    const out = await listTenantHygieneForAccount("acc-1");
    expect(out.domains[0]).toEqual({
      tenantId: "t-1",
      domainName: "contoso.com",
      isVerified: true,
      isDefault: true,
      isInitial: false,
      authenticationType: "Managed",
      collectedAt: "2026-06-14",
    });
    expect(out.appRegistrations[0]).toMatchObject({
      appObjectId: "app-obj-1",
      appId: "00000000-app",
      hasExpiredCredential: false,
      earliestCredentialExpiry: "2026-07-01",
    });
    expect(out.roleAssignments[0]).toMatchObject({
      assignmentId: "ra-1",
      roleDisplayName: "Global Administrator",
      isPrivileged: true,
      principalId: "p-1",
    });
  });

  it("schema-lag (undefined_table) on a feed degrades that feed to empty, not a throw", async () => {
    const lag = Object.assign(new Error("relation does not exist"), { code: "42P01" });
    query
      .mockRejectedValueOnce(lag) // domains missing
      .mockResolvedValueOnce({ rows: [] }) // app regs present-but-empty
      .mockResolvedValueOnce({
        rows: [
          {
            tenant_id: "t-1",
            external_id: "ra-1",
            role_display_name: "Reader",
            is_privileged: "false",
            principal_id: "p-1",
            principal_type: "User",
            principal_display_name: null,
            collected_at: null,
          },
        ],
      });
    const out = await listTenantHygieneForAccount("acc-1");
    expect(out.domains).toEqual([]);
    expect(out.roleAssignments).toHaveLength(1);
  });

  it("a real (non-schema-lag) error still propagates — never silently masked", async () => {
    const outage = Object.assign(new Error("connection terminated"), { code: "57P01" });
    query.mockRejectedValueOnce(outage);
    await expect(listTenantHygieneForAccount("acc-1")).rejects.toThrow("connection terminated");
  });
});
