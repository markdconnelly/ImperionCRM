-- Contact CRM lifecycle (ADR-0030). Introduces the customer-journey axis the
-- Pipeline visualizes — Audience → Lead → Prospect → Managed Services Client —
-- on the ONE normalized `contact` object. Leads and Contacts become two opposite
-- filters of this table: a person is a Lead until they sign a contract, at which
-- point they become a (client) Contact.
--
-- This is a DIFFERENT axis from the enrichment `lifecycle_status`
-- (stranger|known|engaged|customer, ADR-0025), which stays untouched. A trigger
-- keeps is_client / signed_at consistent with crm_stage so callers only ever
-- write crm_stage. Idempotent and transactional.

BEGIN;

DO $$ BEGIN
  CREATE TYPE contact_crm_stage AS ENUM ('audience', 'lead', 'prospect', 'client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE contact
  ADD COLUMN IF NOT EXISTS crm_stage contact_crm_stage NOT NULL DEFAULT 'audience',
  ADD COLUMN IF NOT EXISTS is_client boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_contact_crm_stage ON contact(crm_stage);
CREATE INDEX IF NOT EXISTS idx_contact_is_client ON contact(is_client);

-- Keep is_client/signed_at derived from crm_stage. A contact becomes a client
-- exactly when crm_stage = 'client'; signed_at is stamped on transition and
-- cleared if they ever move back out of 'client'.
CREATE OR REPLACE FUNCTION sync_contact_client() RETURNS trigger AS $$
BEGIN
  NEW.is_client := (NEW.crm_stage = 'client');
  IF NEW.is_client AND NEW.signed_at IS NULL THEN
    NEW.signed_at := now();
  ELSIF NOT NEW.is_client THEN
    NEW.signed_at := NULL;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_client ON contact;
CREATE TRIGGER trg_contact_client
  BEFORE INSERT OR UPDATE OF crm_stage ON contact
  FOR EACH ROW EXECUTE FUNCTION sync_contact_client();

-- One-time backfill: seed crm_stage from the existing enrichment lifecycle so
-- the Leads/Contacts/Pipeline views are populated. The trigger then sets
-- is_client/signed_at. Only touches rows still at the default 'audience'.
UPDATE contact
SET crm_stage = CASE lifecycle_status
  WHEN 'customer' THEN 'client'::contact_crm_stage
  WHEN 'engaged'  THEN 'prospect'::contact_crm_stage
  WHEN 'known'    THEN 'lead'::contact_crm_stage
  ELSE 'audience'::contact_crm_stage
END
WHERE crm_stage = 'audience';

COMMIT;
