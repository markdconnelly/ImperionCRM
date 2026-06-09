# ADR-0043 — Adopt the settled AI stack; drop the legacy 1536-dim vector tables

- **Status:** Accepted
- **Date:** 2026-06-09
- **Amends:** CLAUDE.md §3's "AI must be provider-agnostic" (now settled);
  [ADR-0011](ADR-0011-unified-interaction-timeline.md) (its `interaction_embedding`
  companion table is dropped); [ADR-0041](ADR-0041-gold-knowledge-vector-store.md)
  (resolves its "converge the legacy space later" note).
- **Companion:** backend **ADR-0034** (the stack itself: Claude + Voyage, router code).

## Problem

The system carried two parallel embedding designs: the legacy 1536-dim OpenAI plan
(`interaction_embedding` from migration 0001, `contact_embedding` from 0021) and the
1024-dim Voyage gold store (`knowledge_object`/`knowledge_embedding`, ADR-0041 /
migration 0045). The legacy tables were **never populated** — no embedding provider was
ever configured — yet every readiness review re-inherited a "converge the vector spaces"
task, and the schema, docs, and backend code all paid the dual-space tax.

## Decision

1. **The AI stack is settled system-wide** (operator decision 2026-06-09): **Claude**
   for generation (Haiku cheap tier / Sonnet premium tier) + **Voyage `voyage-3-large`
   @ 1024 dims** for embeddings. Provider-agnosticism is retired; re-adding a provider
   is a new ADR. The full rationale and the router implementation live in backend
   ADR-0034; the on-prem pipeline is the sole embedding producer (ADR-0041 unchanged).
2. **Migration 0046 drops `interaction_embedding` and `contact_embedding`.** They are
   empty by construction (their only designed writer — the backend embedding generator —
   was never wired) and have no remaining reader (the backend's semantic search and
   agent retrieval were repointed at the gold store in the same change set). One vector
   space remains: `knowledge_embedding` with the pinned
   (`voyage-3-large`, 1024, chunking `v1`) contract.
3. **The front end holds no AI configuration.** The `OPENAI_API_KEY` /
   `AZURE_OPENAI_*` / `ANTHROPIC_API_KEY` placeholders are removed from `.env.example`;
   AI keys exist only as Key Vault secrets read by the backend and the on-prem pipeline.

## Options considered

1. **Drop the empty legacy tables (chosen).** No data exists to migrate; deletes the
   standing convergence liability.
2. Re-embed legacy content into the gold store. Not applicable — there is no legacy
   content; the tables are empty.
3. Keep both spaces "just in case". Rejected — an empty table with a different
   dimension is pure footgun (the backend would need permanent dual-space code).

## Security / cost / ops impact

- **Security:** smaller schema surface; the dropped tables' GRANTs disappear with them.
- **Cost:** none — the tables are empty; the HNSW indexes they carried stop existing.
- **Ops:** migration 0046 is committed but **NOT yet applied to prod** — apply via the
  standard runner (`node scripts/migrate.mjs 0046`) after verifying both tables are
  empty (`SELECT count(*) …`), which is expected by construction. The ERD
  (`docs/database/data-model.md`) is updated in this change.
