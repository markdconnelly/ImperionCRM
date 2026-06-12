-- knowledge_object draft convention + backend write grant (#214; backend #58).
--
-- The documentation sub-agent (backend ADR-0042 narrow tools) drafts knowledge articles
-- for HUMAN review: `docs_draft_article` [T1] INSERTs a knowledge_object with
-- status='draft' (source 'agent', AI-labeled metadata: authoredBy/actingUserId), audited
-- as `agent.knowledge.draft`. It never publishes and never embeds.
--
-- Vector contract stays intact (ADR-0041 / backend ADR-0034): drafts carry NO embeddings,
-- so they are invisible to semantic retrieval until a human approves and the on-prem hub
-- publishes + vectorizes. knowledge_embedding grants are UNCHANGED — corpus/embedding
-- writes remain on-prem-only (`imperion-localpipeline`, migration 0045).
--
-- 1. `status` column: 'draft' | 'published', default 'published' (all existing rows —
--    everything the on-prem pipeline has written — is published).
-- 2. Partial index on drafts for the review-queue read path.
-- 3. GRANT INSERT, UPDATE on knowledge_object to the backend MI
--    (`mgid-imperioncrmbackendfunction`, role created in 0047). Draft-only writes are a
--    convention enforced in the backend tool (audited), not a row-level policy — the MI
--    could technically touch published rows; acceptable for an identity-gated internal
--    service, revisit with RLS if the threat model changes.
--
-- Idempotent; no-ops grants if the role is absent so the ordered runner never wedges.

BEGIN;

-- ── 1. Draft/published status ──────────────────────────────────────────────────────────
ALTER TABLE knowledge_object
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'knowledge_object_status_check'
      AND conrelid = 'knowledge_object'::regclass
  ) THEN
    ALTER TABLE knowledge_object
      ADD CONSTRAINT knowledge_object_status_check
      CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

-- ── 2. Review-queue index (drafts are rare; partial keeps it tiny) ─────────────────────
CREATE INDEX IF NOT EXISTS ix_knowledge_object_drafts
  ON knowledge_object (tenant_id, updated_at DESC)
  WHERE status = 'draft';

-- ── 3. Backend MI write grant (knowledge_object ONLY — embeddings stay on-prem) ────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT INSERT, UPDATE ON TABLE knowledge_object TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — run 0047 prerequisite first; skipping grant.';
  END IF;
END $$;

COMMIT;
