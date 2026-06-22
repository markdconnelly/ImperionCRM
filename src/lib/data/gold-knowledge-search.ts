/**
 * Gold knowledge hybrid ranker — the Phase 2(a) retrieval query-path (#1166, epic
 * #966). Ranks gold `knowledge_object`s for a query over the hybrid-search
 * substrate (#1153 / migrations 0045 + 0166), MemPalace hybrid-v4 shape.
 *
 * This is the DETERMINISTIC stages only — given a query VECTOR it runs entirely in
 * one SQL statement, no AI key required:
 *
 *   1. semantic    — HNSW cosine over `knowledge_embedding.embedding`, filtered to
 *                    the pinned (embedding_model, dimension, chunking_version)
 *                    triple (vector-contract.json / ADR-0041) so vector spaces
 *                    never mix;
 *   2. keyword     — `ts_rank` over the generated `chunk_fts` tsvector (0166),
 *                    seeded from `queryText` via `plainto_tsquery`;
 *   3. metadata    — `knowledge_object.metadata @> filter` containment via the GIN
 *                    index (0166) — an OB1-style facet pre-filter;
 *   4. temporal    — recency decay on `knowledge_object.updated_at` (freshness as a
 *                    boost, not a hard cut).
 *
 * The combined score is a weighted sum of the four (per-stage scores returned too,
 * so the ranker contract is auditable). Results are `knowledge_object`s WITH
 * `entity_ref`, so the caller can DRILL to the verbatim store (`memory_drawer` for
 * human notes/conversations, `agent_message` for agent runs — split by origin,
 * CLAUDE.md §4). The drill-down read itself MUST honor RLS (`withIdentity`); this
 * gold search does too, so the whole path is identity-scoped.
 *
 * NOT in this slice (ADR-0042 §1 — the FE holds no AI key):
 *   - turning `queryText` into `queryVector` is a Voyage embedding call → backend
 *     (ImperionCRM_Backend #304);
 *   - the optional Claude Haiku rerank of the shortlist → backend (#305).
 * The caller supplies an already-computed `queryVector`; this module ranks.
 *
 * Server-only; degrades to `[]` in mock mode (no pool), like the rest of the data
 * layer (ADR-0024).
 */
import "server-only";
import type { IdentityContext } from "@/lib/db/identity";
import { withIdentity } from "@/lib/db/identity";
import { vectorContract } from "@/lib/contracts/vector-contract";

/** The pinned vector contract (ADR-0041) — every query filters on exactly this triple. */
export const PINNED_VECTOR = {
  embeddingModel: vectorContract.embeddingModel,
  dimension: vectorContract.dimension,
  chunkingVersion: vectorContract.chunkingVersion,
} as const;

/**
 * Default stage weights for the combined score. The ranker contract (ADR, this
 * PR): semantic dominates, keyword and temporal refine, metadata is a filter (its
 * own weight is a small tie-breaking bonus for matched facets, not a primary
 * driver). Callers may override per query.
 */
export interface StageWeights {
  semantic: number;
  keyword: number;
  temporal: number;
}

export const DEFAULT_WEIGHTS: StageWeights = {
  semantic: 1.0,
  keyword: 0.3,
  temporal: 0.2,
};

/** Recency half-life for the temporal-proximity boost, in days. */
export const DEFAULT_HALF_LIFE_DAYS = 30;

export interface GoldSearchOptions {
  /** The query embedding (1024-d, Voyage voyage-3-large). Backend computes it (#304). */
  queryVector: number[];
  /** Optional natural-language query for the FTS keyword stage. Omit → keyword score 0. */
  queryText?: string | null;
  /** Optional jsonb containment filter on `knowledge_object.metadata` (GIN, 0166). */
  metadataFilter?: Record<string, unknown> | null;
  /** Restrict to one entity_type (e.g. 'memory' for conversation summaries). */
  entityType?: string | null;
  /** Restrict to one tenant. */
  tenantId?: string | null;
  /** How many ranked objects to return. */
  limit?: number;
  /** Per-stage weight overrides. */
  weights?: Partial<StageWeights>;
  /** Recency half-life (days) for the temporal boost. */
  halfLifeDays?: number;
}

export interface GoldSearchHit {
  knowledgeObjectId: string;
  entityType: string;
  /** Stable ref to the verbatim source (e.g. conversation_id) — the drill-down key. */
  entityRef: string;
  title: string | null;
  summary: string | null;
  /** Combined weighted score (higher = better). */
  score: number;
  /** Per-stage component scores, for auditability / debugging the ranker. */
  components: {
    semantic: number;
    keyword: number;
    temporal: number;
  };
}

interface GoldSearchRow {
  knowledge_object_id: string;
  entity_type: string;
  entity_ref: string;
  title: string | null;
  summary: string | null;
  score: number | string;
  semantic_score: number | string;
  keyword_score: number | string;
  temporal_score: number | string;
}

