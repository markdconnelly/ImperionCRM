# Imperion OS — cross-repo production-readiness plan

> **You are in: `ImperionCRM` — the CANONICAL copy.** Synced copies live in the three
> sibling repos; update here and re-sync. This repo's section is marked **← this repo**
> below.
>
> **⚠️ Snapshot vintage: 2026-06-10 (the post-build-sprint readiness review).** It is
> kept as the authoritative *operator-unblock* checklist — the remaining go-live work is
> still operator configuration, exactly as listed. **But the build has moved on since:**
> the front end now serves the full CRM + ERP + extras + AI surface (sale→delivery,
> projects/PM parity, time/expense + Monthly Close, collections, CMDB, service desk,
> the connector marketplace), and **migrations `0001–0101` are applied to prod** (the
> "`0001–0058`" below reflects the 2026-06-10 vintage only). For the live module/state
> picture read [CLAUDE.md §6](../../CLAUDE.md) and the
> [capability overview](../product/imperion-os-overview.md); for roadmap
> framing read [product-roadmap-v1-v3](product-roadmap-v1-v3.md).

## TL;DR

**The code backlog is done (2026-06-10).** In one cross-repo sprint, every code item from
the previous plan landed, merged, and deployed — plus the AI Board:

1. **Agent platform user-facing:** the Agents operations page (ADR-0048) and the **AI Board
   of Directors** (schema 0056/ADR-0049 · backend runtime ADR-0039 · the `/board` module)
   are live. The Board was the last placeholder module — **no placeholders remain.**
2. **Per-user OAuth is built end to end** (backend ADR-0038 ↔ web callback route + Settings
   wiring): start → provider consent → token to Key Vault → refresh-on-read → revoke.
   Activation is per-provider operator config (app registrations).
3. **Both pipelines write everything they collect:** cloud webhooks land Autotask tickets
   bronze→silver in near-real-time with hash parity against the bulk loader (pipeline
   ADR-0013); the local module (v0.5.0) has post writers for all granted bronze tables and
   gold composers for **nine** entity types.
4. **Migrations `0001–0058` applied to prod** (verified). Grants follow the code: 0055
   (pipeline writes), 0056 (agent core, backend-writes/web-reads), 0057 (composer reads),
   0058 (project types as data + project/task columns, ADR-0052 — app-owned; no new
   pipeline/backend grants).

What remains is **operator configuration** (§ checklist below) and a short tail of
**deferred builds** (ingestion engines, lead-capture receivers, enrichment endpoints,
Sentinel/KQM/DocuSign collectors, M365 comms bronze tables).

## The four planes (status snapshot)

