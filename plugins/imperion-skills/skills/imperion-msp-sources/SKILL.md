---
name: imperion-msp-sources
description: Imperion CRM's Autotask and IT Glue integration contracts — credential locations (Key Vault vs SecretStore), API auth and pagination shapes, the poll-don't-duplicate rule, ticket-webhook hash parity, and the flatten→IT Glue→Postgres pattern. Use when working with Autotask, IT Glue, PSA tickets, company credentials (conn-company-*), the refresh endpoint, or bronze landing for these sources in any ImperionCRM repo.
---

# Imperion: Autotask + IT Glue (the MSP sources)

## Where credentials live (two homes, never cross)

- **Cloud (`ImperionCRM_Pipeline`):** Key Vault secrets `conn-company-autotask` /
  `conn-company-itglue`, written by the backend via Settings → Company credentials.
- **On-prem (`ImperionCRM_LocalPipelineEnrichment`):** PowerShell SecretStore, unlocked
  by the machine certificate. IT Glue uses **two keys**: read-only for the export,
  scoped writer for the documentation hub — the export key can never mutate.

## API shapes (verified against the integration docs)

- **Autotask:** headers `UserName` / `Secret` / `ApiIntegrationCode` after **zone
  discovery**. Incremental pulls page on `lastActivityDate` since the stored cursor
  (field names flagged "confirm against live tenant" — check before relying).
- **IT Glue:** header `x-api-key`, regional base from `region` (`us`/`eu`/`au`;
  on-prem default `https://api.itglue.com`). JSON:API — records are
  `{ data: [{ id, type, attributes, relationships }] }`; paginate `page[size]` (max
  1000) + follow `links.next`; change windows via `sort=-updated-at` + bronze
  `content_hash` watermark. Honor `429`/`Retry-After` with backoff (per-key, per-10s
  and daily caps). `passwords` and secret-bearing fields are **excluded** from export.

## The rules that prevent real mistakes

1. **Reference, don't duplicate (front-end ADR-0012):** Autotask and IT Glue remain
   authoritative. Silver is assembled by precedence merge — `website` (manual) outranks
   `autotask`, which outranks `itglue`/`m365`/`apollo` (pipeline ADR-0006).
2. **Cadence (pipeline ADR-0008):** `pollDue()` gates scheduled runs; on-demand refresh
   passes `force: true` — the click IS the cadence.
3. **Idempotency:** upsert on `(tenant, source, external_id)` guarded by
   `content_hash IS DISTINCT FROM`. Re-runs converge, never duplicate.
4. **Ticket-webhook hash parity (pipeline ADR-0013):** the cloud webhook and the on-prem
   bulk loader write the SAME `autotask_tickets` rows. The content hash must replicate
   the PowerShell canonical form **byte-for-byte** (golden-vector test exists) — and the
   webhook fetches the FULL entity (`Tickets/{id}`) because landing partial display
   fields would null-clobber the bulk row. Datetime offset forms break hash parity
   (UTC assumption).
5. **Webhook responses:** unrecognized entities/actions → 202 (so Autotask never
   retries into a dead end or deactivates the webhook); invalid HMAC
   (`x-hook-signature`, hex, key from `AUTOTASK_WEBHOOK_SECRET_NAME`) → 401;
   transient failures → 500 for redelivery.

## Flatten → IT Glue → Postgres (local-pipeline ADR-0006)

Operational/infrastructure data (devices, configurations, the 365/Azure picture)
flattens to a `[PSCustomObject]` table that is written into IT Glue as flexible assets
(related via Tag traits) AND imported into Postgres bronze — one shape, two consumers.
Pure CRM/sales data (Apollo, KQM, DocuSign) skips IT Glue and lands straight in
Postgres. **Every IT Glue write is human-gated**; relationships land in the polymorphic
edge table (see `docs/database/itglue-to-postgres-relationships.md`).

## Authoritative sources

- `ImperionCRM_Pipeline/docs/integrations/autotask.md` + `itglue.md` (each has a
  "to verify against live" list — read it before prod work)
- `ImperionCRM_LocalPipelineEnrichment/docs/integrations/itglue.md` ·
  `CLAUDE.md` §5–§6 · local-pipeline ADR-0005, ADR-0006
- Code: `src/shared/clients/{autotask,itglue}.ts`, `src/shared/ticket-bronze.ts` (pipeline)

ADR numbers are per-repo — always qualify cross-repo references with the repo name.
