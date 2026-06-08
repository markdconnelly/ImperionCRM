-- Per-source physical bronze tables + a device silver table + union views (ADR-0039,
-- supersedes ADR-0032). Replaces the enum-discriminated `contact_source`/`account_source`
-- with ONE physical bronze table per (source, entity), each fed by its own pipeline:
--   contacts:  autotask, apollo, m365, itglue, website (manual)
--   companies: autotask, apollo, itglue, website (manual)
--   devices:   itglue, m365, website (manual)   ← new entity type
-- A per-type merge folds every source into the unified SILVER record the app reads:
-- `contact` / `account` already exist; `device` is created here. Read-only UNION views
-- (`*_bronze_all`) expose all sources per type for the app's "Data sources" view and the
-- merge's scan/match — writes always target the physical tables.
--
-- This migration is NON-destructive (create only). The legacy `contact_source` /
-- `account_source` tables are dropped in 0037, AFTER the new code is deployed (zero-downtime
-- expand/contract). Idempotent and transactional. No secrets. The `source` column is implicit
-- in the table name; the views re-introduce a `source` key literal for labelling/precedence.

BEGIN;

-- ── Silver: device (net-new; no device model existed before) ─────────────────
CREATE TABLE IF NOT EXISTS device (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid REFERENCES account(id) ON DELETE SET NULL,  -- owning company (best-effort)
  name          text,                                            -- hostname / asset name
  device_type   text,                                            -- workstation|server|network|mobile|…
  manufacturer  text,
  model         text,
  serial_number text,
  os            text,
  status        text,                                            -- active|retired|…
  last_seen_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE device IS
  'Unified silver device/asset, merged from per-source bronze device tables (ADR-0039).';
CREATE INDEX IF NOT EXISTS idx_device_account ON device(account_id);
CREATE INDEX IF NOT EXISTS idx_device_serial  ON device(serial_number);

-- ── Bronze: contacts (one table per source) ──────────────────────────────────
-- Uniform shape; `source` is the table identity. UNIQUE(external_ref) per table for the
-- pipeline's idempotent upsert. contact_id is the resolved silver FK (null until merged).
CREATE TABLE IF NOT EXISTS autotask_contacts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id        uuid REFERENCES contact(id) ON DELETE SET NULL,
  external_ref      text UNIQUE,
  payload_bronze    jsonb,
  normalized_silver jsonb,
  summary_gold      text,
  matched_at        timestamptz,
  match_confidence  numeric,
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apollo_contacts (LIKE autotask_contacts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS m365_contacts   (LIKE autotask_contacts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS itglue_contacts (LIKE autotask_contacts INCLUDING ALL);
CREATE TABLE IF NOT EXISTS website_contacts(LIKE autotask_contacts INCLUDING ALL);

-- `LIKE … INCLUDING ALL` copies columns/defaults/uniqueness but NOT foreign keys; re-add the
-- contact FK on the copies (idempotent guards).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['apollo_contacts','m365_contacts','itglue_contacts','website_contacts'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_contact_fk') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE SET NULL', t, t || '_contact_fk');
    END IF;
  END LOOP;
END $$;

-- ── Bronze: companies (one table per source) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS autotask_companies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid REFERENCES account(id) ON DELETE SET NULL,
  external_ref      text UNIQUE,
  payload_bronze    jsonb,
  normalized_silver jsonb,
  summary_gold      text,
  matched_at        timestamptz,
  match_confidence  numeric,
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apollo_companies (LIKE autotask_companies INCLUDING ALL);
CREATE TABLE IF NOT EXISTS itglue_companies (LIKE autotask_companies INCLUDING ALL);
CREATE TABLE IF NOT EXISTS website_companies(LIKE autotask_companies INCLUDING ALL);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['apollo_companies','itglue_companies','website_companies'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_account_fk') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE SET NULL', t, t || '_account_fk');
    END IF;
  END LOOP;
END $$;

-- ── Bronze: devices (one table per source; itglue, m365, website) ────────────
CREATE TABLE IF NOT EXISTS itglue_devices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id         uuid REFERENCES device(id) ON DELETE SET NULL,
  external_ref      text UNIQUE,
  payload_bronze    jsonb,
  normalized_silver jsonb,
  summary_gold      text,
  matched_at        timestamptz,
  match_confidence  numeric,
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS m365_devices    (LIKE itglue_devices INCLUDING ALL);
CREATE TABLE IF NOT EXISTS website_devices (LIKE itglue_devices INCLUDING ALL);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['m365_devices','website_devices'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_device_fk') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (device_id) REFERENCES device(id) ON DELETE SET NULL', t, t || '_device_fk');
    END IF;
  END LOOP;
END $$;

-- ── FK indexes (the source PK/UNIQUE already exist via LIKE INCLUDING ALL) ────
CREATE INDEX IF NOT EXISTS idx_autotask_contacts_contact ON autotask_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_apollo_contacts_contact   ON apollo_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_m365_contacts_contact     ON m365_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_itglue_contacts_contact   ON itglue_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_website_contacts_contact  ON website_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_autotask_companies_account ON autotask_companies(account_id);
CREATE INDEX IF NOT EXISTS idx_apollo_companies_account   ON apollo_companies(account_id);
CREATE INDEX IF NOT EXISTS idx_itglue_companies_account   ON itglue_companies(account_id);
CREATE INDEX IF NOT EXISTS idx_website_companies_account  ON website_companies(account_id);
CREATE INDEX IF NOT EXISTS idx_itglue_devices_device  ON itglue_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_m365_devices_device    ON m365_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_website_devices_device ON website_devices(device_id);

-- ── updated_at triggers for every new table ──────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'device',
    'autotask_contacts','apollo_contacts','m365_contacts','itglue_contacts','website_contacts',
    'autotask_companies','apollo_companies','itglue_companies','website_companies',
    'itglue_devices','m365_devices','website_devices'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- ── Union read views: all sources per entity, with a `source` key literal ─────
CREATE OR REPLACE VIEW contact_bronze_all AS
  SELECT id, 'autotask'::text AS source, contact_id, external_ref, payload_bronze, normalized_silver, summary_gold, matched_at, match_confidence, last_seen_at, created_at, updated_at FROM autotask_contacts
  UNION ALL SELECT id, 'apollo',      contact_id, external_ref, payload_bronze, normalized_silver, summary_gold, matched_at, match_confidence, last_seen_at, created_at, updated_at FROM apollo_contacts
  UNION ALL SELECT id, 'm365_synced', contact_id, external_ref, payload_bronze, normalized_silver, summary_gold, matched_at, match_confidence, last_seen_at, created_at, updated_at FROM m365_contacts
  UNION ALL SELECT id, 'itglue',      contact_id, external_ref, payload_bronze, normalized_silver, summary_gold, matched_at, match_confidence, last_seen_at, created_at, updated_at FROM itglue_contacts
  UNION ALL SELECT id, 'website',     contact_id, external_ref, payload_bronze, normalized_silver, summary_gold, matched_at, match_confidence, last_seen_at, created_at, updated_at FROM website_contacts;

CREATE OR REPLACE VIEW account_bronze_all AS
  SELECT id, 'autotask'::text AS source, account_id, external_ref, payload_bronze, normalized_silver, summary_gold, matched_at, match_confidence, last_seen_at, created_at, updated_at FROM autotask_companies
  UNION ALL SELECT id, 'apollo',  account_id, external_ref, payload_bronze, normalized_silver, summary_gold, matched_at, match_confidence, last_seen_at, created_at, updated_at FROM apollo_companies
  UNION ALL SELECT id, 'itglue',  account_id, external_ref, payload_bronze, normalized_silver, summary_gold, matched_at, match_confidence, last_seen_at, created_at, updated_at FROM itglue_companies
  UNION ALL SELECT id, 'website', account_id, external_ref, payload_bronze, normalized_silver, summary_gold, matched_at, match_confidence, last_seen_at, created_at, updated_at FROM website_companies;

CREATE OR REPLACE VIEW device_bronze_all AS
  SELECT id, 'itglue'::text AS source, device_id, external_ref, payload_bronze, normalized_silver, summary_gold, matched_at, match_confidence, last_seen_at, created_at, updated_at FROM itglue_devices
  UNION ALL SELECT id, 'm365_synced', device_id, external_ref, payload_bronze, normalized_silver, summary_gold, matched_at, match_confidence, last_seen_at, created_at, updated_at FROM m365_devices
  UNION ALL SELECT id, 'website',     device_id, external_ref, payload_bronze, normalized_silver, summary_gold, matched_at, match_confidence, last_seen_at, created_at, updated_at FROM website_devices;

COMMIT;
