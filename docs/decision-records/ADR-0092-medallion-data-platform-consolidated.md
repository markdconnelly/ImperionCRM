---
adr: 0092
title: "Medallion data platform — consolidated dossier"
status: accepted
date: 2026-06-16
repo: frontend
summary: "Consolidated dossier of the Medallion (bronze→silver→gold) data-platform decisions: the external-identity map + ingest-vs-poll policy, per-source physical bronze tables read through union views, per-connection poll cadence, the silver contact/account/device/contract/ticket entities, and the unified gold knowledge store pinned to Voyage voyage-3-large @ 1024 dims (legacy 1536-dim tables dropped). Carries every member decision verbatim with a zero-loss traceability table; member ADRs are retained."
tags: [medallion]
consolidates: [ADR-0012, ADR-0032, ADR-0038, ADR-0039, ADR-0041, ADR-0043, ADR-0044]
---
# ADR-0092: Medallion data platform — consolidated dossier

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-16 |
| **Consolidates** | ADR-0012 · ADR-0032 (superseded) · ADR-0038 · ADR-0039 · ADR-0041 · ADR-0043 · ADR-0044 (all retained on disk; each keeps its real status + gains `consolidated_into: ADR-0092`) |
| **Cross-references** | ADR-0090 (consolidation method, dossier + traceability + retained originals) · ADR-0084 (claim ADR numbers at merge) · ADR-0042 (four-repo division of labor — frontend owns the schema, siblings consume) · ADR-0016 (audit-logged access to PII-bearing bronze) · ADR-0014 / ADR-0025 (consent / lawful-basis gates on silver facts) · ADR-0024 / ADR-0036 (the `connection` model + Settings connection cards) · ADR-0086 (OKF semantic layer over silver) · backend ADR-0034 (the settled AI stack itself — Claude + Voyage, router code; companion to ADR-0043) · pipeline ADR-0006 / pipeline ADR-0009 / pipeline ADR-0011 (the bronze→silver merge that populates these silver entities) · local-pipeline ADR-0003 / local-pipeline ADR-0009 (the on-prem vectorization producer + knowledge composers) · ADR-0011 / ADR-0021 (the legacy 1536-dim embedding tables ADR-0043 drops) |

## Purpose & scope

This is a consolidation dossier produced under [ADR-0090](./ADR-0090-adr-ingestion-overhaul.md). It folds the **Medallion data-platform cluster** — every decision record that defines how external data lands (bronze), is normalized and merged (silver), and is made AI-ready (gold) in Imperion's frontend-owned schema — into one ingestible record, so that "the current decision about the data platform" can be reconstructed from a single file rather than a chain of supersessions and amendments.

**Zero loss is the binding constraint (ADR-0090).** A decision is "lost" only if it appears in *no* active record. This dossier therefore:

