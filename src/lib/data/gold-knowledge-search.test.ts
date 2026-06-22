import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Gold knowledge hybrid ranker (#1166, Phase 2a). Pins the load-bearing properties
 * of the deterministic query-path: it runs inside a withIdentity transaction (so
 * RLS applies to the gold read and any drill-down is identity-scoped), filters to
 * the pinned vector triple, applies the keyword / metadata / type / tenant / status
 * filters, binds the stage weights + half-life, maps the per-stage component
 * scores, and validates the query-vector dimension. Same pool-seam mock style as
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

import {
  DEFAULT_HALF_LIFE_DAYS,
  DEFAULT_WEIGHTS,
  PINNED_VECTOR,
  searchGoldKnowledge,
} from "./gold-knowledge-search";

const UID = "11111111-1111-1111-1111-111111111111";
const IDENTITY = { userId: UID, groups: ["support"] };
const VEC = Array.from({ length: PINNED_VECTOR.dimension }, () => 0.01);

/** Find the ranking SELECT (the one statement that hits knowledge_object). */
function rankCall() {
  return clientQuery.mock.calls.find((c) =>
    (c[0] as string).includes("FROM chunk"),
  )!;
}

beforeEach(() => {
  vi.clearAllMocks();
  getPool.mockReturnValue({ connect });
  clientQuery.mockResolvedValue({ rows: [] });
});

describe("searchGoldKnowledge", () => {
  it("pins to the contract triple (model+dim+chunking) inside a withIdentity tx", async () => {
    await searchGoldKnowledge(IDENTITY, { queryVector: VEC });
    const sqls = clientQuery.mock.calls.map((c) => c[0] as string);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(sqls.some((s) => s.includes("app.user_id"))).toBe(true);

    const [sql, params] = rankCall();
    expect(sql).toContain("embedding_model  = $3");
    expect(sql).toContain("ke.dimension        = $4");
    expect(sql).toContain("ke.chunking_version = $5");
    const p = params as unknown[];
    expect(p[2]).toBe(PINNED_VECTOR.embeddingModel);
    expect(p[3]).toBe(PINNED_VECTOR.dimension);
    expect(p[4]).toBe(PINNED_VECTOR.chunkingVersion);
  });

  it("only returns published objects and orders by the weighted score", async () => {
    await searchGoldKnowledge(IDENTITY, { queryVector: VEC });
    const sql = rankCall()[0] as string;
    expect(sql).toContain("ko.status = 'published'");
    expect(sql).toContain("ORDER BY score DESC");
    // cosine similarity, not raw distance
    expect(sql).toContain("1 - (ke.embedding <=> $1::vector)");
  });

  it("binds default weights + half-life, and the query vector as a pgvector literal", async () => {
    await searchGoldKnowledge(IDENTITY, { queryVector: VEC });
    const p = rankCall()[1] as unknown[];
    expect(p[0]).toBe(`[${VEC.join(",")}]`); // $1 vector literal
    expect(p[5]).toBe(DEFAULT_HALF_LIFE_DAYS); // $6 half-life
    expect(p[6]).toBe(DEFAULT_WEIGHTS.semantic); // $7
    expect(p[7]).toBe(DEFAULT_WEIGHTS.keyword); // $8
    expect(p[8]).toBe(DEFAULT_WEIGHTS.temporal); // $9
  });

  it("overrides weights/half-life when supplied", async () => {
    await searchGoldKnowledge(IDENTITY, {
      queryVector: VEC,
      weights: { keyword: 0.9 },
      halfLifeDays: 7,
    });
    const p = rankCall()[1] as unknown[];
    expect(p[5]).toBe(7);
    expect(p[6]).toBe(DEFAULT_WEIGHTS.semantic); // unchanged default
    expect(p[7]).toBe(0.9); // overridden keyword
  });

  it("seeds the FTS keyword stage from trimmed queryText (null when blank)", async () => {
    await searchGoldKnowledge(IDENTITY, { queryVector: VEC, queryText: "  backup policy  " });
    expect((rankCall()[1] as unknown[])[1]).toBe("backup policy");
    const sql = rankCall()[0] as string;
    expect(sql).toContain("plainto_tsquery('english', $2)");

    vi.clearAllMocks();
    getPool.mockReturnValue({ connect });
    clientQuery.mockResolvedValue({ rows: [] });
    await searchGoldKnowledge(IDENTITY, { queryVector: VEC, queryText: "   " });
    expect((rankCall()[1] as unknown[])[1]).toBeNull();
  });

  it("passes a metadata containment filter as jsonb, type/tenant filters as text", async () => {
    await searchGoldKnowledge(IDENTITY, {
      queryVector: VEC,
      metadataFilter: { client: "acme" },
      entityType: "memory",
      tenantId: "t-1",
    });
    const [sql, params] = rankCall();
    expect(sql).toContain("ko.metadata @> $12::jsonb");
    const p = params as unknown[];
    expect(p[9]).toBe("memory"); // $10 entity_type
    expect(p[10]).toBe("t-1"); // $11 tenant_id
    expect(p[11]).toBe(JSON.stringify({ client: "acme" })); // $12 metadata
  });

  it("maps rows to GoldSearchHit with entity_ref and component scores", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM chunk")) {
        return {
          rows: [
            {
              knowledge_object_id: "ko1",
              entity_type: "memory",
              entity_ref: "conv-99",
              title: "Kickoff call",
              summary: "Discussed backups",
              score: "0.83",
              semantic_score: 0.7,
              keyword_score: "0.4",
              temporal_score: 0.9,
            },
          ],
        };
      }
      return { rows: [] };
    });
    const hits = await searchGoldKnowledge(IDENTITY, { queryVector: VEC });
    expect(hits).toEqual([
      {
        knowledgeObjectId: "ko1",
        entityType: "memory",
        entityRef: "conv-99",
        title: "Kickoff call",
        summary: "Discussed backups",
        score: 0.83,
        components: { semantic: 0.7, keyword: 0.4, temporal: 0.9 },
      },
    ]);
  });

  it("rejects a query vector of the wrong dimension", async () => {
    await expect(searchGoldKnowledge(IDENTITY, { queryVector: [0.1, 0.2] })).rejects.toThrow(
      /dims, expected/,
    );
    expect(connect).not.toHaveBeenCalled();
  });

  it("rejects a non-finite query vector value", async () => {
    const bad = [...VEC];
    bad[0] = Number.NaN;
    await expect(searchGoldKnowledge(IDENTITY, { queryVector: bad })).rejects.toThrow(
      /non-finite/,
    );
  });

  it("returns [] in mock mode (no pool)", async () => {
    getPool.mockReturnValue(null);
    expect(await searchGoldKnowledge(IDENTITY, { queryVector: VEC })).toEqual([]);
    expect(connect).not.toHaveBeenCalled();
  });
});
