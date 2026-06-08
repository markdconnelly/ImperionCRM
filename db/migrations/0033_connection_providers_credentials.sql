-- Company credential configuration (ADR-0036). Extends the connection provider
-- enum with the company-wide systems an admin configures in Settings → Company
-- credentials: My IT Process, Televy (assessment reporting), Kaseya Quote Manager
-- (quoting), and GDAP (Microsoft delegated admin for Imperion). Adds a 'pending'
-- status for credentials recorded before the backend has written the secret to
-- Key Vault, and a uniqueness guarantee so each company system has exactly one row
-- (re-submitting rotates rather than duplicates).
--
-- NOTE: `ALTER TYPE ... ADD VALUE` must run OUTSIDE a transaction block, so this
-- migration is intentionally not wrapped in BEGIN/COMMIT. Each statement is
-- idempotent. Tokens/secrets are NEVER stored here — only keyvault_secret_ref
-- (CLAUDE.md §5).

-- ── Provider enum: add the company systems ──────────────────────────────────
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'myitprocess';
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'televy';
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'quotemanager';
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'gdap';

-- ── Status enum: 'pending' = recorded, secret not yet in Key Vault ───────────
ALTER TYPE connection_status ADD VALUE IF NOT EXISTS 'pending';

-- ── One row per company system, so credential saves upsert (rotate) ─────────
-- Partial unique index: only company-scope rows are deduped by provider; user
-- scope can have many (one per employee).
CREATE UNIQUE INDEX IF NOT EXISTS uq_connection_company_provider
  ON connection(provider) WHERE scope = 'company';
