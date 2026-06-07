-- Demo seed for the new communications / enrichment / demand-gen / automation tables
-- (separate migration so it can use enum values added in 0018, per the enum-in-txn
-- rule). Idempotent: every insert is guarded so re-running is a no-op. The app's mock
-- data path still renders these screens without a database; this only enriches the
-- DB-backed demo.

BEGIN;

-- ── Default automation workflows ────────────────────────────────────────────
INSERT INTO workflow (name, kind, status, trigger)
SELECT 'Default Nurture', 'nurture', 'active', '{"on":"discovery_not_fit"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM workflow WHERE name = 'Default Nurture');

INSERT INTO workflow (name, kind, status, trigger)
SELECT 'Pre-Discovery Enrichment', 'pre_discovery', 'active', '{"on":"discovery_scheduled"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM workflow WHERE name = 'Pre-Discovery Enrichment');

-- ── Demo lead-capture hook ──────────────────────────────────────────────────
INSERT INTO lead_hook (name, kind, active, config)
SELECT 'Website Contact Form', 'web_form', true, '{"path":"/contact"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM lead_hook WHERE name = 'Website Contact Form');

-- ── Per-contact demo: dossier + consent + a few cross-channel comms ─────────
-- Attaches to the earliest existing contact (if any). All guarded, so it seeds once.
DO $$
DECLARE c_id uuid; a_id uuid;
BEGIN
  SELECT id, account_id INTO c_id, a_id FROM contact ORDER BY created_at LIMIT 1;
  IF c_id IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM contact_enrichment WHERE contact_id = c_id) THEN
    INSERT INTO contact_enrichment (contact_id, attribute_key, value_text, confidence, source, lawful_basis) VALUES
      (c_id, 'employer',  'Acme Corp',       0.90, 'linkedin', 'public_data'),
      (c_id, 'role',      'IT Director',      0.85, 'linkedin', 'public_data'),
      (c_id, 'interest',  'Cloud security',   0.60, 'youtube',  'public_data');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM contact_social_identity WHERE contact_id = c_id) THEN
    INSERT INTO contact_social_identity (contact_id, platform, handle, profile_url, verified) VALUES
      (c_id, 'linkedin', 'in/demo-director', 'https://www.linkedin.com/in/demo-director', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM consent_event WHERE contact_id = c_id) THEN
    INSERT INTO consent_event (contact_id, channel, state, lawful_basis, source) VALUES
      (c_id, 'email',        'opt_in', 'consent', 'web_form'),
      (c_id, 'ad_targeting', 'opt_in', 'consent', 'web_form');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM interaction WHERE contact_id = c_id AND kind IS NOT NULL) THEN
    INSERT INTO interaction (account_id, contact_id, source, kind, direction, subject, summary_gold, occurred_at) VALUES
      (a_id, c_id, 'm365_email', 'email',          'outbound', 'Intro to Imperion', 'Sent intro deck; awaiting reply.',            now() - interval '6 days'),
      (a_id, c_id, 'linkedin',   'social_comment', 'inbound',  NULL,                'Commented on our post about MSP security.',   now() - interval '3 days'),
      (a_id, c_id, 'plaud',      'meeting',        'internal', 'Coffee chat',       'In-person: open to a discovery call next month.', now() - interval '1 day');
  END IF;
END $$;

COMMIT;
