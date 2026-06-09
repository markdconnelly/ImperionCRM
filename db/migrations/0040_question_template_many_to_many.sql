-- Many-to-many between questions and assessment templates (user request: a question can
-- relate to more than one assessment, and templates are first-class/createable).
--
-- Today `question.template_id` is a single FK (a question lives in exactly one template).
-- This adds a join so a question can belong to MANY templates, while keeping `template_id`
-- as the question's "home" template so all existing code (and UNIQUE(template_id,key))
-- keeps working unchanged. Backfilled from the current 1:1 so nothing is lost.
-- Additive, idempotent, transactional.

BEGIN;

CREATE TABLE IF NOT EXISTS question_template_question (
  template_id uuid NOT NULL REFERENCES question_template(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  ordinal     int  NOT NULL DEFAULT 0,        -- per-template ordering (overrides question.ordinal)
  required    boolean NOT NULL DEFAULT false, -- per-template required override
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (template_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_qtq_question ON question_template_question(question_id);
CREATE INDEX IF NOT EXISTS idx_qtq_template ON question_template_question(template_id);

COMMENT ON TABLE question_template_question IS
  'Many-to-many: which assessment/discovery templates a question appears on (migration 0040). question.template_id remains the home template for back-compat.';

-- Backfill the join from the existing home-template relationship.
INSERT INTO question_template_question (template_id, question_id, ordinal, required)
SELECT template_id, id, ordinal, required FROM question
ON CONFLICT (template_id, question_id) DO NOTHING;

COMMIT;
