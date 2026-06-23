-- 0193: silver `device` — UniFi-merge schema gaps (#1241; filed from LocalPipeline #284,
-- `Invoke-ImperionUniFiMerge`, the on-prem bronze→silver merge `unifi_devices` → silver
-- `device`, LP ADR-0026). Migration number 0193 is a PLACEHOLDER — the real number is
-- claimed at MERGE per system CLAUDE.md §10.3 (the rebased branch takes the next free
-- number just before squash; locate by content, never by this literal).
--
-- WHY. The `device` OKF concept (docs/database/semantic-layer/tables/device.md) names
-- `unifi` a contributing source (precedence `website > datto_rmm > unifi > m365 > itglue`,
-- lateral match key = `mac`, `device_type='network'`) and lists firmware-compliance
-- signals as a follow-up. The current silver `device` (0036, + BCDR posture 0140) cannot
-- support that contract: no `mac` column / `(account_id, mac)` key, no `source`/provenance
-- column (so no replace-from-source scoped to the `unifi` label and no precedence guard),
-- and no place to surface the firmware signals bronze `unifi_devices` (0162) carries
-- losslessly. Verified against prod (read-only MCP, 2026-06-23): none of these columns
-- exist, and `imperion-localpipeline` holds only SELECT on `device` — which is why the
-- UniFi merge writes 0 rows. Mark approved this schema change (#1241).
--
-- WHAT.
--   1. `mac text` + a PARTIAL UNIQUE index `(account_id, mac)` over non-null mac. UniFi
--      network gear has no serial in bronze, so `mac` is its only stable natural key; the
--      partial predicate keeps the existing 430 serial-keyed rows (mac NULL) unconstrained
--      and gives the merge an idempotent keyed upsert per owning account.
--   2. `source text` — the contributing-provider label, mirroring `cloud_asset.source`
--      (0139). Lets the LP merge scope a replace to the `unifi` label, distinguish a
--      UniFi-created row from the serial-keyed estate, and honor precedence (never clobber
--      a higher-authority `website`/`datto_rmm` row). Free-text provider key
--      (`website|datto_rmm|unifi|m365|itglue`), set by the merge writers.
--   3. `firmware_version text` + `firmware_updatable boolean` — surface the
--      config-compliance signals bronze `unifi_devices` carries (`firmware_version`,
--      `firmware_updatable`) onto the unified device, as the OKF concept names.
--
--   4. GRANT `imperion-localpipeline` INSERT, UPDATE on `device` (it holds only SELECT —
--      verified). The on-prem UniFi merge owns the write (merge co-locates with ingestion,
--      LP ADR-0026); mirrors how 0139 granted `cloud_asset` and 0160 granted `entity_xref`
--      to the writer roles. Cloud-pipeline / backend / web keep their existing reads
--      untouched (not re-granted here).
--
-- These columns/grant are DORMANT until prod-applied (Mark-gated) and the UniFi collector
-- hydrates bronze; until then the merge runs on 0 rows (the "runs on 0 rows until device
-- data lands" pattern, ADR-0039). `device` already carries the `set_updated_at` trigger
-- (0036) — no trigger work here.
--
-- Additive + idempotent (ADD COLUMN / CREATE INDEX IF NOT EXISTS) + transactional.
-- Frontend-owned schema (ADR-0042). No secrets; device inventory is access-controlled
-- (ADR-0039), no row-level client data here.

BEGIN;

-- ── Columns ───────────────────────────────────────────────────────────────────────────
ALTER TABLE device
  ADD COLUMN IF NOT EXISTS mac                text,     -- network-device natural key (UniFi lateral match)
  ADD COLUMN IF NOT EXISTS source             text,     -- contributing-provider label (website|datto_rmm|unifi|m365|itglue)
  ADD COLUMN IF NOT EXISTS firmware_version   text,     -- installed firmware (unifi_devices.firmware_version)
  ADD COLUMN IF NOT EXISTS firmware_updatable boolean;  -- compliance signal: available-but-unapplied update

COMMENT ON COLUMN device.mac IS
  'MAC address — the network-device natural key the UniFi bronze→silver merge laterals on (unifi_devices.mac, 0162). UniFi gear has no serial in bronze, so mac is its only stable key. NULL for serial-keyed sources. Client-identifying — keep values out of docs (#1241).';
COMMENT ON COLUMN device.source IS
  'Contributing-provider label (website | datto_rmm | unifi | m365 | itglue), mirroring cloud_asset.source (0139). Set by the merge writers; scopes a replace-from-source to one provider and lets the merge honor precedence (website > datto_rmm > unifi > m365 > itglue) without clobbering a higher-authority row (#1241).';
COMMENT ON COLUMN device.firmware_version IS
  'Installed firmware version, surfaced from bronze unifi_devices.firmware_version (0162). Config-compliance signal for the network-infra device class (#1241).';
COMMENT ON COLUMN device.firmware_updatable IS
  'Firmware compliance: an available-but-unapplied update exists (true) / current (false) / unknown (null). From bronze unifi_devices.firmware_updatable (0162) (#1241).';

-- ── Keyed-upsert index ──────────────────────────────────────────────────────────────────
-- Partial unique on non-null mac, scoped per owning account: the idempotent merge key for
-- UniFi network devices. The existing serial-keyed estate (mac NULL) is excluded by the
-- predicate, so this neither constrains nor rewrites those rows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_device_account_mac
  ON device (account_id, mac)
  WHERE mac IS NOT NULL;

-- ── Grant (0139 cloud_asset / 0160 entity_xref pattern; role may be absent in some envs) ─
-- The on-prem UniFi merge OWNS the write into silver device (merge co-locates with
-- ingestion, LP ADR-0026). Cloud-pipeline / backend / web reads are unchanged.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'imperion-localpipeline') THEN
    GRANT INSERT, UPDATE ON device TO "imperion-localpipeline";
  ELSE
    RAISE NOTICE 'role imperion-localpipeline absent — skipping local-pipeline write grant.';
  END IF;
END $$;

COMMIT;
