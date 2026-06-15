import { beforeEach, describe, expect, it, vi } from "vitest";

// Hermetic: stub the pool seam — the esign_envelope read SQL shape (ADR-0071, #391)
// is exercised against a fake pg pool. Same pattern as conversation.test.ts.
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

describe("e-signature envelope reads (ADR-0071, #391)", () => {
  it("listEsignEnvelopesForProposal reads newest-created-first and maps the row", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: "e1",
          proposal_id: "p1",
          contract_id: "ct1",
          provider: "docusign",
          external_ref: "env-abc",
          status: "completed",
          recipients: [{ email: "[redacted]", role: "signer", order: 1, status: "completed" }],
          signed_pdf_uri: "blob://signed/e1",
          sent_at: new Date("2026-06-14T10:00:00Z"),
          completed_at: new Date("2026-06-15T08:00:00Z"),
          created_at: new Date("2026-06-14T09:55:00Z"),
        },
        {
          id: "e2",
          proposal_id: "p1",
          contract_id: null,
          provider: "docusign",
          external_ref: null,
          status: "created",
          recipients: null,
          signed_pdf_uri: null,
          sent_at: null,
          completed_at: null,
          created_at: new Date("2026-06-13T09:00:00Z"),
        },
      ],
    });
    const out = await crm.listEsignEnvelopesForProposal("p1");
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/FROM esign_envelope WHERE proposal_id = \$1/);
    expect(sql).toMatch(/ORDER BY created_at DESC/);
    expect(params).toEqual(["p1"]);
    expect(out).toEqual([
      {
        id: "e1",
        proposalId: "p1",
        contractId: "ct1",
        provider: "docusign",
        externalRef: "env-abc",
        status: "completed",
        recipients: [{ email: "[redacted]", role: "signer", order: 1, status: "completed" }],
        hasSignedPdf: true,
        sentAt: "2026-06-14 10:00",
        completedAt: "2026-06-15 08:00",
        createdAt: "2026-06-14 09:55",
      },
      {
        id: "e2",
        proposalId: "p1",
        contractId: null,
        provider: "docusign",
        externalRef: null,
        status: "created",
        // null recipients coalesces to []
        recipients: [],
        hasSignedPdf: false,
        sentAt: null,
        completedAt: null,
        createdAt: "2026-06-13 09:00",
      },
    ]);
  });

  it("listEsignEnvelopesForProposal returns [] when the proposal has no envelopes", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await crm.listEsignEnvelopesForProposal("none")).toEqual([]);
  });
});
