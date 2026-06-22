-- 0173: memory_enrichment — silver write-time enrichment of verbatim memory (#1199,
-- backend #303 carve-out, backend ADR-0086). Migration number 0173 claimed at MERGE per
-- system CLAUDE.md §10.3 — authored against a placeholder; renumber if another migration
-- merges first.
--
-- WHY THIS EXISTS. Backend #303 shipped the verbatim capture loop; its WRITE-TIME
-- ENRICHMENT half was carved out (backend ADR-0086, 2026-06-22) because it had nowhere
-- correct to land. `memory_drawer` (0167, ADR-0113) is BRONZE verbatim, append-only,
-- no-transform — it carries only `source_metadata` (capture provenance), no `metadata`
-- column. So Haiku-extracted meaning (type / topics / people / action-items) for a captured
-- turn or conversation MUST NOT live on the bronze row. It lands here, in a distinct SILVER
-- sidecar, keeping the medallion separation clean (CLAUDE.md §4): bronze = faithful raw,
-- silver = normalized + extracted. The gold summary of a memory conversation stays in
-- `knowledge_object` (entity_type='memory'); this silver row is the structured extraction
-- that sits between them.
--
-- GRANULARITY (Mark's decision recorded on #1199). Both grains are supported via the
-- polymorphic `(source_kind, source_id)` pair — the same mechanic `personal_fact` (0168)
-- uses for provenance:
--   * source_kind='turn'         → source_id = a memory_drawer.id (one enriched turn)
--   * source_kind='conversation' → source_id = a memory_drawer.conversation_id (the rollup)
-- No FK is possible (a conversation_id is not a PK), so a CHECK keeps the pair valid and the
-- writer/retention path finds enrichment for a purged bronze row via the (kind,id) index.
--
-- RE-BILLING IDEMPOTENCY. `content_hash` is the hash of the bronze input the extraction was
-- run over. UNIQUE (source_kind, source_id, content_hash) lets the backend writer (BE #331)
-- skip a re-run whose input is unchanged — never paying Haiku twice for the same bytes. A
-- genuine re-extraction over changed input is a new hash → a new row (the prior stays as
-- history; the consumer reads the latest by created_at).
--
-- ACCESS. Two-axis RLS (ADR-0105) — IDENTICAL shape to memory_drawer (0167): enrichment of a
-- personal drawer is itself personal (owner-only); enrichment of an agent/company drawer
-- (owner_user_id NULL) is visible to any IDENTIFIED caller. Fine-grained required_group
-- role-scoping of company rows is RESERVED here and enforced when access-spine slice 3a
-- (#979) lands — matching today's broad-employee-read posture (ADR-0100). App roles are
-- non-BYPASSRLS (verified live 2026-06-20) → the policy enforces; the table-owner admin keeps
-- the audited god-view by ownership. `owner_user_id` is denormalized onto this row (not
-- derived from the bronze) so the policy is a single-table predicate — the writer copies it
-- from the bronze drawer it enriched.
--
-- Additive + idempotent + transactional. Frontend-owned schema (ADR-0042). DORMANT — NOT
-- prod-applied until Mark runs it (each prod apply is Mark-gated). Extracted meaning over
-- PII-bearing memory — RLS is exactly the control; no row data appears here or in any doc.
-- No secrets.

BEGIN;

CREATE TABLE IF NOT EXISTS memory_enrichment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind     text NOT NULL,                       -- grain: 'turn' (→ memory_drawer.id) | 'conversation' (→ memory_drawer.conversation_id)
  source_id       uuid NOT NULL,                        -- the enriched bronze ref in that grain (no FK — conversation_id is not a PK)
  owner_user_id   uuid REFERENCES app_user(id) ON DELETE CASCADE,  -- personal axis (RLS owner); NULL = agent/company (mirrors the bronze row's owner)
  required_group  text,                                 -- company axis (role slug) — RESERVED, enforced at slice 3a (#979)
  type            text,                                 -- extracted classification of the turn/conversation (e.g. 'decision' | 'question' | 'note' — open set)
  topics          text[] NOT NULL DEFAULT '{}',         -- extracted topic tags
  people          text[] NOT NULL DEFAULT '{}',         -- extracted people mentioned (names/handles — NOT resolved entity ids in v1)
  action_items    text[] NOT NULL DEFAULT '{}',         -- extracted action items / follow-ups
  model           text NOT NULL,                        -- the extracting model id (Claude Haiku tier, ADR-0043) — for re-extraction provenance
  content_hash    text NOT NULL,                        -- hash of the bronze input the extraction ran over (re-billing idempotency)
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memory_enrichment_source_kind_chk
    CHECK (source_kind IN ('turn', 'conversation')),
  CONSTRAINT memory_enrichment_dedup_uq
    UNIQUE (source_kind, source_id, content_hash)        -- writer skips a re-run over unchanged input (no double-bill)
);
COMMENT ON TABLE memory_enrichment IS
  'Silver write-time enrichment of verbatim memory (#1199, backend ADR-0086 carve-out of '
  '#303). Haiku-extracted type/topics/people/action_items over a memory_drawer (0167) bronze '
  'turn or conversation, kept OFF the append-only bronze row (ADR-0113). Polymorphic grain '
  'via (source_kind, source_id): turn→memory_drawer.id, conversation→conversation_id. '
  'content_hash = hash of the extracted input; UNIQUE(source_kind,source_id,content_hash) is '
  'the re-billing idempotency key. Two-axis RLS (ADR-0105), same shape as memory_drawer. '
  'Extracted meaning over PII-bearing memory.';

CREATE INDEX IF NOT EXISTS ix_memory_enrichment_source ON memory_enrichment (source_kind, source_id);
CREATE INDEX IF NOT EXISTS ix_memory_enrichment_owner  ON memory_enrichment (owner_user_id);

-- ── Row-level security: two-axis (owner + identified company), fail-closed ─────────────────
-- IDENTICAL mechanic to memory_drawer (0167): personal rows owner-only; company/shared rows
-- (owner_user_id NULL) visible to any identified caller. current_setting(...,true) is
-- missing_ok → NULL when unset → predicate is false (fail-closed), never errors.
ALTER TABLE memory_enrichment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memory_enrichment_access ON memory_enrichment;
CREATE POLICY memory_enrichment_access ON memory_enrichment
  USING (
    (owner_user_id IS NOT NULL
      AND owner_user_id = current_setting('app.user_id', true)::uuid)
    OR
    (owner_user_id IS NULL
      AND current_setting('app.user_id', true) IS NOT NULL)
  )
  WITH CHECK (
    (owner_user_id IS NOT NULL
      AND owner_user_id = current_setting('app.user_id', true)::uuid)
    OR
    (owner_user_id IS NULL
      AND current_setting('app.user_id', true) IS NOT NULL)
  );

-- ── Grants (defensive; roles may be absent in some envs) ──────────────────────────────────
DO $$
BEGIN
  -- Web: GUI reads enrichment alongside the drawer it annotates.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON memory_enrichment TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  -- Backend: the enrichment writer (#331) extracts and writes rows; DELETE for
  -- retention/forgetting cascade (an enrichment of a purged bronze row, #303).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT, INSERT, DELETE ON memory_enrichment TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  -- LocalPipeline: read-only (any future vectorization; consistent with 0167/0168).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON memory_enrichment TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;
END $$;

COMMIT;
