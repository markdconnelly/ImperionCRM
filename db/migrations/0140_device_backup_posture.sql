-- 0140_device_backup_posture.sql
--
-- Issue #683 — OKF: admit Datto RMM into silver `device` precedence + BCDR
-- backup-posture field merge (proposed from LocalPipeline #195 / ADR-0018).
--
-- Context: the RMM/managed-estate bronze landed in 0119_bronze_batch_a.sql
-- (`datto_rmm_devices`, `datto_bcdr_backups`), prod-applied, but 0119 deliberately
-- touched NO silver entity. This migration is the silver half: it adds the
-- BCDR backup-posture columns to the unified silver `device` so the cloud-Pipeline
-- `device-matcher` can merge backup posture onto a device (join key = Datto
-- `device_uid`). Datto RMM enters the *identity* merge by precedence
-- (`website > datto_rmm > m365 > itglue`) — that is matcher logic, not schema, and
-- needs no new identity columns (it recomputes the existing merged fields).
--
-- Backup posture does NOT compete for device-identity precedence; it is a
-- field-scoped contribution joined per device. Columns are nullable and unpopulated
-- until the cloud-Pipeline merge wiring lands (separate ImperionCRM_Pipeline PR) —
-- mirrors the "runs on 0 rows until device data lands" pattern (ADR-0039).
--
-- Additive, idempotent (ADD COLUMN IF NOT EXISTS), transactional. No secrets, no PII.

BEGIN;

ALTER TABLE device
  ADD COLUMN IF NOT EXISTS datto_device_uid    text,         -- Datto RMM/BCDR join key (= datto_*_*.device_uid)
  ADD COLUMN IF NOT EXISTS backup_protected    boolean,      -- protected / unprotected (datto_bcdr_backups.protected_status)
  ADD COLUMN IF NOT EXISTS last_backup_at       timestamptz, -- datto_bcdr_backups.last_backup_at
  ADD COLUMN IF NOT EXISTS last_good_backup_at  timestamptz; -- datto_bcdr_backups.last_good_backup_at

COMMENT ON COLUMN device.datto_device_uid IS
  'Datto RMM/BCDR device uid — join key to datto_rmm_devices / datto_bcdr_backups bronze (0119). Set by the cloud-Pipeline device-matcher (#683).';
COMMENT ON COLUMN device.backup_protected IS
  'BCDR backup posture: protected (true) / unprotected (false) / unknown (null). Field-scoped merge, not identity precedence (#683).';
COMMENT ON COLUMN device.last_good_backup_at IS
  'BCDR: timestamp of the last verified-good backup for this device (#683).';

-- The matcher joins bronze by device_uid; index the silver carry-over for idempotent re-merge.
CREATE INDEX IF NOT EXISTS idx_device_datto_uid ON device(datto_device_uid);

COMMIT;
