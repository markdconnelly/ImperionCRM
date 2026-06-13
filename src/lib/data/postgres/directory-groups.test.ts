import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the contact-scoped directory-group read
// (#257, migration 0079) is exercised against a fake pg pool (SQL shape +
// row mapping) and a null pool (mock fallback). Same pattern as
// posture-reads.test.ts.
const { query, getPool } = vi.hoisted(() => ({
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [] }),
  ),
  getPool: vi.fn((): unknown => ({ query })),
}));
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({})); // Next.js marker module — inert under vitest

import { postgresRepositories } from "./postgres-repositories";

const contacts = postgresRepositories.contacts;

describe("Contact directory groups (#257 — migration 0079)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPool.mockReturnValue({ query });
    query.mockResolvedValue({ rows: [] });
  });

  it("joins membership to the contact's Entra user id and maps the bronze shape", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          tenant_id: "t-1", external_id: "g-1",
          display_name: "Operations", description: "Ops staff",
          group_types: `["Unified"]`, mail: "ops@contoso.com",
          security_enabled: "false", mail_enabled: "true",
          visibility: "Private", membership_rule_processing_state: null,
          collected_at: "2026-06-12T01:00:00Z",
        },
      ],
    });
    const rows = await contacts.listDirectoryGroups("c-1");
    expect(rows).toEqual([
      {
        tenantId: "t-1", externalId: "g-1",
        displayName: "Operations", description: "Ops staff",
        groupTypes: `["Unified"]`, mail: "ops@contoso.com",
        securityEnabled: "false", mailEnabled: "true",
        visibility: "Private", membershipRuleProcessingState: null,
        collectedAt: "2026-06-12T01:00:00Z",
      },
    ]);
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    // The user-object join contract: bronze membership reaches the silver
    // contact through m365_contacts.external_ref (the Entra user object id).
    expect(sql).toContain("FROM m365_contacts mc");
    expect(sql).toContain("gm.member_external_id = mc.external_ref");
    expect(sql).toContain("JOIN m365_groups g");
    expect(sql).toContain("g.external_id = gm.group_external_id");
    expect(sql).toContain("WHERE mc.contact_id = $1::uuid");
    expect(params).toEqual(["c-1"]);
  });

  it("falls back to the mock (empty list) when no pool is configured", async () => {
    getPool.mockReturnValue(null);
    await expect(contacts.listDirectoryGroups("c-1")).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});
