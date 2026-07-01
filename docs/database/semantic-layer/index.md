---
type: OKF Bundle
title: Silver semantic layer
description: Curated business meaning, join paths, and source-of-record rules for the silver tier — human- and agent-readable, version-controlled, PII-free.
resource: ../../decision-records/ADR-0086-okf-semantic-layer-over-silver.md
tags: [silver, semantic-layer, okf, data-model]
timestamp: 2026-07-01T00:00:00Z
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

**125 concept files authored** (the [`tables/`](tables/) directory; this table lists the
core subset). Remaining objects from the
[coverage matrix](coverage-matrix.md) are tracked for expansion under
[#536](https://github.com/markdconnelly/ImperionCRM/issues/536).

| Concept | Archetype | Authoritative source | Governing ADR |
|---|---|---|---|
| [`account`](tables/account.md) | merge | website > autotask > itglue > apollo | ADR-0039 |
| [`contact`](tables/contact.md) | merge | website > autotask > itglue > m365 > apollo | ADR-0039 |
| [`contact_social_identity`](tables/contact_social_identity.md) | single-SoR | app-native (social/enrichment connectors; per contact+platform) | ADR-0025 |
| [`contact_enrichment`](tables/contact_enrichment.md) | single-SoR (EAV) | app-native per-fact dossier (each fact self-attributes source + lawful basis) | ADR-0025 |
| [`device`](tables/device.md) | merge | website > itglue > m365 | ADR-0039 |
| [`cloud_asset`](tables/cloud_asset.md) | merge | cloud provider (read-only; Azure ARM first, on-prem LP merge) | ADR-0097 |
| [`software_ci`](tables/software_ci.md) | merge | Intune managed-apps (read-only; device-resolved; on-prem LP merge) | ADR-0097 |
| [`opportunity`](tables/opportunity.md) | merge | website > autotask > KQM | ADR-0080 |
| [`contract_renewal`](tables/contract_renewal.md) | single-SoR (app-native satellite) | Imperion app (opportunity merge never writes it) | ADR-0130 |
| [`quota`](tables/quota.md) | single-SoR | website system of record | ADR-0072 |
| [`forecast_snapshot`](tables/forecast_snapshot.md) | derived ledger | website (nightly snapshot job) | ADR-0072 |
| [`price_book_entry`](tables/price_book_entry.md) | single-SoR | website system of record (versioned rate-card line; publish always-gate) | ADR-0136 |
| [`discount_tier`](tables/discount_tier.md) | single-SoR | website system of record (versioned approval threshold; publish always-gate) | ADR-0136 |
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
| [`project_milestone`](tables/project_milestone.md) | single-SoR | website system of record (status + orthogonal RAG health) | ADR-0020 |
| [`delivery_template_phase`](tables/delivery_template_phase.md) | single-SoR | website system of record (delivery_template child; → milestone) | ADR-0081 |
| [`delivery_template_task`](tables/delivery_template_task.md) | single-SoR | website system of record (phase child; → task; declares JIT ticket) | ADR-0081 |
| [`onboarding_step`](tables/onboarding_step.md) | single-SoR | website system of record (idempotent per project+code; deploy/verify hooks) | ADR-0037 |
| [`meeting_action_item`](tables/meeting_action_item.md) | single-SoR | website system of record (anchored to meeting interaction; → task) | ADR-0011 |
| [`project_type`](tables/project_type.md) | reference / config | website system of record (user-creatable project category) | ADR-0052 |
| [`discovery_call`](tables/discovery_call.md) | single-SoR | website system of record | ADR-0023 |
| [`strategic_business_review`](tables/strategic_business_review.md) | single-SoR | website system of record | ADR-0022 |
| [`sbr_dimension_score`](tables/sbr_dimension_score.md) | single-SoR (SBR child) | website (per-dimension re-score; trend vs benchmark) | ADR-0022 |
| [`sbr_ticket`](tables/sbr_ticket.md) | single-SoR (SBR↔ticket bridge) | website (references ticket history, never copies) | ADR-0022 |
| [`client_offboarding`](tables/client_offboarding.md) | single-SoR | app-native (backend offboarding executor; retention/legal-hold clock dial-proof) | ADR-0086 (#1622) |
| [`client_offboarding_step`](tables/client_offboarding_step.md) | single-SoR (offboarding child) | app-native (idempotent per offboarding+code; close-on-verification) | ADR-0086 (#1622) |
| [`ticket`](tables/ticket.md) | single-SoR | Autotask (external SoR) | ADR-0044 |
| [`chat_session`](tables/chat_session.md) | single-SoR | website (backend chat process; native pre-ticket) | ADR-0074 |
| [`ci_relationship`](tables/ci_relationship.md) | write-back sidecar (app-native CMDB) | app-native derivation (IT Glue write-back gated) | ADR-0078/0097 |
| [`cmdb_ci_overlay`](tables/cmdb_ci_overlay.md) | write-back sidecar (app-native CMDB) | app-native per-CI criticality (effective = override ?? derived_default) | ADR-0078/0097 |
| [`change_request`](tables/change_request.md) | write-back sidecar (app-native ITIL) | app-native change working object (Autotask eventual record SoR, gated) | ADR-0079 |
| [`contract`](tables/contract.md) | single-SoR | Autotask (external SoR) | ADR-0044 |
| [`carrier_contract`](tables/carrier_contract.md) | single-SoR | app-native curated (source+external_ref ready for a carrier ingest) | ADR-0136 (B9 sentinel) |
| [`circuit`](tables/circuit.md) | single-SoR | app-native curated (source+external_ref ready for a carrier ingest) | ADR-0136 (B2 gated-actuation) |
| [`interaction`](tables/interaction.md) | single-SoR | per-source / per-channel | ADR-0011 |
| [`client_communication`](tables/client_communication.md) | single-SoR (filtered own-tenant merge) | Imperion home tenant, scoped to DB clients (account_domain + onboarded contacts) | ADR-0126 |
| [`meeting`](tables/meeting.md) | single-SoR | per-platform (1:1 with interaction) | ADR-0011 |
| [`conversation`](tables/conversation.md) | single-SoR (+ gold) | app SoR; source supplies the capture (ACS/Teams/upload) | ADR-0068 |
| [`conversation_segment`](tables/conversation_segment.md) | single-SoR (embedding unit) | app-native (diarized from transcript; the embed/citation unit) | ADR-0068 |
| [`conversation_insight`](tables/conversation_insight.md) | gold (AI output) | backend Claude analyze stage (per-finding; not vectorized) | ADR-0068 |
| [`memory_enrichment`](tables/memory_enrichment.md) | single-SoR (app-native) | backend Haiku extraction over memory_drawer verbatim (type/topics/people/action-items) | ADR-0113 |
| [`campaign`](tables/campaign.md) | single-SoR | website system of record | ADR-0053 |
| [`workflow`](tables/workflow.md) | single-SoR | website system of record | ADR-0027 |
| [`lead_score`](tables/lead_score.md) | derived ledger | website (backend/LP scoring pass) | ADR-0073 |
| [`segment`](tables/segment.md) | single-SoR (app-native) | website system of record | ADR-0073 |
| [`ad`](tables/ad.md) | single-SoR | website system of record (creative; platform-linked) | ADR-0053 |
| [`campaign_metric`](tables/campaign_metric.md) | single-SoR (platform mirror) | ad platform authoritative for values; daily grain | ADR-0053 |
| [`campaign_send`](tables/campaign_send.md) | single-SoR | website system of record (scheduled/event send; consent-gated) | ADR-0053 |
| [`audience`](tables/audience.md) | single-SoR (app-native) | website system of record (paid-media set; syncs OUT; consent-gated) | ADR-0026 |
| [`audience_member`](tables/audience_member.md) | single-SoR (app-native) | website system of record (idempotent composite PK; consent-gated) | ADR-0026 |
| [`event`](tables/event.md) | single-SoR | website system of record (webinar/live event; registration page) | ADR-0053 |
| [`event_registration`](tables/event_registration.md) | single-SoR | website system of record (registrant + attendance) | ADR-0053 |
| [`lead_hook`](tables/lead_hook.md) | single-SoR | website system of record (lead-capture endpoint definition) | ADR-0024 |
| [`lead_capture_event`](tables/lead_capture_event.md) | single-SoR | website system of record (raw inbound hit → contact resolution) | ADR-0024 |
| [`social_metric`](tables/social_metric.md) | single-SoR (platform mirror) | platform authoritative for values; from `meta_insights` | ADR-0062 |
| [`content_asset`](tables/content_asset.md) | single-SoR (app-native) | Imperion app SoT; publish = handoff to Loveable (`publish_ref`) | #1696 |
| [`reference`](tables/reference.md) | single-SoR (app-native) | Imperion app; the recorded consent is authoritative (consent-gated) | #1696 |
| [`brand_asset`](tables/brand_asset.md) | single-SoR (human-curated) | human-owned, agent read-only (D5) | #1696 |
| [`social_post`](tables/social_post.md) | single-SoR | website system of record (compose-once organic composition) | ADR-0124 |
| [`social_post_channel`](tables/social_post_channel.md) | single-SoR | website system of record (per-network fan-out result) | ADR-0124 |
| [`social_engagement`](tables/social_engagement.md) | single-SoR | website system of record for triage; platform source of content | ADR-0124 |
| [`commission_plan`](tables/commission_plan.md) | single-SoR (app-native, human-curated) | website comp-admin surface; agents read-only | #1650 |
| [`commission_attainment`](tables/commission_attainment.md) | single-SoR (backend-computed) | backend compute from `opportunity`/`quota`; as-of persisted | #1650 |
| [`commission_statement`](tables/commission_statement.md) | single-SoR (backend-computed, human-gated) | compute auto, payout always_gate; paid = external payroll/QBO record | #1650 |
| [`timesheet`](tables/timesheet.md) | single-SoR | website system of record | ADR-0082 |
| [`expense_report`](tables/expense_report.md) | single-SoR | website system of record | ADR-0083 |
| [`time_record`](tables/time_record.md) | merge | website attendance (Autotask corroborates) | ADR-0082 |
| [`employee_profile`](tables/employee_profile.md) | reference (HR core + pay_rate comp) | website app-native; external ids are email-resolved mappings | ADR-0082 |
| [`payroll_run`](tables/payroll_run.md) | single-SoR (mirror) | payroll provider (QBO Payroll / ADP-class, read-only external SoR) | ADR-0082/0123 |
| [`pay_statement`](tables/pay_statement.md) | single-SoR (mirror) | payroll provider (read-only; A9b key = run + employee) | ADR-0082/0123 |
| [`expense_item`](tables/expense_item.md) | merge | website out-of-pocket / MileIQ miles | ADR-0083 |
| [`invoice`](tables/invoice.md) | single-SoR (mirror) | QuickBooks Online (read-only external SoR) | ADR-0085 |
| [`collections_activity`](tables/collections_activity.md) | overlay (write-back sidecar, app-native) | website system of record (dunning state; NOT synced to QBO) | ADR-0085/0087 |
| [`performance_obligation`](tables/performance_obligation.md) | single-SoR (app-native) | website system of record (ASC 606 working papers — OWN; QBO has no rev-rec object; QBO stays posted-books SoR) | #1619 |
| [`revenue_schedule`](tables/revenue_schedule.md) | single-SoR (app-native) | website system of record (recognition = human always_gate; `qbo_journal_ref` ties out to QBO) | #1619 |
| [`consent_event`](tables/consent_event.md) | ledger | append-only; current_consent is the gate | ADR-0014 |
| [`posture_snapshot`](tables/posture_snapshot.md) | ledger | append-only; grade at capture | ADR-0051 |
| [`security_standard_version`](tables/security_standard_version.md) | reference (versioned standard) | Imperion-native; Mark-gated ratification; current = highest ratified | #1715 / BE #439 |
| [`posture_score`](tables/posture_score.md) | ledger | append-only verdict per (account, standard version, snapshot); idempotent re-score | #1715 / BE #439 / LP #399 |
| [`tenant_posture`](tables/tenant_posture.md) | golden/drift | observed vs human-approved golden | ADR-0051 |
| [`posture_policy`](tables/posture_policy.md) | golden/drift | per-policy verdict; 5-family observed vs *_golden | ADR-0051 |
| [`account_domain`](tables/account_domain.md) | reference (registry) | operator-curated + entra-derived; DNS worklist + client-comms filter substrate | ADR-0063/0126 |
| [`dns_domain`](tables/dns_domain.md) | golden/drift | account_domain SoR; dns_golden approved | ADR-0063 |
| [`dns_golden`](tables/dns_golden.md) | golden/drift | operator approval (Set-ImperionDnsGoldenState) | ADR-0063 |
| [`knowledge_object`](tables/knowledge_object.md) | gold | on-prem produced; Voyage 1024d | ADR-0041 |
| [`app_user`](tables/app_user.md) | reference | Entra ID identity | ADR-0016 |
| [`connection`](tables/connection.md) | reference | sync config; tokens in Key Vault (by ref) | ADR-0024 |
| [`source_skill`](tables/source_skill.md) | reference (tool-routing) | website (per-provider sanctioned fetch/validate skill) | ADR-0104 |
| [`agent_autopilot_policy`](tables/agent_autopilot_policy.md) | control/config (app-native) | website (autonomy dial; agents read their rung) | ADR-0087 |
| [`agent_tool_grant`](tables/agent_tool_grant.md) | reference (tool-routing) | website (per-agent tool allow-list; ADR-0104 points here) | ADR-0087 |
| [`metric_definition`](tables/metric_definition.md) | control/config (headless-BI) | website (governed metric definitions; agents & dashboards share) | ADR-0062 |
| [`entity_xref`](tables/entity_xref.md) | reference (identity spine) | resolver/merges (every source id → one internal entity) | ADR-0039 |
| [`external_identity`](tables/external_identity.md) | reference (identity) | app-native account/contact ↔ provider link | ADR-0024 |
| [`project_provisioning`](tables/project_provisioning.md) | write-back sidecar | front end requests; backend executor writes (DocuSign-gated) | ADR-0080 |
| [`task_ticket_fire`](tables/task_ticket_fire.md) | write-back sidecar | front end requests; backend executor fires (JIT) | ADR-0080 |
| [`time_ticket`](tables/time_ticket.md) | write-back sidecar | front end requests; backend executor writes (idempotent weekly) | ADR-0082 |
| [`autotask_expense_report`](tables/autotask_expense_report.md) | write-back sidecar | front end requests; backend executor writes (idempotent monthly) | ADR-0083 |
| [`expense_reconciliation`](tables/expense_reconciliation.md) | reconciliation | backend verdict: approved reimbursable total vs QuickBooks bill-payment (read-only) | ADR-0083 |
| [`receipt_attachment`](tables/receipt_attachment.md) | single-SoR (Autotask custody) | app-native ref; Autotask is the durable store once verified | ADR-0083 |
| [`expense_category`](tables/expense_category.md) | reference / config | QuickBooks chart of accounts (category SoR; hard-linked) | ADR-0083 |
| [`mileage_rate`](tables/mileage_rate.md) | reference / config (comp) | website (system-wide effective-dated rate; backend sole reader) | ADR-0083 |
| [`defender_incident_ticket_link`](tables/defender_incident_ticket_link.md) | write-back sidecar | PK = sync-back idempotency key (one ticket per incident) | ADR-0059 |

Enrichment-agent sync and vectorization of this bundle are tracked as follow-ups
(LocalPipelineEnrichment #175 / #176).
