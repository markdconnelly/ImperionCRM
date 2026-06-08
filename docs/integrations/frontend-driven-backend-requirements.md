# Front-end-driven back-end & pipeline requirements

This repo is the **source of truth for the schema** (ADR-0017/0028). The front-end work
in ADR-0030–0035 created GUI and tables that *expect* back-end engines which are
deliberately deferred. This document tracks what the **`ImperionCRM_Backend`** repo
(Azure Functions on the shared App Service Plan, network-isolated — ADR-0028) must
build, and the data-tiering pipelines those engines feed.

The front end drives these requirements: every item below exists because a screen or a
schema object in this repo already references it.

> **Status (v1 data loop — 2026-06-08).** The credential save path (§2) and the
> contact/company **ingestion → bronze → unified-silver merge** (§3) are **implemented**
> for Autotask, IT Glue, Apollo (people), and M365-via-GDAP — pipeline PR #4 (ADR-0006
> merge, ADR-0007 GDAP), backend PR #7 (GDAP consent state), frontend PR #47 (the unified
> record's **Data sources** popup). Apollo **company** enrichment, comms ingestion (§4),
> assessment evidence (§6), onboarding auto-rules (§7), and the agent runtime (§8) remain
> deferred. RBAC (§1) is an Entra-config task.

## 1. Identity / RBAC claim (ADR-0030)

- **Entra app-registration change (infra, not code):** emit the role signal so
  `lib/auth/claims.ts` can map it. Either set manifest
  `groupMembershipClaims: "SecurityGroup"` (emits `groups` GUIDs → populate
  `ENTRA_GROUP_ADMINS|FINANCE|PROJECTMANAGER|SALES|SUPPORT`) **or** (recommended) define
  five **App Roles** and assign the five security groups to them (stable `roles` strings,
  immune to the >200-group overage).
- Until this lands, every user defaults to `support`. Land it **before** go-live.

## 2. Connection OAuth + token storage (ADR-0024/0035)

- Live OAuth flows for the per-user providers (M365, LinkedIn, Plaud, Google, YouTube,
  Facebook) and the company providers (Autotask, IT Glue, **Apollo**). Tokens to **Key
  Vault**; `connection.keyvault_secret_ref` only in the DB.
- Background refresh + `connection.status` reconciliation.

## 3. Ingestion engines → bronze (ADR-0032) — ✅ implemented (pipeline)

Write raw source rows into the per-source bronze tables, then run the merge job. **Done in
`ImperionCRM_Pipeline`:** per-source poll/sync lands bronze; the `merge-sources` sweep builds
the unified silver record (pipeline ADR-0006).

| Source | Lands in | Notes |
| --- | --- | --- |
| Apollo (contacts + companies) | `contact_source`, `account_source` | global enrichment; match by email / company domain |
| M365 / Graph (contacts) | `contact_source` (`m365_synced`) | from per-user + org Graph |
| Autotask (contacts, companies) | `contact_source`, `account_source` | also tickets (existing) |
| IT Glue (contacts, companies) | `contact_source`, `account_source` | poll, never duplicate |
| Imperion CRM entry | `*_source` (`imperion_crm_entered`) | the in-app form is the source of record |

- **Normalization / merge job (silver):** ✅ `merge-sources` projects `normalized_silver`,
  matches each `*_source` row to a silver `contact`/`account` (domain/email), upserts, and
  stamps `matched_at` / `match_confidence`. Survivorship = field precedence
  `imperion > autotask > itglue > m365 > apollo` (pipeline ADR-0006).
- **Gold:** summaries + embeddings over merged records — still deferred (next phase).

## 4. Communications ingestion (ADR-0011)

- M365 email/Teams → `interaction` rows; **Teams meetings** → `interaction` (kind
  `meeting`) + a `meeting` row (Copilot recap, transcript ref). **Plaud** recaps/
  summaries → `meeting` rows. Email-from-365 stays plain `interaction` rows.
- Populate `meeting.payload_bronze/normalized_silver/summary_gold` and link
  `meeting_action_item`s. The Contact 360, Company 360, and the communications
  drill-down already render these.

## 5. Enrichment pipeline (ADR-0035) — explicitly a later priority

- Lead capture → **create a company (`account`) object** → enrich both the lead/contact
  and the company via **Apollo**. Save the data-pipeline connections for contact and
  company enrichment as a later priority (per product direction).

## 6. Assessment evidence + 365 permission flow (ADR-0033)

- **Televy ingestion** into `assessment_artifact` (bronze→silver→gold).
- The **1:1 tenant-wide read-all** enterprise app (consent-prompted, time-boxed) and its
  **revoke + transition to GDAP** at onboarding. Runbooks for grant/revoke/handover.

## 7. Onboarding auto-completion rules (ADR-0034)

- A rules engine that flips `project_milestone.health` from observed system state
  (`auto_check_key`), e.g. from Graph/Autotask/IT Glue signals. Health is manual today.
- Standard onboarding milestone templates per playbook.

## 8. Agent / LLM execution

- Agent answer drafting (ADR-0027), enrichment reasoning, embeddings generation, and the
  orchestrator runtime + AI Agents/Board pages remain back-end/deferred (ADR-0015/0018).

## Pipeline summary (bronze → silver → gold)

```
sources ──► *_source / interaction / meeting / assessment_artifact   (bronze: raw)
              │ normalize + match (deferred merge job)
              ▼
           contact / account / interaction(silver) / engagement_answer (silver)
              │ summarize + embed
              ▼
           summary_gold + embeddings                                  (gold: agent-ready)
```

§3 (ingestion + merge) is **implemented** in the pipeline; §4, §6, §7, and §8 remain
**deferred engines** with the schema and GUI in this repo ready for them. Propose any schema
change **here** (this repo owns migrations); the back-end is a consumer (ADR-0028).
