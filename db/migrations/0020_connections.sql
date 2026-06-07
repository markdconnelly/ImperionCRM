-- External connections & identity map (ADR-0012, extended for per-user personal
-- connections in ADR-0024). A connection is either an employee's personal account
-- (scope='user': their 365 / YouTube / LinkedIn, so their comms flow in) or an
-- org-wide system (scope='company': Autotask, IT Glue). OAuth tokens are NEVER
-- stored here — only a reference to the Key Vault secret that holds them
-- (CLAUDE.md §5). Idempotent and transactional.

BEGIN;

-- ── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE connection_provider AS ENUM
    ('m365','google','youtube','linkedin','facebook','plaud','autotask','itglue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE connection_scope AS ENUM ('user','company');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE connection_status AS ENUM ('active','expired','revoked','error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Connections ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connection (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope               connection_scope NOT NULL,
  owner_user_id       uuid REFERENCES app_user(id) ON DELETE CASCADE,  -- null for company scope
  provider            connection_provider NOT NULL,
  display_name        text,
  status              connection_status NOT NULL DEFAULT 'active',
  scopes              text[] NOT NULL DEFAULT '{}',
  keyvault_secret_ref text,                             -- reference only; never the token
  external_account_id text,
  sync_cursor         jsonb,
  last_sync_at        timestamptz,
  connected_at        timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN connection.keyvault_secret_ref IS
  'Key Vault secret reference holding the OAuth token; the token itself never touches the DB (CLAUDE.md §5).';

-- ── Identity map (augment, do not duplicate) ────────────────────────────────
CREATE TABLE IF NOT EXISTS external_identity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid REFERENCES account(id) ON DELETE CASCADE,
  contact_id  uuid REFERENCES contact(id) ON DELETE CASCADE,
  provider    connection_provider NOT NULL,
  external_id text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE external_identity IS 'Correlates our account/contact to its IDs across external systems (ADR-0012).';

-- ── Wire the deferred FK from interaction (column added in 0018) ─────────────
DO $$ BEGIN
  ALTER TABLE interaction
    ADD CONSTRAINT interaction_source_connection_fk
    FOREIGN KEY (source_connection_id) REFERENCES connection(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_connection_owner          ON connection(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_connection_provider       ON connection(provider);
CREATE INDEX IF NOT EXISTS idx_external_identity_account ON external_identity(account_id);
CREATE INDEX IF NOT EXISTS idx_external_identity_contact ON external_identity(contact_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_external_identity   ON external_identity(provider, external_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_connection_updated ON connection;
CREATE TRIGGER trg_connection_updated BEFORE UPDATE ON connection
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_external_identity_updated ON external_identity;
CREATE TRIGGER trg_external_identity_updated BEFORE UPDATE ON external_identity
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
