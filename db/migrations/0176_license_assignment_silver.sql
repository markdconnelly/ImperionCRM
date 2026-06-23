-- 0176: silver `license_assignment` — account-resolved distributor license facts (#1223, epic #1042).
-- Migration number 0176 claimed at MERGE per system CLAUDE.md §10.3 — authored against a
-- placeholder; the rebased branch takes the next free number just before squash (it is authored as
-- 0176 because the sibling Pax8 governance seed already claims the 0175 placeholder on an open branch).
--
-- WHY THIS EXISTS. The Pax8 bronze→silver merge (LocalPipeline #280) resolves each Pax8 COMPANY to
-- a silver `account` via `entity_xref` — but the per-LICENSE facts the loop needs have nowhere to
-- land. The agreement true-up (#1041) reconciles CONTRACTED vs ACTUAL licensed seats, and the CMDB
-- wants to show WHICH license is on WHICH device — yet `contract` is header-only (no line entity)
-- and `device` has no license column. The integration design ("no new silver entity") could not
-- carry these without a home. This migration adds the thin silver projection that is that home, as
-- #1223's scope sanctioned ("a pax8_license_fact junction … no new TOP-LEVEL silver entity unless
-- justified"): one row per assigned license, account-resolved, with the two links the loop needs.
--
-- WHAT IT IS. `license_assignment` is a single account-relatable row per distributor license:
-- the ACTUAL licensed quantity (the true-up's actual side), plus the optional links the procure→
-- provision→bill loop fills in — `device_id` (license → device, the CMDB "what is licensed" link)
-- and `contract_id` (license → agreement, the #1085 attach). Distributor-agnostic by construction
-- (a `source` discriminator, `pax8` first — the cloud_asset/provider precedent), so a future
-- distributor adds rows, not a table. It is a PROJECTION of bronze (archetype A merge silver),
-- NOT a system of record: the distributor is authoritative; the app never edits it.
--
-- WHO WRITES IT. The on-prem local-pipeline merge (merge-co-locates-with-ingestion, LP ADR-0026) —
-- an extension of `Invoke-ImperionPax8Merge` (#280) populates this from `pax8_licenses` joined to
-- the resolved account (filed as the LP populate twin). Idempotent upsert on (source, external_ref).
--
-- Archetype A (merge silver), Finance domain (it serves the cost/seat true-up #1041 + billing).
-- New silver entity → it gets a NEW OKF concept file (docs/database/semantic-layer/tables/
-- license_assignment.md) + a coverage-matrix row in THIS PR (§11; the semantic-layer gate requires
-- the concept file for a CREATE of a concept-bearing silver table). Frontend-owned schema (ADR-0042).
-- PII-adjacent (account-linked usage facts), access-controlled (ADR-0039); no secrets. Additive +
-- idempotent + transactional. DORMANT — 0 rows until the Pax8 bronze fills (credential + 0161 apply,
-- Mark-gated #1042) and the LP merge twin runs. NOT prod-applied until the orchestrator/Mark runs it.

BEGIN;

CREATE TABLE IF NOT EXISTS license_assignment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Owning client. Resolved by the merge through entity_xref (source_system='pax8') → account.id.
  account_id      uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  -- Distributor discriminator. 'pax8' first; distributor-agnostic by construction.
  source          text NOT NULL DEFAULT 'pax8',
  -- The license's id WITHIN the source (Pax8 license id). The merge upsert key with `source`.
  external_ref    text NOT NULL,
  -- The owning subscription's source id (Pax8 subscription id) — the billing-spine back-reference.
  subscription_ref text,
  -- Product identity (denormalised from bronze for readability; the source product id + name).
  product_id      text,
  product_name    text,
  -- ACTUAL assigned seat/unit count — the actual side of the contracted-vs-actual true-up (#1041).
  quantity        integer,
  -- License status as the distributor reports it ('assigned' | 'available' | …).
  status          text,
  -- Link → the silver device this license is assigned to, when the distributor exposes an
  -- assignee that resolves to one (the CMDB "what is licensed" link, #1042). NULL until resolved.
  device_id       uuid REFERENCES device(id) ON DELETE SET NULL,
  -- Link → the client agreement this license is attached to (#1085 agreement-attach). NULL until
  -- attached. SET NULL on contract delete (the link is informational, never blocks the contract).
  contract_id     uuid REFERENCES contract(id) ON DELETE SET NULL,
  -- When the source row was last collected (bronze collected_at, carried for freshness).
  collected_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- One row per distributor license — the merge's idempotent upsert key.
CREATE UNIQUE INDEX IF NOT EXISTS uq_license_assignment_source
  ON license_assignment (source, external_ref);
-- Account roll-up: "every license for this client" (the true-up + billing read path).
CREATE INDEX IF NOT EXISTS ix_license_assignment_account ON license_assignment (account_id);
-- Reverse links for the CMDB / agreement panels.
CREATE INDEX IF NOT EXISTS ix_license_assignment_device ON license_assignment (device_id)
  WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_license_assignment_contract ON license_assignment (contract_id)
  WHERE contract_id IS NOT NULL;

COMMENT ON TABLE license_assignment IS
  'Silver: account-resolved distributor license facts (#1223, epic #1042). One row per assigned '
  'license — the ACTUAL licensed quantity for the #1041 true-up, plus optional device_id (license '
  '→ device, CMDB) and contract_id (license → agreement, #1085) links. Distributor-agnostic '
  '(`source`; pax8 first). Projection of pax8_licenses; the distributor is authoritative, the app '
  'never edits it. Written by the on-prem LP merge (LP ADR-0026). PII-adjacent, access-controlled.';
COMMENT ON COLUMN license_assignment.quantity IS
  'Actual assigned seat/unit count — the ACTUAL side of the contracted-vs-actual seat true-up (#1041).';
COMMENT ON COLUMN license_assignment.device_id IS
  'Silver device this license is assigned to, when resolvable (CMDB "what is licensed"); NULL otherwise.';
COMMENT ON COLUMN license_assignment.contract_id IS
  'Client agreement this license is attached to (#1085 agreement-attach); NULL until attached.';

-- ── Grants (0142/0160 pattern: LP writes the merge, consumers read) ───────────────────
DO $$
BEGIN
  -- On-prem LocalPipeline is the writer (it ingests Pax8 + owns the merge, ADR-0026).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT SELECT, INSERT, UPDATE ON license_assignment TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline grants.';
  END IF;
  -- Backend reads for the recon/procurement runtime; web reads for CMDB/billing render.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmbackendfunction') THEN
    GRANT SELECT ON license_assignment TO "mgid-imperioncrmbackendfunction";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmbackendfunction absent — skipping backend grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrm-web-prd') THEN
    GRANT SELECT ON license_assignment TO "mgid-imperioncrm-web-prd";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrm-web-prd absent — skipping web grants.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mgid-imperioncrmpipeline') THEN
    GRANT SELECT ON license_assignment TO "mgid-imperioncrmpipeline";
  ELSE
    RAISE NOTICE 'role mgid-imperioncrmpipeline absent — skipping pipeline grants.';
  END IF;
END $$;

COMMIT;
