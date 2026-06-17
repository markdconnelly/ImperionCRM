-- 0129 conversation_segment_citation — local-pipeline SELECT grants + citation view (ADR-0068, issue #663)
-- Migration number 0129 claimed at merge (concurrency contract §10.3): a rebased
-- branch takes the next free number just before squash; if another migration merges
-- during the CI window, renumber the file (rename is data-safe).
--
-- Proposed from the sibling local-pipeline (ImperionCRM_LocalPipelineEnrichment issue
-- #200, the transcript-segment vectorization arm of conversational-intelligence ADR-0068,
-- epic #315). Source-of-record DDL: that repo's `sql/conversation_segment_citation_schema.sql`
-- (copied here, adapted to this repo's migration conventions — front end owns the schema,
-- CLAUDE.md §1). Migration 0112 created conversation / conversation_segment /
-- conversation_insight but granted only the web role. The on-prem transcript-segment
-- vectorizer needs two read-only things from the front-end schema:
--
--   1. SELECT grants for the imperion-localpipeline SP role on conversation +
--      conversation_segment, so Get-ImperionKnowledgeConversationSegment can compose gold
--      knowledge objects from the diarized turns (the ADR-0041 embedding unit). SELECT only
--      — this composer never writes silver; its writes go to knowledge_object /
--      knowledge_embedding (granted in 0045). No DELETE, scoped to exactly these two
--      tables (least privilege, §5).
--
--   2. The citation view conversation_segment_citation — so a vector retrieved from
--      knowledge_embedding (entity_type='conversation_segment', entity_ref = the segment id)
--      traces back to its source conversation + diarized turn (ADR-0068: "surfaced via the
--      gold knowledge citation view"). The view joins the gold object to the silver
--      conversation_segment and its parent conversation, exposing channel, account, speaker,
--      and recording offsets so the backend agent can render an attributed citation. Mirrors
--      the related-bronze citation views (migration 0039) — a thin, read-only join, no data
--      copied. Purged conversations are excluded (c.status <> 'purged', per 0039 pattern) so
--      purged turns never surface a citation.
--
-- OKF semantic layer (§11): NO concept update needed. This adds a *consumer* (gold/citation)
-- join over the existing silver `conversation` entity — it does NOT change its shape,
-- source-of-record/authority, or its own join paths. Vectorization into gold is explicitly
-- a consumer (system CLAUDE.md §11).
--
-- PII note (ADR-0068 / §5): conversation_segment.text and the view's segment_text are
-- sensitive, client-identifying transcript content. The view exposes no MORE than the gold
-- object already holds; it is a join, not a new data surface. Purged conversations excluded.
--
-- Additive, idempotent, transactional. Frontend-owned schema (ADR-0042). NOT prod-applied
-- until Mark runs it. No secrets. Creates grants + a view only, no data.

BEGIN;

-- 1. Least-privilege SELECT grants for the local-pipeline composer (no-op if role absent).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    RAISE NOTICE 'role imperion-localpipeline absent — skipping grants.';
    RETURN;
  END IF;
  GRANT SELECT ON
    conversation,          -- Get-ImperionKnowledgeConversationSegment (parent context)
    conversation_segment   -- …the diarized turns, the embedding unit (ADR-0041)
  TO "imperion-localpipeline";
END $$;

-- 2. Citation view: a retrieved vector -> its source conversation + segment (ADR-0068).
--    knowledge_embedding -> knowledge_object (entity_type='conversation_segment',
--    entity_ref = segment id) -> conversation_segment -> conversation.
CREATE OR REPLACE VIEW conversation_segment_citation AS
  SELECT ko.id                AS knowledge_object_id,
         ko.tenant_id,
         s.id                 AS segment_id,
         s.conversation_id,
         c.source             AS conversation_source,
         c.external_ref       AS conversation_external_ref,
         c.account_id,
         c.contact_id,
         c.opportunity_id,
         s.speaker,
         s.start_ms,
         s.end_ms,
         c.started_at         AS conversation_started_at,
         s.text               AS segment_text,
         c.status             AS conversation_status
    FROM knowledge_object ko
    JOIN conversation_segment s ON s.id = ko.entity_ref::uuid
    JOIN conversation c         ON c.id = s.conversation_id
   WHERE ko.entity_type = 'conversation_segment'
     AND c.status <> 'purged';

COMMENT ON VIEW conversation_segment_citation IS
  'Citation view (ADR-0068, local-pipeline issue #200): resolves a gold knowledge object / retrieved vector for a conversation transcript segment back to its source conversation + diarized turn (channel, account, speaker, recording offsets, text). entity_type=''conversation_segment'', entity_ref = conversation_segment.id. Mirrors the related-bronze citation views (migration 0039). Purged conversations excluded. Transcript text is sensitive client conversation content.';

-- Grant the view to both consumers (web reads for display; local-pipeline may self-verify).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON conversation_segment_citation TO "mgid-imperioncrm-web-prd";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON conversation_segment_citation TO "imperion-localpipeline";
  END IF;
END $$;

COMMIT;
