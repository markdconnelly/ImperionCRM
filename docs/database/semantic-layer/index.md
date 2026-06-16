---
type: OKF Bundle
title: Silver semantic layer
description: Curated business meaning, join paths, and source-of-record rules for the silver tier — human- and agent-readable, version-controlled, PII-free.
resource: ../../decision-records/ADR-0086-okf-semantic-layer-over-silver.md
tags: [silver, semantic-layer, okf, data-model]
timestamp: 2026-06-16T02:00:00Z
---

# Silver semantic layer (OKF bundle)

An [OKF](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
bundle — one markdown file per silver concept — that captures what a silver entity
**means**, what it **joins to**, and which source is **authoritative**. Standard:
[ADR-0086](../../decision-records/ADR-0086-okf-semantic-layer-over-silver.md); the
required shape, depth bar, and archetype-keyed sections are in
[AUTHORING.md](AUTHORING.md).

This layer is *meaning*, not *structure* and not *data*:

- **Structure** lives in [data-model.md](../data-model.md) (the ERD) and the
  [migrations](../../../db/migrations) (the schema source of record).
- **Data** lives in the database. **No row-level data or PII appears here** — any
  personal or volatile answer is resolved against the live read-only `postgres`
  MCP at query time (CLAUDE.md §8). Examples below are illustrative and redacted.
- **Code knowledge** is out of scope — that is CLAUDE.md / ADRs / Graphify.

## Coverage

The [master coverage matrix](coverage-matrix.md) maps **every** object → implementation
archetype → IKF status → acting ICM workflow. The concept files below are the authored
subset; remaining entities are tracked for expansion
([#536](https://github.com/markdconnelly/ImperionCRM/issues/536)).

## Concepts

| Concept | Archetype | Authoritative source | Governing ADR |
|---|---|---|---|
| [`account`](tables/account.md) | merge | website > autotask > itglue > apollo | ADR-0039 |
| [`contact`](tables/contact.md) | merge | website > autotask > itglue > m365 > apollo | ADR-0039 |
| [`device`](tables/device.md) | merge | website > itglue > m365 | ADR-0039 |
| [`opportunity`](tables/opportunity.md) | merge | website > autotask > KQM | ADR-0080 |
| [`quota`](tables/quota.md) | single-SoR | website system of record | ADR-0072 |
| [`forecast_snapshot`](tables/forecast_snapshot.md) | derived ledger | website (nightly snapshot job) | ADR-0072 |
| [`credential_exposure`](tables/credential_exposure.md) | merge | Dark Web ID (email+domain match) | ADR-0040 |
| [`proposal`](tables/proposal.md) | single-SoR | website system of record | ADR-0019 |
| [`esign_envelope`](tables/esign_envelope.md) | single-SoR | DocuSign (external SoR for status) | ADR-0071 |
| [`assessment`](tables/assessment.md) | single-SoR | website system of record | ADR-0022 |
| [`assessment_artifact`](tables/assessment_artifact.md) | single-SoR | per-source evidence (under parent assessment) | ADR-0023 |
| [`project`](tables/project.md) | single-SoR | website system of record | ADR-0020 |
| [`task`](tables/task.md) | single-SoR | website system of record | ADR-0052 |
| [`sprint`](tables/sprint.md) | single-SoR | website system of record | ADR-0069 |
| [`project_baseline`](tables/project_baseline.md) | single-SoR | website system of record | ADR-0069 |
| [`delivery_template`](tables/delivery_template.md) | single-SoR | website system of record | ADR-0081 |
| [`project_template`](tables/project_template.md) | single-SoR | website system of record | ADR-0070 |
| [`discovery_call`](tables/discovery_call.md) | single-SoR | website system of record | ADR-0023 |
| [`strategic_business_review`](tables/strategic_business_review.md) | single-SoR | website system of record | ADR-0022 |
| [`ticket`](tables/ticket.md) | single-SoR | Autotask (external SoR) | ADR-0044 |
| [`chat_session`](tables/chat_session.md) | single-SoR | website (backend chat process; native pre-ticket) | ADR-0074 |
| [`contract`](tables/contract.md) | single-SoR | Autotask (external SoR) | ADR-0044 |
| [`interaction`](tables/interaction.md) | single-SoR | per-source / per-channel | ADR-0011 |
| [`meeting`](tables/meeting.md) | single-SoR | per-platform (1:1 with interaction) | ADR-0011 |
| [`conversation`](tables/conversation.md) | single-SoR (+ gold) | app SoR; source supplies the capture (ACS/Teams/upload) | ADR-0068 |
| [`campaign`](tables/campaign.md) | single-SoR | website system of record | ADR-0053 |
| [`workflow`](tables/workflow.md) | single-SoR | website system of record | ADR-0027 |
| [`lead_score`](tables/lead_score.md) | derived ledger | website (backend/LP scoring pass) | ADR-0073 |
| [`timesheet`](tables/timesheet.md) | single-SoR | website system of record | ADR-0082 |
| [`expense_report`](tables/expense_report.md) | single-SoR | website system of record | ADR-0083 |
| [`time_record`](tables/time_record.md) | merge | website attendance (Autotask corroborates) | ADR-0082 |
| [`expense_item`](tables/expense_item.md) | merge | website out-of-pocket / MileIQ miles | ADR-0083 |
| [`invoice`](tables/invoice.md) | single-SoR (mirror) | QuickBooks Online (read-only external SoR) | ADR-0085 |
| [`collections_activity`](tables/collections_activity.md) | overlay (write-back sidecar, app-native) | website system of record (dunning state; NOT synced to QBO) | ADR-0085/0087 |
| [`consent_event`](tables/consent_event.md) | ledger | append-only; current_consent is the gate | ADR-0014 |
| [`posture_snapshot`](tables/posture_snapshot.md) | ledger | append-only; grade at capture | ADR-0051 |
| [`tenant_posture`](tables/tenant_posture.md) | golden/drift | observed vs human-approved golden | ADR-0051 |
| [`dns_domain`](tables/dns_domain.md) | golden/drift | account_domain SoR; dns_golden approved | ADR-0063 |
| [`dns_golden`](tables/dns_golden.md) | golden/drift | operator approval (Set-ImperionDnsGoldenState) | ADR-0063 |
| [`knowledge_object`](tables/knowledge_object.md) | gold | on-prem produced; Voyage 1024d | ADR-0041 |
| [`app_user`](tables/app_user.md) | reference | Entra ID identity | ADR-0016 |
| [`connection`](tables/connection.md) | reference | sync config; tokens in Key Vault (by ref) | ADR-0024 |

Enrichment-agent sync and vectorization of this bundle are tracked as follow-ups
(LocalPipelineEnrichment #175 / #176).