- **Synthesizes** the current Medallion data-platform decision (the section immediately below);
- **Carries every member decision and every amendment/supersession clause VERBATIM** (the per-member sections that follow — quoted directly from each source ADR's *Decision* / governing clauses);
- **Proves zero loss with a traceability table** mapping each source ADR's decision(s) to its dossier section;
- **Retains every member file on disk** with `consolidated_into: ADR-0092` and an inbound pointer — so history and inbound links survive (ADR-0090).

**Member statuses are preserved verbatim (ADR-0090).** Six members are `Accepted` and stay `Accepted`. **ADR-0032 is `superseded`** (by ADR-0039) and **stays `superseded`** — consolidation adds the `consolidated_into` pointer but does **not** flip its status to `consolidated`, because that would erase the supersession fact. The pre-existing supersession (ADR-0039 supersedes ADR-0032) is carried in full below.

**Boundaries preserved (system CLAUDE.md §1, single-owner rule).** This repo owns the schema; the siblings consume it. Cross-repo references remain **references, never absorptions**: the cloud pipeline's `merge-sources` (pipeline ADR-0006/0009/0011) and the on-prem vectorization producer + knowledge composers (local-pipeline ADR-0003/0009) and the AI-stack router code (backend ADR-0034) are **cited by repo-qualified id only**, not copied here.

---

## Synthesis — the current Medallion data-platform decision

External data flows through **bronze → silver → gold** (CLAUDE.md §4), with the frontend repo as the single source of truth for the schema (ADR-0042). In current form:

1. **External clouds are augmented, not duplicated — via an identity map + an ingest-vs-poll policy per source (ADR-0012).** `external_identity` correlates an Account to its IDs across systems; each source is classified **ingest** (M365 email/Teams, Plaud calls, Facebook lead/ad data — flow into the `interaction` stream) or **poll** (Autotask tickets, IT Glue assets/docs — fetched live, cached briefly, never the system of record, honoring "augment, don't duplicate"). `integration_connection` holds per-system config with credentials **referenced from Key Vault** (never in the DB or repo); `sync_state` tracks cursors. Demand gen: `campaign`/`ad`/`campaign_metric` + `attribution` + agentic web-scrape `enrichment` as refreshable gold lead-brief records.

2. **Bronze is one physical table per (source, entity), read through union views (ADR-0039, which supersedes ADR-0032).** The original design (ADR-0032) landed every source for a contact/company into ONE enum-discriminated table (`contact_source`/`account_source` with a `source` column); **ADR-0039 superseded that** with **12 physical bronze tables** — contacts (`autotask`, `apollo`, `m365`, `itglue`, `website`), companies (`autotask`, `apollo`, `itglue`, `website`), devices (`itglue`, `m365`, `website`) — each fed by its own pipeline, with `source` implicit in the table name (`365`→`m365_*`; the UI label stays "Microsoft 365"). Union views `contact_bronze_all` / `account_bronze_all` / `device_bronze_all` re-introduce a `source` literal for the "Data sources" popup and the merge; views are read-only, all writes target the physical tables. **Manual entries use the `website` source** (replacing `imperion_crm_entered`), upserted as `website_*` bronze rows pre-linked to silver and winning at top merge precedence. Migrations: `0036` creates the 12 tables + `device` + the 3 views (non-destructive); `0037` drops `contact_source`/`account_source` + their enums **after** the new code deploys (expand/contract). The pipeline merge is pipeline ADR-0006/0009.

3. **Polling cadence is operator-controlled per connection (ADR-0038).** `connection.poll_interval_minutes integer NOT NULL DEFAULT 60` with a `>= 0` check (migration `0035`); **`0` = manual/paused**. A preset selector (Manual / 15 min / 30 min / hourly / 6 h / 12 h / daily) on each connection card **auto-saves on change** via `setPollIntervalAction`; carried on `ConnectionRow.pollIntervalMinutes` through the typed repositories. The frontend persists the choice; the pipeline consumes it via `pollDue()`.

4. **Silver is the unified record the whole app reads.** `contact` / `account` are the silver aggregates (ADR-0032/0039); ADR-0039 added a new silver **`device`** entity (merge-populated). **ADR-0044 added typed silver `contract` + `ticket`** (migration `0050`, typed columns + `account_id`/`contact_id` FKs + `UNIQUE(source, external_ref)`), populated from bronze by the **cloud pipeline's `merge-sources`** each sweep (full-scan idempotent upsert; defensive text→typed parsing — unparseable values land NULL, never fail the row). The `/contracts` page moved from bronze to silver; future sources (DocuSign, `website` manual rows) merge under the ADR-0039 precedence convention.

5. **Gold is one unified knowledge store with one pinned vector space (ADR-0041, as settled by ADR-0043).** `knowledge_object` (per-entity gold object) → `knowledge_embedding` (chunked vectors, one HNSW cosine index, version columns for `embedding_model`/`dimension`/`chunking_version` so multiple versions coexist behind one index) — migration `0045`. **The embedding model is pinned system-wide to Voyage `voyage-3-large` @ 1024 dims** (an independent retrieval/cost/governance choice — Claude consumes retrieved *text*, not vectors). The on-prem local pipeline is the **sole** vectorization producer (local-pipeline §7); its SP role gets `SELECT/INSERT/UPDATE` on both tables + scoped **`DELETE` on `knowledge_embedding` only** to prune superseded versions.

6. **The AI stack is settled, and the legacy dual vector space is gone (ADR-0043).** Operator decision 2026-06-09: **Claude** (Haiku cheap / Sonnet premium) + **Voyage `voyage-3-large` @ 1024 dims** — provider-agnosticism is retired; re-adding a provider is a new ADR (full rationale + router in backend ADR-0034). **Migration 0046 drops the legacy 1536-dim `interaction_embedding` (migration 0001) and `contact_embedding` (migration 0021)** — never populated, no remaining reader (semantic search + agent retrieval repointed at the gold store), so they were pure footgun. **The front end holds no AI configuration** — the `OPENAI_API_KEY` / `AZURE_OPENAI_*` / `ANTHROPIC_API_KEY` placeholders were removed from `.env.example`; AI keys exist only as Key Vault secrets read by the backend and on-prem pipeline. One vector space remains: `knowledge_embedding` with the `(voyage-3-large, 1024, chunking v1)` contract.

### Vector-contract evolution (preserved verbatim)

The two members that touch the vector space form an explicit before/after the dossier captures:

- **ADR-0041 pins** Voyage `voyage-3-large` @ **1024 dims** as the system-wide gold contract, alongside the *then-still-present* legacy 1536-dim tables (`interaction_embedding`, `contact_embedding`), and its Future considerations carried a standing "converge the legacy space later" task.
- **ADR-0043 settles and resolves it:** the AI stack is settled (Claude + Voyage), and **migration 0046 drops the legacy 1536-dim tables** — they were never populated, so there is nothing to migrate. ADR-0043's metadata records this as an **amendment** to ADR-0041 ("resolves its 'converge the legacy space later' note") and to ADR-0011 (whose `interaction_embedding` companion table is dropped). The pinned 1024-dim contract from ADR-0041 is **unchanged**; ADR-0043 only removes the competing empty space.

### Amendment & supersession web (preserved verbatim)

- **ADR-0039 supersedes ADR-0032** — the single enum-discriminated `contact_source`/`account_source` tables are replaced by one physical bronze table per (source, entity) + a `device` entity (migrations 0036/0037). ADR-0032's frontmatter `superseded_by: ["ADR-0039"]` and its body Status (`Superseded by ADR-0039`) are preserved verbatim; ADR-0032's status stays **`superseded`** in this consolidation (it gains `consolidated_into: ADR-0092` but is **not** flipped to `consolidated`).
- **ADR-0043 amends ADR-0041** ("resolves its 'converge the legacy space later' note") **and ADR-0011** ("its `interaction_embedding` companion table is dropped") **and CLAUDE.md §3** ("AI must be provider-agnostic" — now settled). Backend ADR-0034 is its **companion** (the stack + router code) and is a cross-repo reference, not absorbed.
- **ADR-0044 relates to** ADR-0018 (the app reads silver), ADR-0039 (per-source bronze + precedence), local-pipeline ADR-0009 (the knowledge composers these feed), and pipeline ADR-0011 (the merge that populates the new silver tables) — all preserved as references.

Six members are **Accepted** and preserved unchanged; **ADR-0032 is Superseded** and preserved unchanged. Consolidation alters no decision's status.

---

## Traceability table (zero-loss proof)

Every cluster member (the 7 named in #758), each source decision, and the dossier section that carries it verbatim. The retained member file is the second proof of non-loss.

| Source ADR | Status | Decision(s) carried | Dossier section |
|---|---|---|---|
| **ADR-0012** | Accepted | External-identity map (`external_identity`); ingest-vs-poll policy per source (M365/Plaud/Facebook ingest → timeline; Autotask/IT Glue poll, never duplicated); `integration_connection` with Key-Vault-referenced creds + `sync_state` cursors; demand-gen (`campaign`/`ad`/`campaign_metric` + `attribution` + `enrichment`) | Synthesis §1 · [M1 — ADR-0012](#m1--adr-0012-external-integration-identity-map-ingest-vs-poll-and-demand-gen) |
| **ADR-0032** | **Superseded** (by ADR-0039) | Per-source bronze landing tables `contact_source`/`account_source` (enum-discriminated `source` column, bronze/silver/gold cols, `external_ref` `UNIQUE(source, external_ref)`, match metadata) merged into silver `contact`/`account`; relationship to `external_identity`; **superseded by ADR-0039** | Synthesis §2 · [M2 — ADR-0032](#m2--adr-0032-per-source-bronze-tables-for-contacts-and-companies-superseded-by-adr-0039) |
| **ADR-0038** | Accepted | `connection.poll_interval_minutes` (DEFAULT 60, `>= 0`, `0`=manual/paused; migration 0035); auto-saving preset cadence selector per connection card; carried on `ConnectionRow.pollIntervalMinutes`; pipeline consumes it | Synthesis §3 · [M3 — ADR-0038](#m3--adr-0038-per-connection-poll-cadence) |
| **ADR-0039** | Accepted (supersedes ADR-0032) | 12 physical bronze tables `<source>_<entity>`; new silver `device`; union views `*_bronze_all`; manual entries = `website` source; migrations 0036 (create) / 0037 (drop legacy, expand/contract) | Synthesis §2, §4 · [M4 — ADR-0039](#m4--adr-0039-per-source-physical-bronze-tables--union-view-merge--silver) |
| **ADR-0041** | Accepted | Unified gold `knowledge_object` → `knowledge_embedding` (migration 0045, one HNSW index, version columns); pinned Voyage `voyage-3-large` @ 1024 dims system-wide; local-pipeline SP grants incl. scoped DELETE on `knowledge_embedding` | Synthesis §5 · Vector-contract evolution · [M5 — ADR-0041](#m5--adr-0041-gold-knowledge-layer--unified-vector-store-pinned-voyage-ai-embeddings) |
| **ADR-0043** | Accepted | AI stack settled (Claude Haiku/Sonnet + Voyage voyage-3-large @ 1024); migration 0046 drops legacy 1536-dim `interaction_embedding`/`contact_embedding`; front end holds no AI config (placeholders removed); amends ADR-0041/ADR-0011/CLAUDE.md §3 | Synthesis §6 · Vector-contract evolution · [M6 — ADR-0043](#m6--adr-0043-adopt-the-settled-ai-stack-drop-the-legacy-1536-dim-vector-tables) |
| **ADR-0044** | Accepted | Typed silver `contract` + `ticket` (migration 0050, typed cols + account/contact FKs + `UNIQUE(source, external_ref)`); cloud-pipeline `merge-sources` full-scan idempotent upsert with defensive parsing; `/contracts` moves bronze→silver | Synthesis §4 · [M7 — ADR-0044](#m7--adr-0044-silver-contract-and-ticket-entities) |

**Member count: 7.** Cross-repo references preserved as references (not absorbed): backend ADR-0034 (the settled AI stack + router), pipeline ADR-0006 / ADR-0009 / ADR-0011 (the bronze→silver merge), local-pipeline ADR-0003 / ADR-0009 (on-prem vectorization + knowledge composers). In-repo legacy references preserved (not absorbed): ADR-0011 / ADR-0021 (the dropped 1536-dim tables), ADR-0018 (app reads silver).

---

# Member decisions (verbatim)

Each section below reproduces the governing decision text of one member ADR **verbatim** from its source file. The full source ADR (Problem / Context / Options / Consequences / Future considerations) is retained on disk under its original filename; only its decision and binding clauses are quoted here, which is what the zero-loss guarantee requires.

## M1 — ADR-0012 (External integration identity map, ingest-vs-poll, and demand gen)

> Source: [`ADR-0012-integration-identity-map-ingest-poll.md`](./ADR-0012-integration-identity-map-ingest-poll.md) · Status: **Accepted** (2026-06-07)

**Decision (verbatim):**

> Adopt the **identity map + ingest/poll policy.**
> - **Ingest** → timeline: M365 email + Teams (background), Plaud calls, Facebook
>   lead/ad data.
> - **Poll** on demand, not duplicated: Autotask tickets, IT Glue assets/docs.
> - `integration_connection` holds per-system config with credentials **referenced
>   from Key Vault** (never in the DB or repo); `sync_state` tracks cursors for
>   incremental ingest.
> - **Demand gen:** `campaign`/`ad`/`campaign_metric` (Facebook, polled metrics) plus
>   `attribution` on contacts/opportunities, and agentic web-scrape `enrichment`
>   stored as refreshable gold records for lead briefs.

Security impact (verbatim): "All external credentials live in Azure Key Vault and are referenced by `integration_connection.keyvault_secret_ref`. Polled data inherits the source system's authorization; Imperion CRM requests it with least-privilege app credentials."

## M2 — ADR-0032 (Per-source bronze tables for contacts and companies — superseded by ADR-0039)

> Source: [`ADR-0032-per-source-bronze-tiering.md`](./ADR-0032-per-source-bronze-tiering.md) · Status: **Superseded by [ADR-0039](./ADR-0039-per-source-bronze-tables.md)** (2026-06-08)

**Supersession header (preserved verbatim):**

> **Superseded:** the single enum-discriminated `contact_source`/`account_source` described here
> were replaced by one physical bronze table per (source, entity) + a `device` entity in ADR-0039
> (migrations 0036/0037).

**Decision (verbatim):**

> - Migration **`0032`** adds `contact_source`
>   (sources: imperion_crm_entered, apollo, m365_synced, autotask, itglue) and
>   `account_source` (imperion_crm_entered, apollo, autotask, itglue). Each row FKs the
>   resolved silver record (null until matched), carries bronze/silver/gold columns,
>   `external_ref` with `UNIQUE(source, external_ref)`, and match metadata.
> - A future normalization job projects `normalized_silver`, deterministically matches
>   each source row to a `contact`/`account` (email / company domain), upserts silver,
>   and stamps `matched_at`/`match_confidence`. **Apollo writes both tables.**
> - Relationship to `external_identity`: that table is the identity crosswalk (our id ↔
>   external id); `*_source.external_ref` is the raw-row grain.

**Status note (consolidation):** ADR-0032 is **Superseded** (by ADR-0039) and remains so. It is carried here verbatim for zero loss and gains `consolidated_into: ADR-0092`; its `status: superseded` is **not** changed.

## M3 — ADR-0038 (Per-connection poll cadence)

> Source: [`ADR-0038-per-connection-poll-cadence.md`](./ADR-0038-per-connection-poll-cadence.md) · Status: **Accepted** (2026-06-08)

**Decision (verbatim):**

> - Add `connection.poll_interval_minutes integer NOT NULL DEFAULT 60` with a
>   `>= 0` check constraint (migration `0035`). **`0` = manual / paused** (no automatic
>   polling). The frontend persists the operator's choice; the pipeline consumes it.
> - Surface a **poll-frequency selector** on each connection card (personal) and each
>   configured company-credential card — presets Manual / 15 min / 30 min / hourly /
>   6 h / 12 h / daily. It **auto-saves on change** via the `setPollIntervalAction`
>   server action (no separate save button); a non-preset stored value is shown as an
>   extra option rather than snapped to a preset.
> - Carried on `ConnectionRow.pollIntervalMinutes` through the typed repositories
>   (`setPollInterval(id, minutes)` on both the Postgres and mock implementations).

Operational impact (verbatim): "Migration `0035` must be applied to prod as a deploy step (0001–0034 already applied). The column is additive with a default, so existing rows poll hourly until changed. The pipeline must read `poll_interval_minutes` and honour `0` as paused."

## M4 — ADR-0039 (Per-source physical bronze tables + union-view merge → silver)

> Source: [`ADR-0039-per-source-bronze-tables.md`](./ADR-0039-per-source-bronze-tables.md) · Status: **Accepted (supersedes ADR-0032)** (2026-06-08)

**Decision (verbatim):**

> - **Bronze (12 tables):** `<source>_<entity>` — contacts (`autotask`, `apollo`, `m365`, `itglue`,
>   `website`), companies (`autotask`, `apollo`, `itglue`, `website`), devices (`itglue`, `m365`,
>   `website`). Uniform columns (silver FK, `external_ref UNIQUE`, `payload_bronze`,
>   `normalized_silver`, match metadata, timestamps); `source` is implicit in the table name.
>   `365` → `m365_*` (a SQL identifier can't begin with a digit); the UI label stays "Microsoft 365".
> - **Silver:** reuse `contact` / `account`; add a new **`device`** table (merge-populated; no app
>   UI yet).
> - **Union views** `contact_bronze_all` / `account_bronze_all` / `device_bronze_all` re-introduce a
>   `source` key literal so the app's "Data sources" popup and the pipeline merge can scan all
>   sources for an entity. Views are **read-only**; all writes target the physical tables.
> - **Manual entries = `website` source** (replacing `imperion_crm_entered`): `createContact` /
>   `updateContact` (and account equivalents) upsert a `website_*` bronze row pre-linked to the
>   silver record, so manual data is provenance-tracked and wins at top merge precedence;
>   `deleteContact` / `deleteAccount` remove it. Best-effort — never blocks the user action.
> - **Migrations:** `0036` creates the 12 tables, `device`, the 3 views, indexes, triggers
>   (non-destructive). `0037` drops `contact_source` / `account_source` + their enums **after** the
>   new code is deployed (zero-downtime expand/contract).

**Supersession (preserved verbatim):** "Status: Accepted (supersedes ADR-0032)"; "Supersedes: ADR-0032". The enum-discriminated single-table design of ADR-0032 is replaced by the per-(source, entity) physical tables above.

## M5 — ADR-0041 (Gold knowledge layer + unified vector store, pinned Voyage AI embeddings)

> Source: [`ADR-0041-gold-knowledge-vector-store.md`](./ADR-0041-gold-knowledge-vector-store.md) · Status: **Accepted** (2026-06-09)

**Decision (verbatim):**

> - **Unified gold store** (migration 0045): `knowledge_object` (tenant_id, entity_type,
>   entity_ref, title, body, summary, source, content_hash, metadata; `UNIQUE(tenant_id,
>   entity_type, entity_ref)`) → `knowledge_embedding` (chunk_index, chunk_text, `embedding
>   vector(1024)`, embedding_model, dimension, chunking_version, content_hash, token_count;
>   `UNIQUE(knowledge_object_id, chunk_index, embedding_model, chunking_version)`, HNSW cosine
>   index). The version columns let multiple model/chunking versions coexist behind one index;
>   queries filter by `(embedding_model, dimension, chunking_version)`.
> - **Pinned embedding model: Voyage AI `voyage-3-large` at dimension 1024**, system-wide.
> - The local-pipeline SP role (`imperion-localpipeline`, ADR-0003/migration 0044) gets
>   `SELECT/INSERT/UPDATE` on both tables plus **`DELETE` on `knowledge_embedding` only** (to prune
>   superseded vector versions per the retention policy) — its one scoped DELETE. The web identity
>   inherits `SELECT` via 0002's default privileges.

Context note (verbatim): "Embeddings are decoupled from the generation model. The agent is Claude, but Claude consumes retrieved *text*, not vectors — so the embedding model is an independent retrieval/cost/governance choice, not a 'Claude-compatible' one."

## M6 — ADR-0043 (Adopt the settled AI stack; drop the legacy 1536-dim vector tables)

> Source: [`ADR-0043-settled-ai-stack-drop-legacy-vectors.md`](./ADR-0043-settled-ai-stack-drop-legacy-vectors.md) · Status: **Accepted** (2026-06-09) · Amends (verbatim): "CLAUDE.md §3's 'AI must be provider-agnostic' (now settled); ADR-0011 (its `interaction_embedding` companion table is dropped); ADR-0041 (resolves its 'converge the legacy space later' note)." · Companion: backend ADR-0034.

**Decision (verbatim):**

> 1. **The AI stack is settled system-wide** (operator decision 2026-06-09): **Claude**
>    for generation (Haiku cheap tier / Sonnet premium tier) + **Voyage `voyage-3-large`
>    @ 1024 dims** for embeddings. Provider-agnosticism is retired; re-adding a provider
>    is a new ADR. The full rationale and the router implementation live in backend
>    ADR-0034; the on-prem pipeline is the sole embedding producer (ADR-0041 unchanged).
> 2. **Migration 0046 drops `interaction_embedding` and `contact_embedding`.** They are
>    empty by construction (their only designed writer — the backend embedding generator —
>    was never wired) and have no remaining reader (the backend's semantic search and
>    agent retrieval were repointed at the gold store in the same change set). One vector
>    space remains: `knowledge_embedding` with the pinned
>    (`voyage-3-large`, 1024, chunking `v1`) contract.
> 3. **The front end holds no AI configuration.** The `OPENAI_API_KEY` /
>    `AZURE_OPENAI_*` / `ANTHROPIC_API_KEY` placeholders are removed from `.env.example`;
>    AI keys exist only as Key Vault secrets read by the backend and the on-prem pipeline.

Operational impact (verbatim): "migration 0046 is committed but **NOT yet applied to prod** — apply via the standard runner (`node scripts/migrate.mjs 0046`) after verifying both tables are empty (`SELECT count(*) …`), which is expected by construction. The ERD (`docs/database/data-model.md`) is updated in this change."

## M7 — ADR-0044 (Silver `contract` and `ticket` entities)

> Source: [`ADR-0044-silver-contracts-tickets.md`](./ADR-0044-silver-contracts-tickets.md) · Status: **Accepted** (2026-06-09) · Relates to (verbatim): "ADR-0018 (the app reads silver), ADR-0039 (per-source bronze + precedence), local-pipeline ADR-0009 (the knowledge composers these feed), pipeline ADR-0011 (merge-sources, which populates them)."

**Decision (verbatim):**

> Migration **0050** adds silver `contract` + `ticket` (typed columns, `account_id` /
> `contact_id` FKs, `UNIQUE (source, external_ref)`). The **cloud pipeline's
> `merge-sources`** populates them from bronze each sweep — full-scan idempotent upsert
> (the bronze envelope has no `matched_at`; at current volume a full pass is cheaper than
> adding one). Text→typed parsing (dates, numerics) happens in the merge and parses
> defensively: unparseable values land NULL, never fail the row. The `/contracts` page
> moves from bronze to silver; future sources (DocuSign, `website` manual rows) merge in
> under the ADR-0039 precedence convention.
>
> Grants: web/backend SELECT · cloud pipeline SELECT/INSERT/UPDATE · on-prem SELECT (its
> knowledge composers can later read silver instead of re-joining bronze).

---

## Consequences

### Security impact

No change to any security posture — this is a documentation consolidation (ADR-0090). Every security control of the member ADRs remains in force and is carried verbatim: Key-Vault-referenced credentials with `sync_state` cursors and least-privilege polled reads (ADR-0012); audit-logged access to PII-bearing bronze + consent/lawful-basis gates on silver facts (ADR-0032 citing ADR-0016/0014/0025); a non-secret integer cadence clamped non-negative server-side under the admin-only Settings route (ADR-0038); per-source tables enabling per-source retention/redaction + tokens stay in Key Vault (ADR-0039); per-tenant isolation via `tenant_id` and the single scoped `DELETE` on `knowledge_embedding` (ADR-0041); the front end holding no AI configuration (placeholders removed, keys only in Key Vault — ADR-0043); silver carries no payloads, raw stays in bronze, reader grants are read-only (ADR-0044). `Never commit secrets` — no secrets, tokens, or client PII appear in this dossier or any member file.

### Cost impact

None. No runtime, schema, or model change. Slightly larger ADR corpus to index (one added file); the generated index and `adr-index.json` absorb it mechanically. The member ADRs' own cost notes (polling API volume, JSONB storage, per-token Voyage embedding billing with `content_hash` idempotency) are carried verbatim and unchanged.

### Operational impact

The Medallion data-platform decision surface is now reconstructable from one file. Member files are retained with `consolidated_into: ADR-0092` (ADR-0032 also keeps `status: superseded`, all others `status: consolidated`), so all inbound `ADR-NNNN` links and history survive. The generated README index (`scripts/adr-index.mjs`) and `adr-index.json` are regenerated in the same change; `--check` passes. The members' standing prod-apply notes are unchanged and remain the operational truth (e.g. ADR-0043's migration 0046 drop is committed but applied per its own runbook). Future Medallion decisions either supersede a member (and update this dossier's web in the same PR) or, if net-new, are authored standalone and folded in at the next consolidation pass.

## Future considerations

- This dossier is vectorized into gold alongside other knowledge once stable (ADR-0090 future considerations; LocalPipeline) — into the very `knowledge_embedding` store ADR-0041/0043 define.
- As later Medallion ADRs land (additional ad platforms or bronze sources per ADR-0012; the device-source pulls + device UI per ADR-0039; convergence of any remaining entity-specific embeddings per ADR-0041), they amend the relevant member and this dossier's synthesis + amendment web in the same PR.
- The same consolidation method (ADR-0090) applies to the remaining clusters (crm-core, surfaces, …).
