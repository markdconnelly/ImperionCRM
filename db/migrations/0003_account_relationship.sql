-- Add account relationship type + active flag to capture the CRM "Type/Status"
-- columns (prospect/customer/partner; active/inactive) alongside lifecycle_stage,
-- and a unique account name so seeds/imports are idempotent. ADR-0010.

BEGIN;

DO $$ BEGIN
  CREATE TYPE account_relationship AS ENUM ('prospect','customer','partner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE account
  ADD COLUMN IF NOT EXISTS relationship account_relationship,        -- prospect|customer|partner (null = unknown)
  ADD COLUMN IF NOT EXISTS is_active    boolean NOT NULL DEFAULT true;

-- Company names are treated as unique for this internal MSP so imports upsert cleanly.
DO $$ BEGIN
  ALTER TABLE account ADD CONSTRAINT account_name_key UNIQUE (name);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_account_relationship ON account(relationship);

COMMIT;
