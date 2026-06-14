-- Add 'qbo' to the connection provider enum so the company-wide QuickBooks Online
-- connection (the in-app "Connect QuickBooks" OAuth flow, #528 / backend #117) can be
-- recorded as a `scope='company'` row (ADR-0036/ADR-0048). The token set itself lives
-- in Key Vault (`conn-company-qbo`), never the DB — this row only carries
-- keyvault_secret_ref + status (CLAUDE.md §5).
--
-- NOTE: `ALTER TYPE ... ADD VALUE` must run OUTSIDE a transaction block (and the new
-- value cannot be USED in the same transaction it is added), so this migration is
-- intentionally not wrapped in BEGIN/COMMIT and only adds the value. Idempotent.

ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'qbo';
