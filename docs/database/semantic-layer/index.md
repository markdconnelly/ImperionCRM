---
type: OKF Bundle
title: Silver semantic layer
description: Curated business meaning, join paths, and source-of-record rules for the silver tier — human- and agent-readable, version-controlled, PII-free.
resource: ../../decision-records/ADR-0086-okf-semantic-layer-over-silver.md
tags: [silver, semantic-layer, okf, data-model]
timestamp: 2026-06-14T00:00:00Z
---

# Silver semantic layer (OKF bundle)

An [OKF](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
bundle — one markdown file per silver concept — that captures what a silver entity
**means**, what it **joins to**, and which source is **authoritative**. Standard:
[ADR-0086](../../decision-records/ADR-0086-okf-semantic-layer-over-silver.md).

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
| [`credential_exposure`](tables/credential_exposure.md) | merge | Dark Web ID (email+domain match) | ADR-0040 |
| [`proposal`](tables/proposal.md) | single-SoR | website system of record | ADR-0019 |
| [`assessment`](tables/assessment.md) | single-SoR | website system of record | ADR-0022 |
| [`project`](tables/project.md) | single-SoR | website system of record | ADR-0020 |
| [`task`](tables/task.md) | single-SoR | website system of record | ADR-0052 |
| [`delivery_template`](tables/delivery_template.md) | single-SoR | website system of record | ADR-0081 |
| [`discovery_call`](tables/discovery_call.md) | single-SoR | website system of record | ADR-0023 |
| [`strategic_business_review`](tables/strategic_business_review.md) | single-SoR | website system of record | ADR-0022 |
| [`ticket`](tables/ticket.md) | single-SoR | Autotask (external SoR) | ADR-0044 |
| [`interaction`](tables/interaction.md) | single-SoR | per-source / per-channel | ADR-0011 |
| [`campaign`](tables/campaign.md) | single-SoR | website system of record | ADR-0053 |
| [`workflow`](tables/workflow.md) | single-SoR | website system of record | ADR-0027 |
| [`timesheet`](tables/timesheet.md) | single-SoR | website system of record | ADR-0082 |
| [`expense_report`](tables/expense_report.md) | single-SoR | website system of record | ADR-0083 |
| [`time_record`](tables/time_record.md) | merge | website attendance (Autotask corroborates) | ADR-0082 |
| [`expense_item`](tables/expense_item.md) | merge | website out-of-pocket / MileIQ miles | ADR-0083 |
| [`consent_event`](tables/consent_event.md) | ledger | append-only; current_consent is the gate | ADR-0014 |
| [`posture_snapshot`](tables/posture_snapshot.md) | ledger | append-only; grade at capture | ADR-0051 |
| [`tenant_posture`](tables/tenant_posture.md) | golden/drift | observed vs human-approved golden | ADR-0051 |
| [`dns_domain`](tables/dns_domain.md) | golden/drift | account_domain SoR; dns_golden approved | ADR-0063 |
| [`knowledge_object`](tables/knowledge_object.md) | gold | on-prem produced; Voyage 1024d | ADR-0041 |
| [`app_user`](tables/app_user.md) | reference | Entra ID identity | ADR-0016 |
| [`connection`](tables/connection.md) | reference | sync config; tokens in Key Vault (by ref) | ADR-0024 |

Enrichment-agent sync and vectorization of this bundle are tracked as follow-ups
(LocalPipelineEnrichment #175 / #176).
