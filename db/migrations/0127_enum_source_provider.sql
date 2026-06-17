-- Two independent, additive enum-value adds, batched into one migration per the backlog wave.
--
--   #799 — `interaction_source += 'm365_call'`: backend ADR-0049 (M365 comms-filter) defines a
--          call-records / transcripts path that writes `interaction.source = 'm365_call'` /
--          `kind = 'call'` (owner-first, idempotent by `(source, external_ref = callId)`,
--          metadata-only by default). The path (backend #126, deploy-dormant behind
--          `M365_INGEST_CALLS_ENABLED`) cannot be enabled in prod until this value exists.
--   #603 — `connection_provider += 'meta'`: the company Meta (Facebook / Instagram) send
--          credential is recorded as a `scope='company'` `connection` row keyed by
--          `provider='meta'` (Settings provider-list shipped in #586; consumed by pipeline
--          #89 / PR #113). The token set lives in Key Vault (`conn-company-meta`), never the
--          DB. Distinct from the existing per-user `facebook` ingest provider.
--
-- NOTE: `ALTER TYPE ... ADD VALUE` must run OUTSIDE a transaction block (and a new value
-- cannot be USED in the same transaction it is added), so this migration is intentionally
-- not wrapped in BEGIN/COMMIT and only adds values. Each statement is idempotent. No secrets,
-- no data backfill — both values stay unused until their gated consumers are enabled.

ALTER TYPE interaction_source  ADD VALUE IF NOT EXISTS 'm365_call';
ALTER TYPE connection_provider ADD VALUE IF NOT EXISTS 'meta';
