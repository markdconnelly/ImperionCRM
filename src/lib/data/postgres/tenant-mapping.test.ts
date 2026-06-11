import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the repo methods are exercised against a fake
// pg pool (SQL shape + row mapping), and against a null pool (mock fallback).
const { query, getPool } = vi.hoisted(() => ({
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [] }),
  ),
  getPool: vi.fn((): unknown => ({ query })),
}));
vi.mock("@/lib/db/client", () => ({ getPool }));
vi.mock("server-only", () => ({})); // Next.js marker module — inert under vitest

import { postgresRepositories } from "./postgres-repositories";

const security = postgresRepositories.security;

describe("Tenant Mapping repository (ADR-0051 — issue #149)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPool.mockReturnValue({ query });
    query.mockResolvedValue({ rows: [] });
  });

  it("lists mappings joined to the account name, camel-cased", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          tenant_id: "11111111-aaaa-bbbb-cccc-222222222222", account_id: "acc-1",
          account: "Contoso", display_name: "Contoso prod", updated_at: "2026-06-11",
        },
      ],
    });
    const rows = await security.listTenantMappings();
    expect(rows).toEqual([
      {
        tenantId: "11111111-aaaa-bbbb-cccc-222222222222", accountId: "acc-1",
        accountName: "Contoso", displayName: "Contoso prod", updatedAt: "2026-06-11",
      },
    ]);
    const sql = query.mock.calls[0][0] as unknown as string;
    expect(sql).toContain("FROM account_tenant");
    expect(sql).toContain("LEFT JOIN account");
  });

  it("upserts keyed on tenant_id (one account per tenant — repoint, never duplicate)", async () => {
    await security.upsertTenantMapping({
      tenantId: "t-1", accountId: "acc-1", displayName: null,
    });
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("INSERT INTO account_tenant");
    expect(sql).toContain("ON CONFLICT (tenant_id) DO UPDATE");
    expect(params).toEqual(["t-1", "acc-1", null]);
  });

  it("deletes by tenant_id", async () => {
    await security.deleteTenantMapping("t-1");
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("DELETE FROM account_tenant");
    expect(params).toEqual(["t-1"]);
  });

  it("unmapped list unions all six posture bronze tables minus mapped (ADR-0051: surface, never hide)", async () => {
    query.mockResolvedValueOnce({ rows: [{ tenant_id: "t-orphan" }] });
    const rows = await security.listUnmappedTenants();
    expect(rows).toEqual([{ tenantId: "t-orphan" }]);
    const sql = query.mock.calls[0][0] as unknown as string;
    for (const table of [
      "secure_scores", "entra_conditional_access_policies", "intune_security_policies",
      "device_configuration_policies", "autopilot_policies", "defender_xdr_security_policies",
    ]) {
      expect(sql).toContain(`FROM ${table}`);
    }
    expect(sql).toContain("NOT EXISTS (SELECT 1 FROM account_tenant");
  });

  it("falls back to the mock (empty lists) when no pool is configured", async () => {
    getPool.mockReturnValue(null);
    await expect(security.listTenantMappings()).resolves.toEqual([]);
    await expect(security.listUnmappedTenants()).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});
