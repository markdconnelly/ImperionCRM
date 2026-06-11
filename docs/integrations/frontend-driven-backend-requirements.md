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

## 2. Connection OAuth + token storage (ADR-0024/0035) — ✅ per-user flows implemented

- ✅ **Per-user flows (backend ADR-0038 + front-end wiring, 2026-06-09):**
  authorization-code flows for M365, Google, YouTube, LinkedIn, Facebook
  (`/connections/{provider}/{start,callback,disconnect}`); tokens custodied in **Key
  Vault** with refresh-on-read; `connection.keyvault_secret_ref` only in the DB. Plaud
  is key-based (no public OAuth) → company credential store when its engine lands.
  Remaining: per-provider app registrations + backend app settings
  (`../operations/credential-wiring-next-steps.md` §4b).
- Company providers (Autotask, IT Glue, **Apollo**) use the credential store (ADR-0036).
- Background refresh + `connection.status` reconciliation (refresh-on-read covers the
  read path — backend ADR-0038; a proactive timer is future work).

## 3. Ingestion engines → bronze (ADR-0032) — ✅ implemented (pipeline)

Write raw source rows into the per-source bronze tables, then run the merge job. **Done in
`ImperionCRM_Pipeline`:** per-source poll/sync lands bronze; the `merge-sources` sweep builds
the unified silver record (pipeline ADR-0006).

Per ADR-0039 each source lands in its **own physical bronze table** (`<source>_<entity>`),
read back through the union views `contact_bronze_all` / `account_bronze_all` / `device_bronze_all`.

| Source | Lands in | Notes |
| --- | --- | --- |
| Apollo (contacts + companies) | `apollo_contacts`, `apollo_companies` | global enrichment; match by email / company domain |
| M365 / Graph (contacts) | `m365_contacts` | from per-user + org Graph (`m365_synced` key) |
| Autotask (contacts, companies) | `autotask_contacts`, `autotask_companies` | also tickets (local-pipeline) |
| IT Glue (contacts, companies, devices) | `itglue_contacts`, `itglue_companies`, `itglue_devices` | poll, never duplicate |
| Manual (in-app) | `website_contacts`, `website_companies` | the in-app form is the source of record (`website`, replaces `imperion_crm_entered`); a save also fires a fire-and-forget `POST /api/refresh {source:"merge"}` (`requestMergeRefresh`, issue #89) so the silver record updates immediately instead of on the 5-minute sweep |
| Dark Web ID (exposures) | `darkwebid_exposures` → silver `credential_exposure` | compromised credentials (ADR-0040); match by email/domain |
| Televy (assessment reports) | `televy_reports` → `assessment_artifact` | assessment scorecards (ADR-0040) |

- **Normalization / merge job (silver):** ✅ `merge-sources` projects `normalized_silver`,
  matches each `*_source` row to a silver `contact`/`account` (domain/email), upserts, and
  stamps `matched_at` / `match_confidence`. Survivorship = field precedence
  `imperion > autotask > itglue > m365 > apollo` (pipeline ADR-0006).
- **Account-scoped posture refresh (ADR-0051 §2, pipeline ADR-0015):** ✅ the account
  detail page's **Refresh posture** button (#155, shown only when the account has a
  Tenant Mapping) awaits `POST /api/refresh {source:"posture", accountId}` — the cloud
  pipeline re-classifies that account's mapped Customer Tenants into
  `posture_policy`/`tenant_posture` and the page revalidates after it lands. Bulk
  posture merges (all tenants, scheduled) belong to the on-prem pipeline.
- **Posture overview page (#93):** ✅ `/accounts/{id}/posture` renders the account's
  mapped tenants' `tenant_posture` rollups, the `posture_policy` classification
  drill-down (vs Golden State), the bronze secure-score control profiles, and the
  account's `credential_exposure` rows — all via the account-scoped reads documented
  in `../database/data-model.md`. Unmapped → points at Settings → Tenant mapping;
  mapped-but-unclassified → points at Refresh posture (reused on this page).
- **Company at-a-glance posture (#94):** ✅ the Company 360 shows the **Imperion Secure
  Score** (Score Model v1: m365_secure_score · policy_compliance · darkweb, equal
  weight — `src/lib/security/imperion-score.ts`, the same math the snapshot job must
  reproduce) computed live from the mapped tenants' rollups; uncovered pillars render
  "No coverage" (grey), score 0, never green (ADR-0051 §4). The per-DEVICE indicator is
  deliberately absent until the Intune managedDevices feed lands (#162, ADR-0051 §6).
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
