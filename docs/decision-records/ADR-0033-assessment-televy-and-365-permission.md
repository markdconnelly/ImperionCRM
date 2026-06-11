# ADR-0033: Assessment evidence (Televy), client-ready report & the 1:1 365 grant

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-08 |
| **Cross-references** | — |

## Problem

The paid AI Security Readiness Assessment must ingest raw Televy telemetry, let the
analyst fill in the data Televy does not cover, and produce a client-ready report. It
also requires a one-time, tenant-wide **read-all** grant on the prospect's Microsoft
365 — which must transition to least-privilege **GDAP** once they become a client.

## Context

`assessment` and `assessment_artifact` (source `televy|m365_graph|google_workspace|
external_scan|phishing_sim|manual`, with bronze/silver/gold) and the editable
`engagement_answer` catalog already exist (ADR-0022/0023). The assessment gates managed
services. Entra is the sole IdP (ADR-0002); least-privilege and Zero-Trust are product
features (CLAUDE.md §5).

## Options considered

1. Assemble the report in-app from the scorecard + priorities + recommendation +
   ingested evidence, with an in-app data-entry form for non-Televy questions; model
   the 365 access as a separate read-all enterprise app that is **revoked and replaced
   by GDAP at onboarding** (this decision).
2. Keep the report external (Word/PDF) (rejected — violates docs-as-code §8 and loses
   the gold/agent-consumable trail).
3. Use GDAP from the start (rejected — GDAP presumes an established managed
   relationship; the assessment is pre-contract and needs a scoped, time-boxed grant).

### Tradeoffs

- (1) one place for evidence + entry + deliverable; clear permission lifecycle. Cost:
  two distinct Graph permission models to operate.
- (2)/(3) simpler in one dimension but break docs-as-code or the access model.

## Decision

- **Assessment detail page**: a `ReportPreview` (six-dimension scorecard, top
  priorities, recommendation, and evidence grouped with **Televy highlighted**) plus a
  **non-Televy data-entry form** that saves to `engagement_answer`
  (`saveAssessmentAnswersAction`). Agent/automation answers still follow the approval
  flow (ADR-0027).
- **365 access model (build deferred):** a dedicated, consent-prompted enterprise app
  with tenant-wide read-only Graph scopes, time-boxed to the assessment. On conversion
  to a client, that grant is **revoked** and access moves to **GDAP** during onboarding
  (least-privilege, delegated, auditable). The actual Graph flow lives in the back-end
  repo (ADR-0018/0028).

## Consequences

### Security impact

The read-all grant is the highest-privilege surface in the product; it is read-only,
time-boxed, consent-prompted, and explicitly de-scoped to GDAP at onboarding. Evidence
is PII/security-sensitive; access is audit-logged (ADR-0016).

### Cost impact

None in-app; Graph/Televy ingestion compute accrues in the back-end when wired.

### Operational impact

No migration (reuses `assessment`, `assessment_artifact`, `engagement_answer`). Runbooks
must cover granting and **revoking** the read-all app and the GDAP handover at
onboarding.

## Future considerations

Automated Televy ingestion into `assessment_artifact`; report export/branding;
report answer pre-fill on revisit; automated revoke-on-conversion.
