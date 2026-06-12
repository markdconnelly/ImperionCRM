import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the #112 auto-enroll wiring (ADR-0053 §4) is
// exercised against a fake pg pool (SQL shape + call sequence). Same pattern as
// saved-views.test.ts / posture-reads.test.ts.
const { query, getPool } = vi.hoisted(() => ({
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>>(
    async () => ({ rows: [] }),
  ),
  getPool: vi.fn((): unknown => ({ query })),
}));
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { postgresRepositories } from "./postgres-repositories";

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query });
  query.mockResolvedValue({ rows: [] });
});

/** Calls in resolveEvent: 1 resolve UPDATE → 2 registration INSERT → 3 targets SELECT → … */
function mockResolution(contactId: string | null) {
  query.mockResolvedValueOnce({ rows: [{ contact_id: contactId }] }); // resolve
}

describe("auto-enroll on capture resolution (#112, ADR-0053 §4)", () => {
  it("enrolls via campaign.workflow_id and event.workflow_id, audit-logging each new enrollment", async () => {
    mockResolution("contact-1");
    query.mockResolvedValueOnce({ rows: [] }); // event_registration insert
    query.mockResolvedValueOnce({
      rows: [
        { workflow_id: "wf-c", account_id: "acct-1", via: "campaign", via_id: "camp-1" },
        { workflow_id: "wf-e", account_id: "acct-1", via: "event", via_id: "ev-1" },
      ],
    }); // targets
    query.mockResolvedValueOnce({ rows: [{ id: "en-1" }] }); // enroll wf-c → created
    query.mockResolvedValueOnce({ rows: [] }); // audit en-1
    query.mockResolvedValueOnce({ rows: [] }); // enroll wf-e → conflict, nothing created

    const contactId = await postgresRepositories.leads.resolveEvent("cap-1");
    expect(contactId).toBe("contact-1");

    const calls = query.mock.calls.map((c) => [String(c[0]), c[1]] as [string, unknown[]]);
    // Targets join both attribution paths: hook config campaignId + eventId.
    expect(calls[2][0]).toContain("cap.config->>'campaignId'");
    expect(calls[2][0]).toContain("cap.config->>'eventId'");
    expect(calls[2][0]).toContain("workflow_id IS NOT NULL");
    // Idempotency: the active-enrollment partial unique index absorbs repeats.
    expect(calls[3][0]).toContain(
      "ON CONFLICT (workflow_id, contact_id) WHERE status = 'active' DO NOTHING",
    );
    expect(calls[3][1]).toEqual(["wf-c", "contact-1", "acct-1"]);
    // Audit row ONLY for the enrollment actually created (wf-c, not wf-e).
    const auditCalls = calls.filter(([sql]) => sql.includes("'workflow.auto_enroll'"));
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0][1]).toEqual(["en-1", "wf-c", "contact-1", "campaign", "camp-1", "cap-1"]);
  });

  it("is a silent no-op when no workflow is configured (no enrollment, no audit)", async () => {
    mockResolution("contact-1");
    query.mockResolvedValueOnce({ rows: [] }); // registration insert
    query.mockResolvedValueOnce({ rows: [] }); // targets: none

    await postgresRepositories.leads.resolveEvent("cap-2");
    const sqls = query.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => s.includes("INSERT INTO workflow_enrollment"))).toBe(false);
    expect(sqls.some((s) => s.includes("workflow.auto_enroll"))).toBe(false);
  });

  it("skips enrollment entirely when the capture has no contact yet", async () => {
    mockResolution(null);
    await postgresRepositories.leads.resolveEvent("cap-3");
    expect(query).toHaveBeenCalledTimes(1); // only the resolve UPDATE
  });

  it("manual enroll() is idempotent on active enrollments too", async () => {
    await postgresRepositories.workflows.enroll("wf-1", "contact-1", null);
    const [sql] = query.mock.calls[0] as unknown as [string];
    expect(sql).toContain(
      "ON CONFLICT (workflow_id, contact_id) WHERE status = 'active' DO NOTHING",
    );
  });
});
