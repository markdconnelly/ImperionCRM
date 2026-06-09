-- Add the Dark Web ID company-credential provider (ADR-0040). Dark Web ID (Kaseya / ID Agent)
-- is dark-web compromised-credential monitoring, configured under Settings → Company
-- credentials like the other company systems. `televy` is already a connection_provider
-- (migration 0033) and `artifact_source='televy'` already exists (migration 0013), so only
-- `darkwebid` needs adding here.
--
-- NOTE: `ALTER TYPE ... ADD VALUE` must run OUTSIDE a transaction block, so this migration is
-- intentionally not wrapped in BEGIN/COMMIT. Each statement is idempotent. No secrets.

ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'darkwebid';
