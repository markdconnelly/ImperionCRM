---
adr: 0040
title: "Dark Web ID + Televy ingestion (credential_exposure entity)"
status: accepted
date: 2026-06-08
repo: frontend
summary: "Dark Web ID compromises land in a new silver `credential_exposure`; Televy reports land as `assessment_artifact`."
tags: [security-posture]
---
# ADR-0040: Dark Web ID + Televy ingestion (credential_exposure entity)

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-08 |
| **Cross-references** | pipeline ADR-0010 |

## Amendment — 2026-06-24: Dark Web ID auth is HTTP Basic (username + password), not a single API key

The original ingestion assumption — that Dark Web ID authenticates with a single bearer
API key (`Authorization: Bearer <apiKey>`) — was **WRONG**. The live Kaseya / ID Agent
Dark Web ID API uses **HTTP Basic Auth (web-services username + Dark Web ID password)**
plus **IP allowlisting**, against base URL `https://secure.darkwebid.com/`. The username is
a Dark Web ID web-services user; the password is a Dark Web ID-specific password (separate
from KaseyaOne). Source: Kaseya help docs (help.darkwebid.kaseya.com, "Enabling API access").

Corrections:

- The `darkwebid` `COMPANY_PROVIDERS` entry now declares **two** fields — `username`
  (text) + `password` (secret) — replacing the single `apiKey` field.
- The `conn-company-darkwebid` Key Vault secret now holds a JSON blob `{username, password}`.
  The backend already custodies company credentials as an opaque `JSON.stringify(fields)` blob,
  so **no backend change** is required — this PR is purely the credential-shape contract.
- The calling IP (cloud Pipeline / on-prem LocalPipeline egress) must be allowlisted in
  Dark Web ID for the API to respond.

The consumers are corrected in companion PRs in their own repos:
`ImperionCRM_LocalPipelineEnrichment` (on-prem LP collector) and `ImperionCRM_Pipeline`
(cloud Pipeline client). This amendment supersedes the single-API-key / bearer auth wording
below in-place; the rest of the decision (the `credential_exposure` silver entity, the bronze
shape, the merge, the cadence selector) is unchanged.

## Problem

Two MSP security/assessment sources need to flow into the platform: **Dark Web ID** (Kaseya /
ID Agent dark-web monitoring for compromised credentials) and **Televy** (assessment
scorecards/reports). Dark Web ID has no home in the model; Televy is already a configured
company-credential provider but nothing ingests it. We need the schema + scaffolding to bring
both in via the existing medallion (bronze → merge → silver) pattern.

## Context

`assessment_artifact` (migration 0013) already exists as the silver landing for assessment
evidence and its `artifact_source` enum already includes `televy`. The per-source bronze
pattern (ADR-0039) is the established shape for cloud-API sources pulled by the Azure Functions
pipeline (`ImperionCRM_Pipeline`), distinct from the on-prem local-pipeline bronze (migration
0038) which uses a `tenant_id/source/external_id/raw_payload/content_hash` envelope. Dark Web
ID and Televy are cloud APIs, so they follow the ADR-0039 per-source shape like
autotask/itglue/apollo.

## Decision

- **Dark Web ID → new silver `credential_exposure`** (migration 0043): per compromised
  credential — `email, breach_source, breach_date, exposed_data[], password_status, severity,
  status`, linked to `contact` (by email) and `account` (by domain) during merge;
  `UNIQUE(email, breach_source)` dedupe. Raw compromises land in bronze
  **`darkwebid_exposures`** (ADR-0039 shape) and merge in. View `exposure_bronze_all` for
  symmetry/future sources.
- **Televy → existing `assessment_artifact`** (`source='televy'`): raw reports stage in bronze
  **`televy_reports`**, and the merge matches each to an `assessment` and writes an
  `assessment_artifact`; an unmatched report is staged (stamped processed, not dropped).
- **`darkwebid` company-credential provider** added (migration 0042 enum + the
  `COMPANY_PROVIDERS` entry); the Settings → Company credentials card + poll-cadence selector
  render automatically. Televy's card already exists.
- **Wired but gated:** the pipeline clients + poll timers are built and registered but no-op
  until the API key is configured (and respect `pollDue`, ADR-0038). API base URLs/auth live in
  pipeline config; response-field mappings are flagged assumptions to confirm on first live run
  (same posture as Autotask/IT Glue). Pipeline side: pipeline ADR-0010.

## Consequences

### Security impact

Positive: Dark Web ID surfaces compromised-credential risk per contact/company (a security
feature). No secrets in the repo/DB — API keys live in Key Vault, referenced by the company
`connection` row (CLAUDE.md §5). `credential_exposure` is sensitive; access is gated by the
app's existing auth/RBAC and it is not exposed to unauthenticated paths.

### Cost impact

Negligible schema cost. Polling cost is operator-controlled via the cadence selector (ADR-0038)
and `0 = paused`.

### Operational impact

Additive migrations 0042 (enum, non-transactional) + 0043 (tables, transactional), applied
before the new code deploys. Nothing ingests until the Dark Web ID / Televy API keys are entered
in Settings. Surfacing `credential_exposure` on the Security page and confirming the live API
field shapes are deliberate follow-ups.

## Future considerations

Security-page panel for exposures (counts, drill-down); confirm Dark Web ID / Televy API
endpoints + payload shapes on first live pull; gold summaries + embeddings over exposures/reports.
