-- Ticket (ADR-0023) — company-scoped support tickets synced from Autotask (ADR-0012).
-- Stored so SBRs can reference real ticket history and engagements can spawn tickets.
-- The sync itself is an external function (ADR-0018); the raw Autotask payload is kept
-- in bronze. `source_assessment_id` records provenance when a ticket originates from an
-- assessment finding (the SBR provenance link is added in 0016, once SBR exists).
-- Idempotent and transactional.

BEGIN;

CREATE TABLE IF NOT EXISTS ticket (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,   -- owning company
  contact_id          uuid REFERENCES contact(id) ON DELETE SET NULL,           -- requester (employee instance)
  source              text NOT NULL DEFAULT 'autotask',
  external_ref        text,                              -- Autotask ticket id
  number              text,                              -- human-facing ticket number
  title               text NOT NULL,
  status              text,                              -- raw source status
  priority            text,
  category            text,
  opened_at           timestamptz,
  closed_at           timestamptz,
  payload_bronze      jsonb,                             -- raw Autotask payload
  summary_gold        text,
  source_assessment_id uuid REFERENCES assessment(id) ON DELETE SET NULL,       -- spawned from an assessment finding
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE ticket IS 'Company-scoped tickets synced from Autotask (ADR-0012/0023); bronze payload retained.';

CREATE INDEX IF NOT EXISTS idx_ticket_account ON ticket(account_id);
CREATE INDEX IF NOT EXISTS idx_ticket_status  ON ticket(status);
-- Idempotent sync: one row per source ticket.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_source_ref
  ON ticket(source, external_ref) WHERE external_ref IS NOT NULL;

DROP TRIGGER IF EXISTS trg_ticket_updated ON ticket;
CREATE TRIGGER trg_ticket_updated BEFORE UPDATE ON ticket
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
