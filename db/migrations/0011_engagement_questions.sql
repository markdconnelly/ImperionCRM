-- Editable questionnaire catalog + a single normalized answer store (ADR-0023).
-- Discovery and assessment questions are DATA, not schema: they can be added/edited
-- by versioning a question_template and its questions. Every answer is stored exactly
-- once in engagement_answer, referencing its question — so nothing is duplicated
-- downstream and the same machinery serves discovery and assessment.
-- Idempotent and transactional.

BEGIN;

DO $$ BEGIN
  CREATE TYPE engagement_kind AS ENUM ('discovery','assessment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE question_response_type AS ENUM
    ('text','longtext','number','currency','boolean','single_select','multi_select','rating','date');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A versioned set of questions for one engagement kind. New versions let the
-- questionnaire evolve while historical answers stay tied to the version they used.
CREATE TABLE IF NOT EXISTS question_template (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        engagement_kind NOT NULL,
  version     int NOT NULL,
  title       text NOT NULL,
  status      text NOT NULL DEFAULT 'active',   -- active|draft|retired
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, version)
);

CREATE TABLE IF NOT EXISTS question (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id    uuid NOT NULL REFERENCES question_template(id) ON DELETE CASCADE,
  key            text NOT NULL,                          -- stable machine key (e.g. 'downtime_cost_per_day')
  prompt         text NOT NULL,
  help_text      text,
  response_type  question_response_type NOT NULL DEFAULT 'text',
  options        jsonb,                                  -- choices for select/rating types
  dimension      text,                                   -- assessment only: scorecard dimension key (identity, endpoint, …)
  ordinal        int NOT NULL DEFAULT 0,
  required       boolean NOT NULL DEFAULT false,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, key)
);
CREATE INDEX IF NOT EXISTS idx_question_template ON question(template_id);

-- One row per (engagement, question). The engagement is identified by a type tag +
-- id (it points at discovery_call or assessment); a hard FK can't span two tables, so
-- integrity is enforced in the data layer. The UNIQUE constraint guarantees a single
-- answer per question per engagement — no duplication.
CREATE TABLE IF NOT EXISTS engagement_answer (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_type      engagement_kind NOT NULL,         -- which engagement this answers
  engagement_id        uuid NOT NULL,                    -- discovery_call.id or assessment.id
  question_id          uuid NOT NULL REFERENCES question(id) ON DELETE RESTRICT,
  value_text           text,
  value_number         numeric,
  value_bool           boolean,
  value_json           jsonb,                            -- multi-select / structured answers
  value_date           date,
  answered_by_contact_id uuid REFERENCES contact(id) ON DELETE SET NULL, -- the employee instance
  answered_at          timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_type, engagement_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_answer_engagement ON engagement_answer(engagement_type, engagement_id);

DROP TRIGGER IF EXISTS trg_question_template_updated ON question_template;
CREATE TRIGGER trg_question_template_updated BEFORE UPDATE ON question_template
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_question_updated ON question;
CREATE TRIGGER trg_question_updated BEFORE UPDATE ON question
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_engagement_answer_updated ON engagement_answer;
CREATE TRIGGER trg_engagement_answer_updated BEFORE UPDATE ON engagement_answer
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
