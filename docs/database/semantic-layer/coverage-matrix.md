---
type: OKF Reference
title: Master coverage matrix
description: Every data object → owning domain → implementation archetype → IKF (OKF) concept status → acting ICM workflow. The single map from the data-and-automation doctrine.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [semantic-layer, okf, coverage, matrix, medallion, icm, domain]
timestamp: 2026-06-23T00:00:00Z
---

# Master coverage matrix

Every object in the system → its **owning domain** → **implementation archetype** →
whether it has an **IKF (OKF) concept file** yet → the **ICM workflow** that acts on it.
Archetypes and the loop are defined in
[data-and-automation-doctrine](../../architecture/data-and-automation-doctrine.md); the
domain tier is [ADR-0088](../../decision-records/ADR-0088-icm-self-hosted-managed-agents-runtime.md)
(epic [#695](https://github.com/markdconnelly/ImperionCRM/issues/695)).

**IKF status:** ✅ concept file exists · ⏳ planned (expansion, #536). **Authored
concepts** live in [`tables/`](tables/). The matrix is the whole picture; concept files
are added in batches.

**Archetype legend:** **A** multi-source merge silver · **B** single-source-of-record
silver · **C** append-only ledger + derived view · **D** write-back sidecar (idempotent
external write) · **E** golden/drift · **F** reconciliation view · **G** gold knowledge
object · **H** reference/config/identity.

**Domain legend (ADR-0088):** every entity has **exactly one** owning domain — the rule
that validates the carve (zero or two domains = a defect to resolve). Nine verticals:
**Marketing · Sales · Delivery · Service Desk · Customer Success · Finance · People ·
Knowledge · Security**. Two non-vertical markers: **kernel** — the shared customer record
referenced everywhere (`account`/`contact`/`employee`/`contract`); **horizontal** — an
inherited concern (governance/identity/observability/data-platform), owned by the
Constitution, not a vertical. Contested rows are the seams flagged at the end.

**Data-class legend (ADR-0118, #1034):** the third access axis — data SENSITIVITY, the MSP's
real isolation axis (employees roam all clients; the gate is the class, not the client). Every
object carries exactly one **`data_class`**: **op** operational/CMDB (broad-read default) ·
**fin** financial (always-gate) · **hr** people_hr · **sec** security_credentials (always-gate) ·
**pii** client_pii (always-gate). The class is the THIRD RLS read-predicate and the action-plane
ceiling (one rule, both layers — `app_data_class_allowed()`, migration 0175). always-gate classes
(fin/sec/pii) are the hard ceiling earned autonomy can never auto-cross (#1036). The **Class**
column below is **fully populated** (#1210 backfill): every ✅ concept-bearing row's class is the
authority value carried in that concept file's `data_class` frontmatter; ⏳ / `n/a` rows are
classed here by the same content rule (the file inherits it when authored). A concept file's
`data_class` frontmatter remains the authority for its row.

## CRM core

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| [account](tables/account.md) | kernel | A | op | ✅ | research / QBR-prep; lead dedupe |
| [contact](tables/contact.md) | kernel | A | pii | ✅ | research; lead-response |
| [device](tables/device.md) | Service Desk | A | op | ✅ | asset/security context (Datto RMM precedence + BCDR backup posture, #683) |
| [cloud_asset](tables/cloud_asset.md) | Service Desk | A | op | ✅ | CMDB cloud-asset CI (#874, ADR-0097) |
| [external_identity](tables/external_identity.md) | horizontal | H | op | ✅ | identity resolution |
| [contact_social_identity](tables/contact_social_identity.md) | kernel | B | pii | ✅ | enrichment |
| [contact_enrichment](tables/contact_enrichment.md) | kernel | B | pii | ✅ | enrichment (lawful-basis gated; incl. Entra `directory_groups`, source `m365_directory`, basis `legitimate_interest` — Pipeline #93) |

## Sales

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| [opportunity](tables/opportunity.md) | Sales | A | fin | ✅ | sale→delivery; forecasting |
| [quota](tables/quota.md) | Sales | B | fin | ✅ | forecasting (attainment) |
| [forecast_snapshot](tables/forecast_snapshot.md) | Sales | C | fin | ✅ | forecasting (nightly trend/accuracy) |
| [proposal](tables/proposal.md) | Sales | B | fin | ✅ | proposal-draft |
| [esign_envelope](tables/esign_envelope.md) | Sales | B (DocuSign SoR) | pii | ✅ | e-signature (sale→delivery, DocuSign-gated) |
| [assessment](tables/assessment.md) | Sales | B | pii | ✅ | assessment delivery |
| [assessment_artifact](tables/assessment_artifact.md) | Sales | B | pii | ✅ | assessment evidence |

## Delivery / PM

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| [project](tables/project.md) | Delivery | B | op | ✅ | provisioning |
| [delivery_template](tables/delivery_template.md) | Delivery | B | op | ✅ | provisioning (instantiation) |
| [task](tables/task.md) | Delivery | B | op | ✅ | service-desk / onboarding |
| [sprint](tables/sprint.md) | Delivery | B | op | ✅ | provisioning / delivery (iteration planning) |
| [project_baseline](tables/project_baseline.md) | Delivery | B | op | ✅ | provisioning / delivery (planned-vs-actual) |
| [project_template](tables/project_template.md) | Delivery | B | op | ✅ | provisioning / delivery (project instantiation) |
| [project_provisioning](tables/project_provisioning.md) | Delivery | D | op | ✅ | provisioning executor (autonomy-dialed) |
| [task_ticket_fire](tables/task_ticket_fire.md) | Delivery | D | op | ✅ | JIT ticket-fire executor |
| project_milestone, delivery_template_phase/_task, onboarding_step, meeting_action_item | Delivery | B | op | ⏳ | provisioning / onboarding |
| project_type | Delivery | H | op | ⏳ | n/a (reference) |

## Engagement / service

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| [discovery_call](tables/discovery_call.md) | Sales | B | pii | ✅ | discovery-prep |
| [strategic_business_review](tables/strategic_business_review.md) | Customer Success | B | pii | ✅ | QBR / SBR-prep |
| [ticket](tables/ticket.md) | Service Desk | B (Autotask SoR) | op | ✅ | service-desk |
| [chat_session](tables/chat_session.md) | Service Desk | B (native pre-ticket + deflection) | op | ✅ | service-desk (chatbot deflection / routing) |
| [ci_relationship](tables/ci_relationship.md) | Service Desk | D (app-native CMDB overlay; IT Glue write-back is a separate gated slice) | op | ✅ | CMDB / impact analysis (#647, ADR-0078) |
| [cmdb_ci_overlay](tables/cmdb_ci_overlay.md) | Service Desk | D (app-native per-CI criticality overlay; effective = override ?? derived_default; IT Glue write-back is a separate gated slice) | op | ✅ | CMDB / impact analysis (#648, ADR-0078/0097) |
| [change_request](tables/change_request.md) (+ change_affected_ci) | Service Desk | D (app-native ITIL change working object; Autotask is the eventual record SoR via the gated route #661) | op | ✅ | Change Enablement (#656, ADR-0079; risk #658 / approval #659 / calendar #660 / route #661) |
| [sbr_dimension_score](tables/sbr_dimension_score.md) | Customer Success | B | pii | ✅ | SBR-prep (per-dimension trend vs benchmark) |
| [sbr_ticket](tables/sbr_ticket.md) | Customer Success | B | pii | ✅ | SBR-prep (period ticket history bridge) |
| question_template, question, engagement_answer | Sales | B | pii | ⏳ | discovery / assessment capture |
| [contract](tables/contract.md) | kernel | B | op | ✅ | sale→delivery (DocuSign-gated) |

## Communications

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| [interaction](tables/interaction.md) | Knowledge | B (+ gold) | pii | ✅ | every workflow's research stage |
| [meeting](tables/meeting.md) | Knowledge | B | pii | ✅ | meeting follow-up |
| [conversation](tables/conversation.md) | Knowledge | B (+ gold) | pii | ✅ | conversational intelligence (transcribe→analyze→embed) |
| [conversation_segment](tables/conversation_segment.md) (embedding unit), [conversation_insight](tables/conversation_insight.md) (AI output) | Knowledge | B / G | pii | ✅ | conversational intelligence; risk/objection → forecasting |
| memory_drawer (bronze verbatim, 0167/ADR-0113) | Knowledge | bronze | pii | ⏳ | verbatim capture (#303); recall drills gold→bronze |
| [memory_enrichment](tables/memory_enrichment.md) | Knowledge | B | pii | ✅ | verbatim-memory write-time enrichment (Haiku type/topics/people/action-items; #1199, BE ADR-0086, writer BE #331) |

## Consent / enrichment / exposure

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| [consent_event](tables/consent_event.md) → current_consent | horizontal | C → F | pii | ✅ | **gates all sends & ads** (Governance) |
| [credential_exposure](tables/credential_exposure.md) | Security | A | sec | ✅ | exposure-response |

## Demand generation

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| [campaign](tables/campaign.md) | Marketing | B | op | ✅ | lead-response / nurture |
| [workflow](tables/workflow.md) → step/enrollment | Marketing | B | op | ✅ | nurture executor |
| [workflow](tables/workflow.md) kind=journey (definition jsonb) | Marketing | B | op | ✅ | journey runner (ADR-0073, #398) |
| [lead_score](tables/lead_score.md) | Marketing | C | op | ✅ | lead scoring (rule; routing/journeys/forecast) |
| [segment](tables/segment.md) → segment_member | Marketing | B | pii | ✅ | journey enrollment / list-views (CRM contact set, distinct from ad audience) |
| ad, campaign_metric, campaign_send | Marketing | B | op | ⏳ | campaign ops |
| audience, audience_member | Marketing | B | pii | ⏳ | ad targeting (paid-media audience; distinct from segment) |
| event, event_registration, lead_hook, lead_capture_event | Marketing | B | pii | ⏳ | lead-response |
| social_metric | Marketing | B | op | ⏳ | BI / reporting |

## Time

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| [time_record](tables/time_record.md) | Finance | A | fin | ✅ | monthly-close |
| [timesheet](tables/timesheet.md) | Finance | B | fin | ✅ | time-approval |
| [time_ticket](tables/time_ticket.md) | Finance | D | fin | ✅ | Time Ticket writer (→ Autotask) |
| employee_profile, pay_rate | People | H | hr | ⏳ | n/a (comp-gated) |

## Expense

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| [expense_item](tables/expense_item.md) | Finance | A | fin | ✅ | monthly-close |
| [expense_report](tables/expense_report.md) | Finance | B | fin | ✅ | expense-approval |
| [autotask_expense_report](tables/autotask_expense_report.md) | Finance | D | fin | ✅ | ExpenseReport writer (→ Autotask) |
| [expense_reconciliation](tables/expense_reconciliation.md) | Finance | F | fin | ✅ | monthly-close (QBO match) |
| [receipt_attachment](tables/receipt_attachment.md) | Finance | B | fin | ✅ | receipt handling (Autotask custody lifecycle) |
| [expense_category](tables/expense_category.md) (+ qbo_expense_account bronze SoR), [mileage_rate](tables/mileage_rate.md) | Finance | H | fin | ✅ | n/a (config; QBO-mapped category; rate comp-gated) |

## Revenue / AR

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| [invoice](tables/invoice.md) | Finance | B (QBO read-only mirror) | fin | ✅ | collections / AR-dunning; reconciliation-assurance (#667) |
| [collections_activity](tables/collections_activity.md) | Finance | D (app-native overlay; NOT synced to QBO) | fin | ✅ | collections / AR-dunning (#677/#678) |

## Procurement / licensing

| Object | Domain | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|---|
| [license_assignment](tables/license_assignment.md) | Finance | A | ✅ | agreement true-up (#1041); procure→provision→bill (#1042) |

## Security / MSSP

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| [posture_snapshot](tables/posture_snapshot.md) (+pillar) | Security | C (INSERT-only) | sec | ✅ | posture-report |
| [tenant_posture](tables/tenant_posture.md) | Security | E | sec | ✅ | drift-monitor |
| [dns_domain](tables/dns_domain.md) | Security | E | sec | ✅ | DNS drift-monitor |
| [dns_golden](tables/dns_golden.md) | Security | E | sec | ✅ | golden approval (human-gated) |
| [posture_policy](tables/posture_policy.md), *_golden (CA / Intune / Autopilot / device-config / Defender XDR / Purview compliance) | Security | E | sec | ✅ | drift-monitor (autonomy-dialed) |
| account_domain | Security | H | op | ⏳ | domain registry (operator-curated) |
| defender_incidents, defender_alerts | Security | B | sec | ⏳ | incident triage |
| [defender_incident_ticket_link](tables/defender_incident_ticket_link.md) | Security | D | sec | ✅ | incident→ticket (ADR-0059) |

## Knowledge (gold)

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| [knowledge_object](tables/knowledge_object.md) | Knowledge | G | op | ✅ | RAG for all workflows |
| knowledge_embedding | Knowledge | G | op | ⏳ | (vector pair; Voyage 1024d) |

## Reference / config / identity

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| [app_user](tables/app_user.md) | horizontal | H | hr | ✅ | n/a (Identity / RBAC) |
| [connection](tables/connection.md) | horizontal | H | sec | ✅ | n/a (Data Platform / sync config) |
| [source_skill](tables/source_skill.md) | horizontal | H | op | ✅ | the tool-routing hop OKF points at (per-provider sanctioned skill; ADR-0104) |
| connector_instance | horizontal | H | op | ⏳ | n/a (Data Platform / connector catalog — #416/#747, migration 0125) |
| [agent_tool_grant](tables/agent_tool_grant.md) | horizontal | H | op | ✅ | the tool-routing authority (ADR-0104; OKF grounds, this grants) |
| agent, agent_settings | horizontal | H | op | ⏳ | n/a (Governance / agent config) |
| [agent_autopilot_policy](tables/agent_autopilot_policy.md) | horizontal | H | op | ✅ | the autonomy dial — every tier reads its rung (#721, ADR-0087) |
| account_tenant, saved_view | horizontal | H | op | ⏳ | n/a |
| report_definition, dashboard, dashboard_item | horizontal | B/H | op | ⏳ | n/a (BI hub — saved reports & dashboards, ADR-0062, migration 0124) |
| [metric_definition](tables/metric_definition.md) | horizontal | H | op | ✅ | the headless-BI metric contract — one governed definition agents & dashboards share; seed expanded with 7 bound sales/service/finance contracts (#1050/#1055/#1114) |
| [entity_xref](tables/entity_xref.md) | horizontal | H | op | ✅ | the identity spine — every source id → one internal entity; agents resolve before acting via `entity_resolve()` (#1049/#1054, resolver+`external_identity` backfill #1111) |

## Audit / governance

| Object | Domain | Archetype | Class | IKF | Acting ICM workflow |
|---|---|---|---|---|---|
| audit_log | horizontal | C | op | n/a | (Observability — the audit substrate) |
| agent_run, agent_message, agent_memory | horizontal | C / B / G | pii | n/a | Observability — orchestrator telemetry (transcripts/memory may carry client content → restrictive class; agent_conversation carries a per-row data_class, 0163/0175) |
| agent_event | horizontal | H | op | n/a | Wake-event inbox — durable/idempotent/replayable; the backend dispatcher drains it (#998, ADR-0111) |
| agent_subscription | horizontal | H | op | n/a | Predicate fan-out — (event_type → workflow) + structured predicate; one event → N matching runs, skips non-matches (#999, ADR-0111). Contract: [docs/agents/event-subscription-predicate.md](../../agents/event-subscription-predicate.md) |
| board_session (+member/+message/+recommendation) | horizontal | B | op | n/a | Governance — board deliberation |
| feature_request (+vote/+status_history) | horizontal | B | op | n/a | Engineering — feedback (GitHub-coupled) |
| domain_owner | horizontal | H | op | n/a | Governance — per concept/domain → the business owner who resolves grounding conflicts (#1035, ADR-0119) |
| grounding_conflict (+event) | horizontal | H | op | n/a | Governance — canon·company·personal disagreement → domain-owner resolution; never auto-resolved, ledgered (#1035, ADR-0119) |

## Bronze source tables (raw, per-source — archetype inputs)

Bronze never gets its own concept file (it is raw, lossless input) and carries no domain
or data_class of its own — it inherits both the **domain** and the **data_class** of the
silver entity it feeds (so e.g. the `qbo_*`/`website_expense_*` feeds are `fin`, the
`darkwebid`/`televy` feeds are `sec`, the M365 mail/Teams + social feeds are `pii`).

| Feeds | Bronze tables |
|---|---|
| account / contact / device (A) | `{autotask,apollo,itglue,m365,website}_contacts` · `{autotask,apollo,itglue,website}_companies` · `{itglue,m365,website}_devices` · `datto_rmm_devices` · `unifi_devices` (network infra: switches/APs/gateways + firmware compliance, #1053/0162; collector LP #73/#259, merge LP follow-up) · `datto_bcdr_backups` (backup-posture field merge, #683) · `intune_managed_apps` (device app-inventory drill, #261/0148) |
| cloud_asset (A) | `cloud_resources` (source `azure_arm`, 0130; Azure first, `aws_*`/`gcp_*` later) |
| opportunity (A) | `kqm_opportunities` (+lines/+sections/+sales_orders) · `autotask_opportunities` · `website_opportunities` |
| contract / ticket (B) | `autotask_contracts` · `docusign_contracts` · `autotask_tickets` |
| time_record (A) | `website_time_entry` · `autotask_time_entry` |
| expense_item (A) | `website_expense_item` · `website_mileage` (manual, #851) · `mileiq_drive` · `qbo_purchases` (match) |
| invoice (B, QBO read-only mirror) | `qbo_invoices` (+ `qbo_customers` join; `qbo_payments` future match) |
| credential_exposure / assessment_artifact (A/B) | `darkwebid_exposures` · `televy_reports` |
| interaction (B) | `m365_mail_messages` · `m365_teams_chats/_meetings` · `facebook_posts/_comments/_messages` · `instagram_media/_comments` |
| posture / dns (C/E) | `secure_scores` · `defender_incidents/_alerts` · `entra_*` · `intune_*` · `*_golden` · `dns_zones` · `dns_records` · `sharepoint_sites` · `azure_*` · `sentinel_*` |
| social_metric (B) | `meta_insights` |
| account (via `entity_xref`) + license_assignment (A) | `pax8_companies` · `pax8_subscriptions` · `pax8_licenses` · `pax8_orders` (0161; collector LP #279). Merge LP #280 resolves company→`account` into `entity_xref`; license facts → `license_assignment` (0185) |

## Seams to resolve (the one-domain rule)

These rows are defensibly single-owned today but sit on a boundary; revisit as the domain
tier matures:

- **`device`** — Service Desk (CMDB authority) vs Security (asset context). Owned by Service
  Desk; Security reads it.
- **`time_record` / `timesheet`** — Finance (monthly-close authority) vs People (workforce).
  Owned by Finance; People reads attendance.
- **`contact_enrichment` / `contact_social_identity`** — kernel satellite vs Marketing demand.
  Kept on **kernel** as contact extensions; Marketing consumes.
- **`discovery_call` / `assessment*`** — Sales (qualification) vs Customer Success. Owned by
  Sales; CS consumes downstream.

---

Expansion of remaining ⏳ concepts is tracked in
[#536](https://github.com/markdconnelly/ImperionCRM/issues/536). The staleness CI gate
([#535](https://github.com/markdconnelly/ImperionCRM/issues/535)) is **live**: a PR
changing a silver table with a ✅ concept file must update that file in the same PR
(see [semantic-layer-gate](../../operations/semantic-layer-gate.md)). The domain column
feeds the **live** `icm-conformance` check ([#702](https://github.com/markdconnelly/ImperionCRM/issues/702)):
every ICM `okf_rooms` entry must resolve to a concept-bearing (✅) row here, else the
gate fails the PR (`scripts/agent-yaml-gate.mjs`; see
[agent-yaml-schema](../../agents/agent-yaml-schema.md)).
