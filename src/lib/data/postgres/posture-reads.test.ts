import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the account-scoped posture reads (#93, ADR-0051)
// are exercised against a fake pg pool (SQL shape + row mapping) and a null pool
// (mock fallback). Same pattern as tenant-mapping.test.ts.
const { query, getPool } = vi.hoisted(() => ({
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [] }),
  ),
  getPool: vi.fn((): unknown => ({ query })),
}));
// isDbConfigured mirrors the real semantics (pool present) so the guarded fallback
// seam (#193) sees "not configured" when getPool is stubbed to null.
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({})); // Next.js marker module — inert under vitest

import { postgresRepositories } from "./postgres-repositories";

const security = postgresRepositories.security;

describe("Account-scoped posture reads (#93 — ADR-0051)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPool.mockReturnValue({ query });
    query.mockResolvedValue({ rows: [] });
  });

  it("tenant rollup LEFT JOINs tenant_posture so unrefreshed mapped tenants still surface", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          tenant_id: "t-1", display_name: "Contoso prod",
          secure_score_current: "412.5", secure_score_max: "550",
          licensed_user_count: 40, active_user_count: 38,
          policies_compliant: 12, policies_drift: 2,
          policies_ungoverned: 1, policies_missing: 3,
          exposures_open: 4, refreshed_at: "2026-06-11",
        },
        {
          // mapped but never classified — the whole rollup side is NULL
          tenant_id: "t-2", display_name: null,
          secure_score_current: null, secure_score_max: null,
          licensed_user_count: null, active_user_count: null,
          policies_compliant: null, policies_drift: null,
          policies_ungoverned: null, policies_missing: null,
          exposures_open: null, refreshed_at: null,
        },
      ],
    });
    const rows = await security.listTenantPostureForAccount("acc-1");
    expect(rows[0]).toEqual({
      tenantId: "t-1", displayName: "Contoso prod",
      secureScoreCurrent: 412.5, secureScoreMax: 550,
      licensedUserCount: 40, activeUserCount: 38,
      policiesCompliant: 12, policiesDrift: 2,
      policiesUngoverned: 1, policiesMissing: 3,
      exposuresOpen: 4, refreshedAt: "2026-06-11",
    });
    expect(rows[1]).toMatchObject({
      tenantId: "t-2", secureScoreCurrent: null, refreshedAt: null,
      policiesCompliant: 0, policiesDrift: 0, policiesUngoverned: 0,
      policiesMissing: 0, exposuresOpen: 0,
    });
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("FROM account_tenant m");
    expect(sql).toContain("LEFT JOIN tenant_posture p");
    expect(sql).toContain("WHERE m.account_id = $1::uuid");
    expect(params).toEqual(["acc-1"]);
  });

  it("policy rows join through account_tenant and order problems before compliant", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          tenant_id: "t-1", policy_family: "conditional_access", policy_id: "p-1",
          policy_name: "Require MFA", classification: "drift",
          observed_modified_at: "2026-06-01", golden_approved_at: "2026-05-01",
        },
      ],
    });
    const rows = await security.listPosturePoliciesForAccount("acc-1");
    expect(rows).toEqual([
      {
        tenantId: "t-1", policyFamily: "conditional_access", policyId: "p-1",
        policyName: "Require MFA", classification: "drift",
        observedModifiedAt: "2026-06-01", goldenApprovedAt: "2026-05-01",
      },
    ]);
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("FROM posture_policy p");
    expect(sql).toContain("JOIN account_tenant m");
    expect(sql).toContain("array_position(ARRAY['drift','missing','ungoverned','compliant']");
    expect(params).toEqual(["acc-1"]);
  });

  it("control profiles filter deprecated controls with a case-folded text match (bronze is all-text)", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          tenant_id: "t-1", control_name: "MFARegistrationV2", control_category: "Identity",
          title: "Ensure MFA is registered", max_score: "9", service: "AzureAD",
          user_impact: "Low", tier: "Core",
        },
      ],
    });
    const rows = await security.listSecureScoreControlsForAccount("acc-1");
    expect(rows).toEqual([
      {
        tenantId: "t-1", controlName: "MFARegistrationV2", controlCategory: "Identity",
        title: "Ensure MFA is registered", maxScore: "9", service: "AzureAD",
        userImpact: "Low", tier: "Core",
      },
    ]);
    const [sql] = query.mock.calls[0] as unknown as [string];
    expect(sql).toContain("FROM secure_score_control_profiles c");
    expect(sql).toContain("JOIN account_tenant m");
    expect(sql).toContain("lower(COALESCE(c.deprecated, 'false')) <> 'true'");
  });

  it("exposures read by account_id, unresolved first", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "e-1", email: "user@contoso.com", breach_source: "LinkedIn 2021",
          breach_date: "2021-06-01", exposed_data: ["email", "password"],
          password_status: "plaintext", severity: "high", status: "new",
          last_seen_at: "2026-06-10",
        },
      ],
    });
    const rows = await security.listCredentialExposuresForAccount("acc-1");
    expect(rows).toEqual([
      {
        id: "e-1", email: "user@contoso.com", breachSource: "LinkedIn 2021",
        breachDate: "2021-06-01", exposedData: ["email", "password"],
        passwordStatus: "plaintext", severity: "high", status: "new",
        lastSeenAt: "2026-06-10",
      },
    ]);
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("FROM credential_exposure");
    expect(sql).toContain("WHERE account_id = $1::uuid");
    expect(sql).toContain("(status = 'resolved')");
    expect(params).toEqual(["acc-1"]);
  });

  it("Defender incident counts join account_tenant and exclude resolved/redirected from open (#256)", async () => {
    query.mockResolvedValueOnce({ rows: [{ open: "3", total: "7" }] });
    const counts = await security.countDefenderIncidentsForAccount("acc-1");
    expect(counts).toEqual({ open: 3, total: 7 });
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("FROM defender_incidents i");
    expect(sql).toContain("JOIN account_tenant m");
    expect(sql).toContain("NOT IN ('resolved', 'redirected')");
    expect(sql).toContain("WHERE m.account_id = $1::uuid");
    expect(params).toEqual(["acc-1"]);
  });

  it("MFA registration counts join account_tenant and match is_mfa_registered case-folded (#258)", async () => {
    query.mockResolvedValueOnce({ rows: [{ registered: "31", total: "40" }] });
    const counts = await security.countMfaRegistrationForAccount("acc-1");
    expect(counts).toEqual({ registered: 31, total: 40 });
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toContain("FROM entra_auth_methods a");
    expect(sql).toContain("JOIN account_tenant m");
    expect(sql).toContain("lower(COALESCE(a.is_mfa_registered, '')) = 'true'");
    expect(sql).toContain("WHERE m.account_id = $1::uuid");
    expect(params).toEqual(["acc-1"]);
  });

  it("falls back to the mock (empty lists) when no pool is configured", async () => {
    getPool.mockReturnValue(null);
    await expect(security.listTenantPostureForAccount("acc-1")).resolves.toEqual([]);
    await expect(security.listPosturePoliciesForAccount("acc-1")).resolves.toEqual([]);
    await expect(security.listSecureScoreControlsForAccount("acc-1")).resolves.toEqual([]);
    await expect(security.listCredentialExposuresForAccount("acc-1")).resolves.toEqual([]);
    await expect(security.countDefenderIncidentsForAccount("acc-1")).resolves.toEqual({
      open: 0,
      total: 0,
    });
    await expect(security.countMfaRegistrationForAccount("acc-1")).resolves.toEqual({
      registered: 0,
      total: 0,
    });
    expect(query).not.toHaveBeenCalled();
  });
});
