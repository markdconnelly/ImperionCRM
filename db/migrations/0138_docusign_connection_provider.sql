-- Add 'docusign' to the connection provider enum so the company-wide DocuSign
-- e-signature integration (Settings → Company credentials, #862 / epic #318) can be
-- recorded as a `scope='company'` row (ADR-0036). The JWT-grant secrets themselves live
-- in Key Vault (Docusign-*-MarkConnelly), never the DB — this row only carries
-- keyvault_secret_ref + status (CLAUDE.md §5).
--
-- NOTE: `ALTER TYPE ... ADD VALUE` must run OUTSIDE a transaction block (and the new
-- value cannot be USED in the same transaction it is added), so this migration is
-- intentionally not wrapped in BEGIN/COMMIT and only adds the value. Idempotent.
--
-- Migration number is a placeholder claimed at merge (system CLAUDE.md §10.3).

ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'docusign';