const num = (v: number | string): number => (typeof v === "number" ? v : Number(v));

function mapRow(r: GoldSearchRow): GoldSearchHit {
  return {
    knowledgeObjectId: r.knowledge_object_id,
    entityType: r.entity_type,
    entityRef: r.entity_ref,
    title: r.title,
    summary: r.summary,
    score: num(r.score),
    components: {
      semantic: num(r.semantic_score),
      keyword: num(r.keyword_score),
      temporal: num(r.temporal_score),
    },
  };
}

/** A pgvector literal `[a,b,c]` from a number[]; rejects non-finite values. */
function toVectorLiteral(vec: number[]): string {
  if (vec.length !== PINNED_VECTOR.dimension) {
    throw new Error(
      `queryVector has ${vec.length} dims, expected ${PINNED_VECTOR.dimension} (pinned vector contract)`,
    );
  }
  for (const x of vec) {
    if (!Number.isFinite(x)) throw new Error("queryVector contains a non-finite value");
  }
  return `[${vec.join(",")}]`;
}

/**
 * Hybrid-rank gold knowledge for a query vector. Returns the top `limit`
 * `knowledge_object`s by combined score, each with its `entity_ref` for verbatim
 * drill-down. Empty in mock mode.
 *
 * One statement: a CTE picks the BEST (max cosine similarity) embedding chunk per
 * object — filtered to the pinned vector triple — alongside that chunk's keyword
 * `ts_rank`; the outer query joins back to the object, applies the metadata /
 * type / tenant / published filters, computes the temporal boost, and orders by
 * the weighted sum. The semantic candidate set rides the HNSW index; FTS rides
 * the chunk_fts GIN; metadata containment rides the metadata GIN.
 */
export async function searchGoldKnowledge(
  identity: IdentityContext,
  opts: GoldSearchOptions,
): Promise<GoldSearchHit[]> {
  const weights = { ...DEFAULT_WEIGHTS, ...(opts.weights ?? {}) };
  const halfLife = opts.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS;
  const limit = opts.limit ?? 20;
  const vectorLiteral = toVectorLiteral(opts.queryVector);
  const queryText = opts.queryText?.trim() || null;
  const metadataFilter = opts.metadataFilter ?? null;

  const rows = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<GoldSearchRow>(
      `
      WITH chunk AS (
        SELECT
          ke.knowledge_object_id,
          -- cosine similarity = 1 - cosine distance, in [0,1]
          MAX(1 - (ke.embedding <=> $1::vector))                                       AS semantic_score,
          -- best keyword rank across this object's chunks for the query ($2)
          COALESCE(
            MAX(CASE WHEN $2::text IS NOT NULL
                     THEN ts_rank(ke.chunk_fts, plainto_tsquery('english', $2))
                     ELSE 0 END),
            0)                                                                          AS keyword_score
        FROM knowledge_embedding ke
        WHERE ke.embedding_model  = $3
          AND ke.dimension        = $4
          AND ke.chunking_version = $5
        GROUP BY ke.knowledge_object_id
      )
      SELECT
        ko.id                                                                          AS knowledge_object_id,
        ko.entity_type,
        ko.entity_ref,
        ko.title,
        ko.summary,
        chunk.semantic_score,
        chunk.keyword_score,
        -- temporal: exponential recency decay on updated_at, half-life $6 days, in (0,1]
        exp(-ln(2) * GREATEST(EXTRACT(EPOCH FROM (now() - ko.updated_at)), 0)
              / ($6::numeric * 86400))                                                  AS temporal_score,
        ( $7::numeric * chunk.semantic_score
        + $8::numeric * chunk.keyword_score
        + $9::numeric * exp(-ln(2) * GREATEST(EXTRACT(EPOCH FROM (now() - ko.updated_at)), 0)
                              / ($6::numeric * 86400)) )                                AS score
      FROM chunk
      JOIN knowledge_object ko ON ko.id = chunk.knowledge_object_id
      WHERE ko.status = 'published'
        AND ($10::text  IS NULL OR ko.entity_type = $10)
        AND ($11::text  IS NULL OR ko.tenant_id   = $11)
        AND ($12::jsonb IS NULL OR ko.metadata @> $12::jsonb)
      ORDER BY score DESC
      LIMIT $13
      `,
      [
        vectorLiteral, // $1
        queryText, // $2
        PINNED_VECTOR.embeddingModel, // $3
        PINNED_VECTOR.dimension, // $4
        PINNED_VECTOR.chunkingVersion, // $5
        halfLife, // $6
        weights.semantic, // $7
        weights.keyword, // $8
        weights.temporal, // $9
        opts.entityType ?? null, // $10
        opts.tenantId ?? null, // $11
        metadataFilter ? JSON.stringify(metadataFilter) : null, // $12
        limit, // $13
      ],
    );
    return rows;
  });
  return (rows ?? []).map(mapRow);
}
