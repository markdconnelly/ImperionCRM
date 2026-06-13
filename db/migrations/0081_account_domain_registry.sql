-- 0081: account tracked-domains registry + account ownership for DNS posture
-- (#334; ADR-0063 Amendment 2026-06-12). Depends on 0080.
--
-- ADR-0063 originally assumed DNS domains were derived from a tenant's verified
-- domains. Building the public-resolve plane (#156) showed the system has no domain
-- source at all (no account/company domain column; per-client Graph not built). Mark's
-- model: each customer has a GUI-managed list of domains (one or several), and DNS
-- posture checks each one. So domains are ACCOUNT-scoped and operator-curated.
--
-- account_domain is that source of truth (the GUI edits it). DNS ownership shifts from
-- tenant-keyed to account-keyed: account_id is added (additive, nullable) to the four
-- dns_* tables — they are empty in prod, so this is a cheap ALTER. tenant_id stays as
-- Azure-plane context (a zone lives in a subscription/tenant) but is no longer the
-- per-account join key; the silver merge (#157) stamps account_id from account_domain.
--
-- Grants: web MI reads + writes account_domain (the GUI manages it); local-pipeline +
-- cloud-pipeline + backend read it (the resolver/merge consume it). Additive, idempotent,
-- transactional. No secrets.

BEGIN;

-- ── The GUI-managed per-account domain list (DNS posture source of truth) ─────
CREATE TABLE IF NOT EXISTS account_domain (
  account_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  domain     text NOT NULL,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  PRIMARY KEY (account_id, domain)
);
COMMENT ON TABLE account_domain IS
  'GUI-managed list of domains tracked for DNS posture per account (#334, ADR-0063 amendment). The single domain source — the resolver (#156) checks each, drift rolls up per (account_id, domain).';

-- ── Account ownership on the DNS tables (additive; tables empty in prod) ──────
ALTER TABLE dns_zones   ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE dns_records ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE dns_golden  ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE dns_domain  ADD COLUMN IF NOT EXISTS account_id uuid;

-- The per-account read keys on (account_id, domain); the merge (#157) writes both.
CREATE INDEX IF NOT EXISTS ix_dns_domain_account  ON dns_domain  (account_id, domain);
CREATE INDEX IF NOT EXISTS ix_dns_records_account ON dns_records (account_id, domain);

-- ── Grants ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    -- The GUI owns this list: read + write (add/remove tracked domains).
    GRANT SELECT, INSERT, DELETE ON account_domain TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT ON account_domain TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline read grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON account_domain TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping cloud-pipeline read grant.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON account_domain TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend read grant.';
  END IF;
END $$;

COMMIT;
