-- Engagement provenance (ADR-0023). Downstream records "feed back" from the engagement
-- that produced them by carrying a nullable source FK — never by copying the
-- engagement's data. A discovery call / assessment / SBR can spawn opportunities,
-- projects, and tickets; these columns record where each came from.
-- Idempotent (ADD COLUMN IF NOT EXISTS) and transactional.

BEGIN;

-- Tickets can be spawned from an SBR (assessment provenance was added in 0014).
ALTER TABLE ticket
  ADD COLUMN IF NOT EXISTS source_sbr_id uuid REFERENCES strategic_business_review(id) ON DELETE SET NULL;

-- Opportunities (new sales motions) can originate from a discovery call, an
-- assessment recommendation, or an SBR-surfaced expansion need.
ALTER TABLE opportunity
  ADD COLUMN IF NOT EXISTS source_discovery_id  uuid REFERENCES discovery_call(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_assessment_id uuid REFERENCES assessment(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_sbr_id        uuid REFERENCES strategic_business_review(id) ON DELETE SET NULL;

-- Delivery projects (remediation/onboarding) usually originate from an assessment's
-- remediation roadmap, sometimes from an SBR action.
ALTER TABLE project
  ADD COLUMN IF NOT EXISTS source_assessment_id uuid REFERENCES assessment(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_sbr_id        uuid REFERENCES strategic_business_review(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_source_sbr        ON ticket(source_sbr_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_source_asmt  ON opportunity(source_assessment_id);
CREATE INDEX IF NOT EXISTS idx_project_source_asmt      ON project(source_assessment_id);

COMMIT;
