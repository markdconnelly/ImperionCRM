import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the conversation read SQL shapes (ADR-0068, #375)
// are exercised against a fake pg pool. Same pattern as project-baseline.test.ts.
const { query, getPool } = vi.hoisted(() => {
  const query = vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>>(
    async () => ({ rows: [], rowCount: 0 }),
  );
  return { query, getPool: vi.fn((): unknown => ({ query })) };
});
vi.mock("@/lib/db/client", () => ({ getPool, isDbConfigured: () => getPool() !== null }));
vi.mock("server-only", () => ({}));

import { postgresRepositories } from "./postgres-repositories";

const crm = postgresRepositories.crm;

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ query });
  query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe("conversational intelligence reads (ADR-0068, #375)", () => {
  it("listConversationsForAccount reads conversation newest-started-first and maps the row", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "c1",
          source: "acs",
          status: "analyzed",
          started_at: new Date("2026-06-15T09:30:00Z"),
          duration_seconds: 612,
          contact_id: "ct1",
          opportunity_id: null,
          transcript_artifact_uri: "blob://t/c1",
        },
        {
          id: "c2",
          source: "upload",
          status: "captured",
          started_at: null,
          duration_seconds: null,
          contact_id: null,
          opportunity_id: null,
          transcript_artifact_uri: null,
        },
      ],
    });
    const out = await crm.listConversationsForAccount("acc1");
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/FROM conversation WHERE account_id = \$1/);
    expect(sql).toMatch(/ORDER BY started_at DESC NULLS LAST/);
    expect(params).toEqual(["acc1"]);
    expect(out).toEqual([
      {
        id: "c1",
        source: "acs",
        status: "analyzed",
        startedAt: "2026-06-15 09:30",
        durationSeconds: 612,
        contactId: "ct1",
        opportunityId: null,
        hasTranscript: true,
      },
      {
        id: "c2",
        source: "upload",
        status: "captured",
        startedAt: null,
        durationSeconds: null,
        contactId: null,
        opportunityId: null,
        hasTranscript: false,
      },
    ]);
  });

  it("getConversation joins segments + insights onto the conversation header", async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "c1",
            account_id: "acc1",
            contact_id: "ct1",
            opportunity_id: "op1",
            source: "teams",
            status: "analyzed",
            external_ref: "meet-123",
            audio_artifact_uri: null,
            transcript_artifact_uri: "blob://t/c1",
            started_at: new Date("2026-06-15T09:30:00Z"),
            ended_at: new Date("2026-06-15T09:40:00Z"),
            duration_seconds: 600,
            consent_basis_id: "cb1",
            retention_expires_at: new Date("2026-12-15T00:00:00Z"),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { id: "s1", speaker: "Agent", start_ms: 0, end_ms: 4200, text: "Hello, thanks for calling." },
          { id: "s2", speaker: "Client", start_ms: 4200, end_ms: 9000, text: "Hi, I have a question." },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { id: "i1", kind: "summary", payload: { text: "Renewal discussion." }, model: "claude-haiku-4-5-20251001", created_at: new Date("2026-06-15T09:41:00Z") },
          { id: "i2", kind: "risk", payload: null, model: null, created_at: new Date("2026-06-15T09:41:00Z") },
        ],
      });

    const out = await crm.getConversation("c1");
    // header query
    expect(query.mock.calls[0][0]).toMatch(/FROM conversation WHERE id = \$1/);
    // segments in time order
    expect(query.mock.calls[1][0]).toMatch(/FROM conversation_segment WHERE conversation_id = \$1/);
    expect(query.mock.calls[1][0]).toMatch(/ORDER BY start_ms NULLS LAST/);
    // insights grouped by kind
    expect(query.mock.calls[2][0]).toMatch(/FROM conversation_insight WHERE conversation_id = \$1/);

    expect(out?.id).toBe("c1");
    expect(out?.source).toBe("teams");
    expect(out?.retentionExpiresAt).toBe("2026-12-15 00:00");
    expect(out?.consentBasisId).toBe("cb1");
    expect(out?.hasTranscript).toBe(true);
    expect(out?.segments).toEqual([
      { id: "s1", speaker: "Agent", startMs: 0, endMs: 4200, text: "Hello, thanks for calling." },
      { id: "s2", speaker: "Client", startMs: 4200, endMs: 9000, text: "Hi, I have a question." },
    ]);
    expect(out?.insights).toEqual([
      { id: "i1", kind: "summary", payload: { text: "Renewal discussion." }, model: "claude-haiku-4-5-20251001", createdAt: "2026-06-15 09:41" },
      // null payload coalesces to {}
      { id: "i2", kind: "risk", payload: {}, model: null, createdAt: "2026-06-15 09:41" },
    ]);
  });

  it("getConversation returns null when the id is absent", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await crm.getConversation("nope")).toBeNull();
    // no follow-up segment/insight queries once the header misses
    expect(query).toHaveBeenCalledOnce();
  });
});
