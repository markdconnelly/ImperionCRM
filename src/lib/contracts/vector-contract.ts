/**
 * The pinned vector contract — loaded from the ONE machine-readable home
 * (`db/contracts/vector-contract.json`), the single source of truth shared across the
 * four repos (ADR-0041 / backend ADR-0034; contract-home decision in db/contracts/README.md).
 *
 * The front end holds no AI key and embeds nothing itself, but it OWNS this contract (it
 * owns the schema, system CLAUDE.md §1). This loader is the front-end's fail-loud consumer
 * and the reference shape the siblings vendor: every embedding write stamps the
 * (embeddingModel, dimension, chunkingVersion) triple and every similarity query filters on
 * it, so vector spaces can never silently mix.
 *
 * Consume it; never restate it. To read the model/dimension anywhere in the app, import
 * `vectorContract` from here rather than hard-coding `'voyage-3-large'` / `1024`.
 */
import contract from '../../../db/contracts/vector-contract.json';

export interface VectorContract {
  readonly contractName: string;
  readonly contractVersion: string;
  /** The filter triple — stamped on every write, filtered on every query. */
  readonly embeddingModel: string;
  readonly dimension: number;
  readonly chunkingVersion: string;
  readonly chunking: {
    readonly maxChunkChars: number;
    readonly overlapChars: number;
  };
  readonly provider: {
    readonly name: string;
    readonly baseUri: string;
    readonly batchSize: number;
    readonly usdPerMillionTokens: number;
  };
}

/**
 * Validate the loaded contract and fail loudly if the home is missing required fields —
 * the same fail-loud posture every sibling consumer must adopt (db/contracts/README.md).
 */
function assertValid(c: unknown): asserts c is VectorContract {
  const v = c as Partial<VectorContract> | null;
  const problems: string[] = [];
  if (!v || typeof v !== 'object') {
    throw new Error('vector-contract.json: contract is absent or not an object');
  }
  if (typeof v.embeddingModel !== 'string' || v.embeddingModel.length === 0) {
    problems.push('embeddingModel must be a non-empty string');
  }
  if (typeof v.dimension !== 'number' || !Number.isInteger(v.dimension) || v.dimension <= 0) {
    problems.push('dimension must be a positive integer');
  }
  if (typeof v.chunkingVersion !== 'string' || v.chunkingVersion.length === 0) {
    problems.push('chunkingVersion must be a non-empty string');
  }
  if (!v.chunking || typeof v.chunking.maxChunkChars !== 'number' || typeof v.chunking.overlapChars !== 'number') {
    problems.push('chunking.maxChunkChars and chunking.overlapChars must be numbers');
  }
  if (!v.provider || typeof v.provider.batchSize !== 'number') {
    problems.push('provider.batchSize must be a number');
  }
  if (problems.length > 0) {
    throw new Error(`vector-contract.json is invalid: ${problems.join('; ')}`);
  }
}

assertValid(contract);

/** The pinned, system-wide vector contract. Single source of truth — do not restate. */
export const vectorContract: VectorContract = contract as VectorContract;
