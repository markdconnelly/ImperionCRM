-- Proposal lifecycle artifact (ADR-0010 delivery axis, ADR-0019). A proposal
-- attaches to exactly one opportunity and moves draft → sent → accepted/declined.
-- Created now so the GUI can do manual CRUD on proposals; later replaced/augmented
-- by the Kaseya Quote Manager feed (ADR-0012). Idempotent and transactional.

BEGIN;

DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM ('draft','sent','accepted','declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS proposal (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  uuid NOT NULL REFERENCES opportunity(id) ON DELETE CASCADE,
  title           text NOT NULL,
  status          proposal_status NOT NULL DEFAULT 'draft',
  amount_mrr      numeric,                          -- monthly value quoted; may differ from the opportunity
  document_url    text,                             -- pointer to the proposal doc in object storage
  notes           text,
  sent_at         timestamptz,                      -- set when status -> sent
  decided_at      timestamptz,                      -- set when status -> accepted|declined
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE proposal IS 'Proposal lifecycle artifact tied to an opportunity (ADR-0019).';

CREATE INDEX IF NOT EXISTS idx_proposal_opportunity ON proposal(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_proposal_status      ON proposal(status);

DROP TRIGGER IF EXISTS trg_proposal_updated ON proposal;
CREATE TRIGGER trg_proposal_updated BEFORE UPDATE ON proposal
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
