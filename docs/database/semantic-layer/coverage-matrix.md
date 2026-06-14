---
type: OKF Reference
title: Master coverage matrix
description: Every data object → implementation archetype → IKF (OKF) concept status → acting ICM workflow. The single map from the data-and-automation doctrine.
resource: ../../architecture/data-and-automation-doctrine.md
tags: [semantic-layer, okf, coverage, matrix, medallion, icm]
timestamp: 2026-06-14T00:00:00Z
---

# Master coverage matrix

Every object in the system → its **implementation archetype** → whether it has an **IKF
(OKF) concept file** yet → the **ICM workflow** that acts on it. Archetypes and the loop
are defined in
[data-and-automation-doctrine](../../architecture/data-and-automation-doctrine.md).

**IKF status:** ✅ concept file exists · ⏳ planned (expansion, #536). **Authored
concepts** live in [`tables/`](tables/). The matrix is the whole picture; concept files
are added in batches.

**Archetype legend:** **A** multi-source merge silver · **B** single-source-of-record
silver · **C** append-only ledger + derived view · **D** write-back sidecar (idempotent
external write) · **E** golden/drift · **F** reconciliation view · **G** gold knowledge
object · **H** reference/config/identity.

## CRM core

| Object | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|
| [account](tables/account.md) | A | ✅ | research / QBR-prep; lead dedupe |
| [contact](tables/contact.md) | A | ✅ | research; lead-response |
| [device](tables/device.md) | A | ✅ | asset/security context |
| external_identity | H | ⏳ | identity resolution |
| contact_social_identity | B | ⏳ | enrichment |
| contact_enrichment | B | ⏳ | enrichment (lawful-basis gated) |

## Sales

| Object | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|
| [opportunity](tables/opportunity.md) | A | ✅ | sale→delivery |
| [proposal](tables/proposal.md) | B | ✅ | proposal-draft |
| [assessment](tables/assessment.md) | B | ✅ | assessment delivery |
| assessment_artifact | B | ⏳ | assessment evidence |

## Delivery / PM

| Object | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|
| [project](tables/project.md) | B | ✅ | provisioning |
| [delivery_template](tables/delivery_template.md) | B | ✅ | provisioning (instantiation) |
| [task](tables/task.md) | B | ✅ | service-desk / onboarding |
| project_provisioning | D | ⏳ | provisioning executor (autonomy-dialed) |
| task_ticket_fire | D | ⏳ | JIT ticket-fire executor |
| project_milestone, delivery_template_phase/_task, onboarding_step, meeting_action_item | B | ⏳ | provisioning / onboarding |
| project_type | H | ⏳ | n/a (reference) |

## Engagement / service

| Object | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|
| [discovery_call](tables/discovery_call.md) | B | ✅ | discovery-prep |
| [strategic_business_review](tables/strategic_business_review.md) | B | ✅ | QBR / SBR-prep |
| [ticket](tables/ticket.md) | B (Autotask SoR) | ✅ | service-desk |
| sbr_dimension_score, sbr_ticket | B | ⏳ | SBR-prep |
| question_template, question, engagement_answer | B | ⏳ | discovery / assessment capture |
| contract | B | ⏳ | sale→delivery (DocuSign-gated) |

## Communications

| Object | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|
| [interaction](tables/interaction.md) | B (+ gold) | ✅ | every workflow's research stage |
| meeting | B | ⏳ | meeting follow-up |

## Consent / enrichment / exposure

| Object | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|
| [consent_event](tables/consent_event.md) → current_consent | C → F | ✅ | **gates all sends & ads** |
| [credential_exposure](tables/credential_exposure.md) | A | ✅ | exposure-response |

## Demand generation

| Object | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|
| [campaign](tables/campaign.md) | B | ✅ | lead-response / nurture |
| [workflow](tables/workflow.md) → step/enrollment | B | ✅ | nurture executor |
| ad, campaign_metric, campaign_send | B | ⏳ | campaign ops |
| audience, audience_member | B | ⏳ | segmentation |
| event, event_registration, lead_hook, lead_capture_event | B | ⏳ | lead-response |
| social_metric | B | ⏳ | BI / reporting |

## Time

| Object | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|
| [time_record](tables/time_record.md) | A | ✅ | monthly-close |
| [timesheet](tables/timesheet.md) | B | ✅ | time-approval |
| time_ticket | D | ⏳ | Time Ticket writer (→ Autotask) |
| employee_profile, pay_rate | H | ⏳ | n/a (comp-gated) |

## Expense

| Object | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|
| [expense_item](tables/expense_item.md) | A | ✅ | monthly-close |
| [expense_report](tables/expense_report.md) | B | ✅ | expense-approval |
| autotask_expense_report | D | ⏳ | ExpenseReport writer (→ Autotask) |
| expense_reconciliation | F | ⏳ | monthly-close (QBO match) |
| receipt_attachment | B | ⏳ | receipt handling |
| expense_category, qbo_expense_account, mileage_rate | H | ⏳ | n/a (config; rate comp-gated) |

## Security / MSSP

| Object | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|
| [posture_snapshot](tables/posture_snapshot.md) (+pillar) | C (INSERT-only) | ✅ | posture-report |
| [tenant_posture](tables/tenant_posture.md) | E | ✅ | drift-monitor |
| [dns_domain](tables/dns_domain.md) | E | ✅ | DNS drift-monitor |
| posture_policy, *_golden (CA / Intune / Autopilot / device-config / Defender XDR) | E | ⏳ | drift-monitor (autonomy-dialed) |
| account_domain, dns_golden | H / E | ⏳ | golden approval (human-gated) |
| defender_incidents, defender_alerts | B | ⏳ | incident triage |
| defender_incident_ticket_link | D | ⏳ | incident→ticket (ADR-0059) |

## Knowledge (gold)

| Object | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|
| [knowledge_object](tables/knowledge_object.md) | G | ✅ | RAG for all workflows |
| knowledge_embedding | G | ⏳ | (vector pair; Voyage 1024d) |

## Reference / config / identity

| Object | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|
| [app_user](tables/app_user.md) | H | ✅ | n/a (RBAC) |
| [connection](tables/connection.md) | H | ✅ | n/a (sync config) |
| agent, agent_tool_grant, agent_settings | H | ⏳ | n/a (agent config) |
| account_tenant, saved_view | H | ⏳ | n/a |

## Audit / governance

| Object | Archetype | IKF | Acting ICM workflow |
|---|---|---|---|
| audit_log | C | n/a | (the audit substrate) |
| agent_run, agent_message, agent_memory | C / B / G | n/a | orchestrator telemetry |
| board_session (+member/+message/+recommendation) | B | n/a | board deliberation |
| feature_request (+vote/+status_history) | B | n/a | feedback (GitHub-coupled) |

## Bronze source tables (raw, per-source — archetype inputs)

Bronze never gets its own concept file (it is raw, lossless input); each feeds a silver
entity above.

| Feeds | Bronze tables |
|---|---|
| account / contact / device (A) | `{autotask,apollo,itglue,m365,website}_contacts` · `{autotask,apollo,itglue,website}_companies` · `{itglue,m365,website}_devices` |
| opportunity (A) | `kqm_opportunities` (+lines/+sections/+sales_orders) · `autotask_opportunities` · `website_opportunities` |
| contract / ticket (B) | `autotask_contracts` · `docusign_contracts` · `autotask_tickets` |
| time_record (A) | `website_time_entry` · `autotask_time_entry` |
| expense_item (A) | `website_expense_item` · `mileiq_drive` · `qbo_purchases` (match) |
| credential_exposure / assessment_artifact (A/B) | `darkwebid_exposures` · `televy_reports` |
| interaction (B) | `m365_mail_messages` · `m365_teams_chats/_meetings` · `facebook_posts/_comments/_messages` · `instagram_media/_comments` |
| posture / dns (C/E) | `secure_scores` · `defender_incidents/_alerts` · `entra_*` · `intune_*` · `*_golden` · `dns_zones` · `dns_records` · `sharepoint_sites` · `azure_*` · `sentinel_*` |
| social_metric (B) | `meta_insights` |

---

Expansion of remaining ⏳ concepts is tracked in
[#536](https://github.com/markdconnelly/ImperionCRM/issues/536). The staleness CI gate
([#535](https://github.com/markdconnelly/ImperionCRM/issues/535)) is **live**: a PR
changing a silver table with a ✅ concept file must update that file in the same PR
(see [semantic-layer-gate](../../operations/semantic-layer-gate.md)).