| Repo | Role | State (2026-06-10) |
| --- | --- | --- |
| **`ImperionCRM`** (front-end) ← *this repo* | GUI; direct DB reads; **owns DB schema + migrations** | Live. Migrations `0001–0058` applied. Agents page (ADR-0048), Board module (ADR-0049), **project board** (ADR-0052 #95), OAuth UI + callback route, saved views, device inventory all real. |
| **`ImperionCRM_Backend`** | ALL processes: agent runtime, OAuth, sends, credentials, semantic search | Claude tool-use orchestrator (ADR-0036) + tier presets/budget (ADR-0037) + per-user OAuth (ADR-0038) + **Board runtime** (ADR-0039) deployed. Sends gated on consent; SMS awaits ACS config. |
| **`ImperionCRM_Pipeline`** (cloud) | Live data: webhooks, bronze→silver merge, on-demand refresh | Webhook payload handlers **implemented** (ADR-0013): Autotask tickets land + merge inline; Graph notifications trigger GDAP-fail-closed targeted refresh. Merge covers contacts/accounts/devices/contracts/tickets/exposures/assessments. |
| **`ImperionCRM_LocalPipelineEnrichment`** (on-prem) | Heavy lifting: bulk ingestion + **bronze→silver merge for the sources it ingests** + **all** vectorization | **Updated 2026-06-19 (sync from LocalPipeline #254):** release **0.12.0**, **~190 exported cmdlets** (lever-A surface-shrink privatizing internals, LocalPipeline ADR-0027/#226), **~200 hermetic Pester test files**, 0 ScriptAnalyzer findings. Now **owns the bronze→silver merge for the sources it bulk-ingests** (LocalPipeline ADR-0026, "merge co-locates with ingestion" — posture/Meta/DNS + M365 directory groups #239 + Azure ARM `cloud_asset` #241, wired into `Register-ImperionTask` #243); the cloud `ImperionCRM_Pipeline` keeps **only** the live/webhook-driven merge (it ceded `cloud_asset` in Pipeline #135; the M365-directory cede in Pipeline #134 is held until the LP entra-group collectors fill `m365_groups`/`m365_group_members` bronze in prod). **Voyage vectorization live in prod.** _(2026-06-10 vintage: module v0.5.0, nine composers, 279 hermetic tests.)_ |

## Operator checklist (the remaining unblocks, in order of payoff)

1. **Voyage key** — replace the placeholder in Key Vault `Voyage-Embedding-API-Key`, then
   `Invoke-ImperionKnowledgeSync -Vectorize` (module v0.5.0 staged; grants 0056/0057 live).
   → semantic search + agent retrieval go live over the full gold layer.
2. **Knowledge re-sync** — `Invoke-ImperionKnowledgeSync` (interim mode) to add the five
   new entity types to gold (devices, proposals, exposures, assessments, posture).
3. **Per-user OAuth providers** — per backend ADR-0038: `OAUTH_REDIRECT_BASE_URL`
   (`https://imperioncrm.azurewebsites.net/api/connections`), per-provider app
   registrations + `OAUTH_<P>_CLIENT_ID` / `OAUTH_<P>_CLIENT_SECRET_SECRET`, and the
   backend MI's **Key Vault Secrets Officer** role (token + state secret writes).
4. **ACS connection string** → Key Vault (`ACS_CONNECTION_SECRET`) for live SMS sends.
5. **GDAP partner app** registration (Partner Center) → un-501s the GDAP consent flow.
6. **Pipeline app setting `PARTNER_TENANT_ID`** — the ticket webhook answers 503 until set.
7. **Secret rotation before go-live** — follow the new
   [secrets-rotation runbook](../operations/secrets-rotation-runbook.md).
8. **On-prem host provisioning** — service identity + machine cert + SecretStore
   (`docs/deployment/unattended-bringup.md` in the local repo); ends interim mode.

## Per-repo change lists

### `ImperionCRM` (front-end) ← *this repo*
- [x] ~~Apply legacy-vector-drop + 0047–0057~~ — all applied and verified in prod.
- [x] ~~Un-stub the AI Agents / Board pages~~ — both real (ADR-0048, ADR-0049).
- [x] ~~OAuth connect/disconnect + callback route~~ — wired to backend ADR-0038.
- [ ] **Rotate the deferred secrets** before go-live — runbook now exists (operator).
- [ ] Ongoing: move remaining *processing* server actions behind backend APIs as they
      gain real processing (sends UI → approval queue; campaign launches).

### `ImperionCRM_Backend`
- [x] ~~Real Claude tool-use orchestrator loop~~ (ADR-0036) + presets/budget (ADR-0037).
- [x] ~~Per-user OAuth flows~~ (ADR-0038) — token custody in Key Vault, refresh-on-read.
- [x] ~~AI Board runtime~~ (ADR-0039) — convene → 2-round deliberation → synthesis,
      budget-gated, fully audited (`agent_run` + `board_*`).
- [ ] **Operator:** OAuth provider registrations · KV Secrets Officer for the MI · ACS
      connection string · GDAP partner app (§ checklist 3–5).
- [ ] **Deferred builds:** ingestion engines (Graph email/Teams, Plaud, social) ·
      lead-capture receivers · LLM enrichment endpoints (`contact_enrichment`,
      pre-discovery draft answers).

### `ImperionCRM_Pipeline` (cloud)
- [x] ~~merge-sources for contracts/tickets/exposures/assessments~~ (+ on-demand merge).
- [x] ~~Webhook payload handlers~~ (ADR-0013) — Autotask tickets inline land+merge with
      bulk-loader hash parity; Graph notifications → GDAP-checked targeted refresh.
- [ ] **Operator:** set `PARTNER_TENANT_ID`; verify live Autotask payload shapes + hash
      parity on the first real ticket (watch the bulk reconcile's `unchanged` tally).
- [ ] **Build:** Graph **subscription creation/renewal timer** (notifications can't flow
      until subscriptions exist). Security-posture stays out of cloud merge — it reaches
      the agent via the local posture composer (gold), by design.

### `ImperionCRM_LocalPipelineEnrichment` (on-prem)
> **Updated 2026-06-19 (sync from LocalPipeline #254):** the LP build tail is **done** —
> what remains is operator (credential/migration) gating, not missing code. All issue/ADR
> numbers below prefixed *LocalPipeline*/*Pipeline* are that sibling repo's.
- [x] ~~Vectorization stage~~ (LocalPipeline ADR-0009) · ~~bronze post fan-out~~ ·
      ~~knowledge composers~~ — and now shipped + merged in LP:
      ~~Sentinel collector~~ (LocalPipeline #97) · ~~KQM collector (header + won-quote
      detail)~~ (LocalPipeline #98/#160/#161) · ~~DocuSign collector~~ (LocalPipeline #99) ·
      ~~M365 mail/Teams post writers~~ (LocalPipeline #100) · ~~PR CI gate~~ (LocalPipeline
      #103) · ~~release-please~~ (LocalPipeline #104) · ~~bronze-writer factory~~
      (LocalPipeline #105) · ~~knowledge-composer framework~~ (LocalPipeline #106) ·
      ~~Voyage key + vectorization live in prod~~.
- [x] ~~Owns the bronze→silver merge for the sources it bulk-ingests~~ (LocalPipeline
      ADR-0026 — posture/Meta/DNS + M365 directory groups #239 + Azure ARM `cloud_asset`
      #241, wired into `Register-ImperionTask` #243).
- [ ] **Operator (remaining):** gold re-sync + full vectorization (LocalPipeline #101 —
      gated on a front-end grant migration); on-prem host provisioning / retire
      `-SkipSecretStore` (LocalPipeline #102 — LP now has a DPAPI-unlock fallback,
      LocalPipeline #223, for hosts whose cert lacks the CMS Document-Encryption EKU).

## Recommended sequence

1. **Checklist 1–2** (Voyage key + re-sync) → *the agent reasons over the full estate.*
2. **Checklist 3** (one OAuth provider — start with m365) → *personal connections live.*
3. **Checklist 4–6** → *SMS, GDAP consent, real-time tickets.*
4. **Checklist 7–8** (rotation + host) → *go-live posture; unattended schedule takes over.*
5. Then the deferred builds, highest-value first: Graph subscription timer → ingestion
   engines → enrichment endpoints → remaining collectors.

## Verified live in prod (2026-06-10)

- Migrations `0001–0058`; agent core + board tables with 5 seeded personas; saved views;
  device inventory; agent settings singleton; project_type table (onboarding seeded
  protected) + project/task columns (ADR-0052, applied + idempotency re-run 2026-06-10).
- Deploy pipelines green on all three Azure repos (web app + 2 Function Apps, OIDC).
- Gold layer: 205 knowledge objects (4 entity types) — composers for 9 ready to re-sync.
- 8 PRs merged this sprint: front-end #76/#77/#78(+#79)/#80/#81/#82 · backend #15/#16 ·
  pipeline #16 · local #68/#69.

## References

- **Settled decisions:** backend ADR-0034 (Claude+Voyage) · backend ADR-0035 (identity
  perimeter) · ADR-0042 (division of labor) · ADR-0043 (settled AI stack).
- **This sprint's ADRs:** front-end ADR-0048 (Agents page), ADR-0049 (agent core + Board
  schema) · backend ADR-0038 (per-user OAuth), ADR-0039 (Board runtime) · pipeline
  ADR-0013 (webhook inline landing) · local ADR-0009 (vectorization, pre-existing).
- **Runbooks:** [secrets rotation](../operations/secrets-rotation-runbook.md) ·
  local `docs/deployment/unattended-bringup.md` (host) ·
  [credential wiring](../operations/credential-wiring-next-steps.md).
