import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { vectorContract } from './vector-contract';

/**
 * The front end is a CONSUMER of its own contract (it owns the schema, so migration 0045's
 * `vector(N)` column is itself a declaration of the contract). These tests are the
 * front-end's drift guard: the pinned contract home must agree with the schema it ships,
 * and the loader must fail loud when the home is malformed. The siblings mirror this
 * fail-loud posture against a vendored copy (db/contracts/README.md).
 */
describe('vector contract home', () => {
  it('pins the settled Voyage contract (ADR-0041)', () => {
    expect(vectorContract.embeddingModel).toBe('voyage-3-large');
    expect(vectorContract.dimension).toBe(1024);
    expect(vectorContract.chunkingVersion).toBe('v1');
  });

  it('matches the dimension physically declared by migration 0045', () => {
    const migration = readFileSync(
      join(process.cwd(), 'db', 'migrations', '0045_gold_knowledge_vectors.sql'),
      'utf8',
    );
    const match = migration.match(/embedding\s+vector\((\d+)\)/i);
    expect(match, 'migration 0045 must declare an `embedding vector(N)` column').not.toBeNull();
    const schemaDimension = Number(match![1]);
    expect(vectorContract.dimension).toBe(schemaDimension);
  });
});
