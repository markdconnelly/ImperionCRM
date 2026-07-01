# Current state — Imperion OS (frontend repo)

> **What this is.** The dated, volatile inventory of *what is actually shipped* — the
> detail the meta-policy (`CLAUDE.md` §4) keeps **out** of `CLAUDE.md` so the contract
> there stays short and stable. `CLAUDE.md` §6 carries the one-paragraph summary and
> points here. The **why / what we are building** narrative lives in
> [`docs/product/imperion-os-overview.md`](product/imperion-os-overview.md);
> the durable decisions live in [`docs/decision-records/`](decision-records/README.md).
> The authoritative cross-session record is GitHub issues/PRs + the ADRs — this file is
> a navigable index over them, not a replacement.

**Last refreshed:** 2026-06-30 · **Product name:** **Imperion OS** — the agentic operating system
for an MSP (ADR-0110; identity names `ImperionCRM*` frozen per ADR-0016) · **Milestone:**
pre-`v1.0.0` (build complete; go-live is now an operator/credential problem, not a code problem) ·
**Schema:** migrations **0001–0244 applied to prod** (`0245` `agent_run.parent_run_id` authored,
prod-apply pending — Mark-gated) · **ADRs:** through **0140** · **OKF bundle:** **110** concept files.
· **Public docs:** the canonical [deep-dive set](architecture/deep-dives/README.md)
+ two unauthenticated [papers](../public/papers/executive-summary.html) shipped (epic #1178).

---

## 1. Headline

The app is **built, deployed, and live** on Azure App Service
(`imperioncrm.azurewebsites.net`, Entra SSO). Every UI module listed in `CLAUDE.md` §6 is
real and serving data. The board's own verdict (2026-06-17) is that the *build* is done;
reaching `v1.0.0` (first real employee use, target ≈ 2026-07-01) is an **operator**
problem — wiring credentials, hydrating the on-prem collectors, and a UX sign-off — not a
feature-build problem. Most flows that look "deferred" are **deploy-dormant**, not broken:
they light up the moment their source credential lands and the collectors hydrate bronze.

The positioning is now explicit: Imperion OS is an **operating system for AI agents over the
company's knowledge and actions** — medallion kernel + OKF grounding cortex + gold/Voyage
long-term memory + the two-axis RLS access spine, with the backend orchestrator/ICM/autonomy-dial
as scheduler and the governed action planes as protected mode. The canonical argument is
[`docs/architecture/data-design-for-agents.md`](architecture/data-design-for-agents.md) (ADR-0110).

---

## 2. Shipped capability inventory (by domain)

Each row is live in the app unless flagged. Routes and governing ADRs are in the
[capability overview](product/imperion-os-overview.md); this is the
done/▶-in-flight ledger.

### CRM
- ✅ Leads + capture hooks + lead inbox + lead scoring (`lead_score`).
- ✅ Contacts + Contact-360 (dossier, unified communications timeline, per-contact consent, composer).
- ✅ Accounts; interactive Pipeline (drag deals between stages).
- ✅ **Client mapping / entity resolution** ([#1141](https://github.com/markdconnelly/ImperionCRM/issues/1141), migrations 0160/0165): `entity_xref` + `account_domain` cross-source identity spine (22 xref rows live in prod); `account_tenant` folded into `entity_xref`.
- ✅ **Data-plane integrity spine** (epic [#1049](https://github.com/markdconnelly/ImperionCRM/issues/1049), migrations 0190/0191/0194, placeholder #s): `entity_resolve()` forward resolver + `external_identity` backfill (#1111/0190); **bitemporal** `entity_xref` — valid-time + system-time, live-row predicate (#1112/0191); **DQ autonomy gate** — `dq_sla` freshness+completeness SLA per `data_class` + fail-closed `entity_dq_gate()` routing stale/incomplete records to the cockpit (#1113/0194). Deploy-dormant (spine empty in prod). Completes epic #1049.
- ✅ Campaigns + audiences/ads + builders; Journeys (single-object workflow model, ADR-0073); Events (JSON-form registration).
- ✅ **Social Media Management plane** (ADR-0124, epic [#1338](https://github.com/markdconnelly/ImperionCRM/issues/1338)): unified inbox + compose-once publishing (#1340) + **in-plane analytics** (#1342 — organic `social_metric` per-channel/per-post ∪ paid `campaign_metric` per-ad CPL, data-layer union/no migration; same read feeds the BI-hub social/ad tiles, ADR-0062; ad results shaped for Marketing Attribution #1316). Collectors = **slice H** (LP #357): FB/IG comments → silver `social_engagement`, post/ad insights → `social_metric` with normalized metric names (#135). LP writes `social_engagement` as role `imperion-localpipeline` — **migration 0212** ([#1364](https://github.com/markdconnelly/ImperionCRM/issues/1364)) grants it SELECT/INSERT/UPDATE there (0210 only granted the cloud pipeline + backend; `social_metric` LP grant predates it in 0075). Renders live once collectors hydrate. Brand **mentions** (the other half of ADR-0124 #2) get bronze `meta_mentions` — **migration 0213** ([#1365](https://github.com/markdconnelly/ImperionCRM/issues/1365), idempotent UNIQUE `(platform, mention_id)`, LP collector slice pending) → merges to `social_engagement` (kind `mention`); same PR did the owed slice-H OKF sync (`social_engagement` + `social_metric` concept files: Meta poll-in source-of-record + canonical metric vocabulary, #135 at silver).
- ✅ Communications — one unified multi-channel timeline per contact.
- ✅ Discovery → Assessments → Proposals engagement chain (agent-prefilled discovery answers a human confirms).
- ✅ **Marketing content + advocacy** (Belle, Stream-01): content-studio + advocacy-capture workspaces ([#1701](https://github.com/markdconnelly/ImperionCRM/issues/1701)) over new silver `content_asset` / `brand_asset` / `reference` (migrations 0236–0238); reference-cultivation seam into Celeste (#1704). Belle brought to full agent standard with her 9 Stream-01 workspaces.
- ✅ **Client success** (Celeste, epics [#1396](https://github.com/markdconnelly/ImperionCRM/issues/1396) + [#1688](https://github.com/markdconnelly/ImperionCRM/issues/1688)): client-360 hub + vCIO/vCISO advisory playbooks (account-success-plan, QBR-prep, renewal-readiness, expansion-create, tech-lifecycle/roadmap, security-posture-review, cyber-risk-register, health-intervention) + operator-readiness slices 08-Q relationship-recovery / 08-R onboarding-success-time-to-value / 08-S stakeholder map. New silver `stakeholder` (champion/relationship map, migration 0244, [#1695](https://github.com/markdconnelly/ImperionCRM/issues/1695)) + `it_budget` as a living workspace-as-SoR artifact (#1688).
- ✅ **CRM-parity epic [#314](https://github.com/markdconnelly/ImperionCRM/issues/314) CLOSED** (2026-06-19) — table-stakes gaps vs major CRMs closed; 28/30 children shipped, the 2 deferred re-homed to v2 sub-epics.

### ERP
- ✅ **Sale → delivery** (ADR-0096): KQM read-only quote SoR → silver `opportunity` merge → backend executor (client/provisioning/ticket-fire, idempotent, DocuSign-gated). Provisioning-flow GUI + DocuSign consent remain.
- ✅ **Projects & PM parity** (ADR-0094): project board (user-creatable types), shared `task` model (subtasks, dependencies, multi-assign, custom fields, statuses, tags, comments, @mentions, attachments, watchers, notifications — migrations 0094–0101), Kanban/calendar/timeline views, workload/capacity/sprints/baselines/goals/portfolio, intake forms, templates + recurrence, onboarding.
- ✅ **Time & expense + Monthly Close** (ADR-0093): website-authoritative weekly timesheets → `time_record`; monthly expense reports → `expense_item`; idempotent Autotask Time-Ticket/Expense-Report writers; unified Monthly Close; QBO payment fact read back (read-only). Comp data (pay/mileage rate) role-gated.
  - ✅ **Expense v1 effectively COMPLETE** ([#482](https://github.com/markdconnelly/ImperionCRM/issues/482)): manual-mileage path live end-to-end (form → `website_mileage` bronze 0137 → silver `expense_item`); receipt upload live ([#899](https://github.com/markdconnelly/ImperionCRM/issues/899) → `receipt_attachment`); QBO production app connected.
  - ▶ MileIQ paid mileage API → **deferred to v2** (ADR-0099); v1 mileage = manual entry.
- ✅ **AR collections** (ADR-0085): dunning worklist over the read-only QBO invoice mirror + app-native `collections_activity` overlay (never writes QBO). **Own-vs-mirror RESOLVED (ADR-0140, [#1580](https://github.com/markdconnelly/ImperionCRM/issues/1580)):** curated silver `invoice` (migration 0241) is a pipeline-populated read-only MIRROR of bronze `qbo_invoices` — Imperion owns no app-native AR ledger; AR-aging is a derived read-model over it, not a separate entity.
- ✅ **Finance FP&A read-models** (Audrey, epic [#1394](https://github.com/markdconnelly/ImperionCRM/issues/1394); autonomy **ADR-0139** — finance does NOT inherit the canonical ladder, the QBO/money wall is permanent `always_gate`): 5 read-only workspaces — budget-variance / cash-flow / anomaly-detection / recurring-revenue / cost-to-serve ([#1721–1724](https://github.com/markdconnelly/ImperionCRM/issues/1721)); human-authored silver `budget` (migration 0240, agent read-only) + `it_budget` (0243). Playbooks (payroll-recon, month-end-close, invoice-precheck, ar-aging, renewal-margin) ship read-only/advise-only; every dunning or money SEND stays a human easy-button. QBO bronze family reconciled to the LP collectors (migration 0219).
- ✅ **CMDB & assets** (ADR-0092/0097): read-only CI register + Device inventory over per-source bronze merged to silver `device`; **cloud is now a first-class CI** (migration 0144 — 23 cloud→account edges + criticality overlay verified in prod), Intune managed-apps device drill (0148); **UniFi network-infra bronze** `unifi_devices` (0162, #1053 — landing target for the closed LP #73/#259 collector; merge co-locates on-prem, LP follow-up; prod-applied, awaiting collector hydration).
- ✅ Service desk: tickets (Autotask-linked), omnichannel queue + live-chat console with deflection telemetry + escalate-to-Autotask; Strategic Business Reviews.
- ✅ **ITIL problem & change governance** (ADR-0079): silver `problem` / `known_error` ([#1577](https://github.com/markdconnelly/ImperionCRM/issues/1577)) + change-governance `change_request` ([#1579](https://github.com/markdconnelly/ImperionCRM/issues/1579)) (migrations 0223/0224) — the substrate for the NOC/Problem/Change delivery agents.
- ✅ **Dispatch** technician + skill model (migration 0222, [#1071](https://github.com/markdconnelly/ImperionCRM/issues/1071)) — the assignment substrate for the Dispatch agent.
- ✅ **Partnerships spine** (Bridget): silver `partner` / `partner_deal` ([#1623](https://github.com/markdconnelly/ImperionCRM/issues/1623)) + money slice `partner_mdf` / `referral_payout` ([#1657](https://github.com/markdconnelly/ImperionCRM/issues/1657)) (migrations 0226/0227); partner-deal-routing tracer (#1624).

### Extras
- ✅ Reporting / BI hub (ADR-0062) + Dashboard cross-domain summary strip.
- ✅ Connector marketplace (manifest registry + `connector_instance`); Security posture dashboard; Consent ledger + lawful-basis gate; Knowledge search (semantic search pending vectorization); Workflows builder; GitHub-coupled Feedback.

### AI suite
- ✅ Single orchestrator runtime live in the backend (backend ADR-0036); right-hand orchestrator panel on every page.
- ✅ AI Agents page (ADR-0048) + Board of Directors (ADR-0049) — both admin-only, real, reading live tables.
- ✅ ICM framework + autonomy dial (ADR-0091); self-hosted Managed Agents runtime; orchestration & observability matrix (ADR-0087).
- ✅ **AI-Technician wedge**: complete end-to-end (FE inbox migration 0164 → ADR-0111 event transport → Pipeline #155 emit → Backend #296 dispatcher). **Felix** operator cockpit `/operator/technician`. Operationally activation-gated (test-pool rule until Mark opens it).
- ✅ **The 26-agent org factory (epic [#1666](https://github.com/markdconnelly/ImperionCRM/issues/1666), CLOSED)** — built top-to-bottom on `main`, runtime-gated on the backend executor + dial + Voyage seed (#389):
  - **Nova** = the single orchestrator (renamed from "Jarvis"; intake-route tracer #1545), **delegate-only** — it routes, never actuates.
  - **5 C-suite delegate-only agents** (Executive Suite tier, **ADR-0131**; management surface **ADR-0137**): Rachel (Chief of Staff), Dexter (CTO), Roman (deputy CISO), Sterling (deputy CFO), Jessica (CRO). They manage by performance (division-performance-review), delegate down, and hand governance/risk up — no new tool, the ceiling stays delegate-only.
  - **21 domain/sub-agents** under them: the original eight (Felix · Chase · Belle · Audrey · Vance · Pierce · Celeste · Vera) + **Partnerships Bridget** (#1624) + CTO-delivery (NOC · Problem · Change · Dispatch · BCDR, #1551) + security (SOC · GRC · Identity, #1556) + G&A (People · Legal, #1558) + assurance (Service-Quality · Knowledge, #1560). Roster + topology in [`docs/agents/agent-roster.md`](agents/agent-roster.md) · [`docs/agents/org-structure.md`](agents/org-structure.md) · [`docs/agents/nova.md`](agents/nova.md); live `/org` react-flow map (#1539/#1602) surfaces each agent's procedures + steps (#1612).
  - **Persona + org schema** (**ADR-0135**): `org.yaml` human layer + 26 agent personas + 7 employee personas on a 7-section schema (#1607/#1608).
  - **Per-agent eval-golden standard** (#1538) — goldens seeded for every agent (migrations 0225, 0228–0235, 0239, 0242).
- ✅ **Domain agents activated to full standard** (persona + canonical L0–L5 ladder map, **ADR-0128**; each propose/advise-gated until Mark opens the pool): **Chase** (sales — lead-response/opportunity-create/social-reply/renewal-reprice + Stream-02 coverage + sales-desk advisory pilot), **Audrey** (finance — see Finance below), **Belle** (marketing — see Marketing), **Celeste** (client-success — see Client success), **Vance** (procurement), **Pierce** (projects), **Vera** (platform-governance — conformance engine A1–A8, #1458–1466), **Bridget** (partnerships).
- ✅ **Governed-action plane matured**: `auto_at_level` on the action catalog + gauntlet selection (#1412); backend executor action kinds in FE↔BE lockstep (#1497, migration 0218); governance-settings admin surface on Settings → AI (#1408); advisory-desk archetype B10 (**ADR-0138**) makes a domain agent consultable read-only.
- ▶ **Unified agent memory / second brain** (epic [#966](https://github.com/markdconnelly/ImperionCRM/issues/966) / [#1152](https://github.com/markdconnelly/ImperionCRM/issues/1152); ADR-0113→0116): **substrate prod-applied** — verbatim bronze `memory_drawer` (0167, `agent_slug` 0170), two-substrate personal store = temporal-KG `personal_fact` (0168) + Curated-Vault sync (0169), gold hybrid ranker (0166). Per-owner vault containers + RBAC + the non-BYPASSRLS Personal Curator identity are provisioned. **Unhydrated**: capture tables empty + embeddings not yet generated, so recall is the finished contract awaiting on-prem hydration (LocalPipeline #176 / BE #302/#303).
- ▶ **Agentic-OS governance planes** (the actuation/memory hardening, mostly schema+foundation shipped, prod-apply Mark-gated): **two-axis RLS access spine** (ADR-0105, migs 0152/0153 — slices 1–2 shipped, dormant); **deny-by-default action/tool-grant** (ADR-0107, migs 0156–0158 — 2B–2E1 shipped); **1–5 autonomy dial + approval cockpit** (ADR-0109 — schema (0158) + the **per-agent actuation slider** on `/agents` (#1013 / 2E-3, writes the FE-owned `agent_action_autonomy` directly, `agents:operate`-gated) shipped; the **native cross-agent approval cockpit** `/operator/cockpit` (2E-4, #1014) shipped over `agent_pending_action`, listing every agent's parked actions with approve/reject wired to the live decide endpoint (BE #267, `POST /orchestration/cockpit/decide`) — with a distinct **`human_follow_up` deny-route card** ("Reply owed · draft denied", [#1787](https://github.com/markdconnelly/ImperionCRM/issues/1784)) for the **c-path** of Belle's a/b/c social-inbox messaging loop: an operator TO-DO (`plan_seq=NULL`, never dispatches) written when a drafted reply is denied on a still-owed thread (backend ADR-0109/0110/0111); backend dispatch routing (2E-2, BE #250) still in flight; the **L4 oversight view** (2E-5, #1202) shipped on the same page — lists actions executed autonomously at autonomy L4 (`agent_pending_action.status IN ('executed','expired')`) for after-the-fact review with an undo affordance **disabled pending the backend compensate endpoint** (FE-filed BE issue, twin of #267); the **AI-Technician operator cockpit** `/operator/technician` UI shipped over `agent_pending_action`, #1056, decide endpoint now live (BE #267), run-ledger trace pending BE #258/#263; the **live agent-reply approval surface** now consumes the generalized **`proposedActions[]` envelope** (`{ kind, input, tier, dataClass, … }`, backend #282) — the chat panels render an inline `ProposedActionCard` per action (comms + non-comms, tier/dataClass-labelled) and approve by forwarding `input` **verbatim** to `/agent/actions/execute`, #1130; backend's legacy `proposedAction` projection drop is a coordinated BE follow-up); **eval/quality plane** (ADR-0106 + backend ADR-0077 — 0154/0155 **prod-applied**, CI gate dormant); **event/trigger substrate** (#991 — 1B tracer `agent_event` 0164 prod-applied; the backend dispatcher drains pending rows on a timer); **tiered knowledge / 6 personal brains** (#966/#967/#968 — substrate shipped, see the unified-memory build above). These are the OS's protected-mode + syscall + test-harness organs; see [`data-design-for-agents.md`](architecture/data-design-for-agents.md).
- ✅ **OKF semantic layer as the orchestrator grounding cortex** (ADR-0104, amends ADR-0086): grounding-only meaning/authority/joins; `source_skill` routing registry (migration 0143); three freshness gates live (same-repo + cross-repo okf-sync + on-prem reconciliation).
- ▶ **Grounding-conflict resolution + domain-owner registry** (ADR-0119, [#1035](https://github.com/markdconnelly/ImperionCRM/issues/1035); agentic-OS contract decision 4): when canon · company · personal disagree at grounding time, serve the most-authoritative *valid* tier **labelled** (anti-stall; `src/lib/grounding/authority.ts`) and bubble the conflict to the **domain owner** to resolve — never hard precedence, never model arbitration (the company-tier twin of `personal_contradiction`). Schema (migration 0178): `domain_owner` registry + `grounding_conflict` workflow (open→resolved/dismissed) + `grounding_conflict_event` ledger + the `app_grounding_conflict_resolver()` resolve predicate. **Tracer**: registry + workflow + interim-answer helper shipped; the resolution **write-back to canon/silver is the deferred follow-up**. Prod-apply Mark-gated.
- ▶ RAG gold layer + embeddings: knowledge objects modelled; **vectorization (Voyage 1024d) not yet built** (LocalPipeline #176). Semantic search surfaces when this lands.

---

## 3. Integration wiring status (prod)

| Integration | Status | Notes |
|---|---|---|
| **QuickBooks Online** | ✅ **Production** connected | expense/payroll read-back; Simple Start company linked 2026-06-19; one accounting scope. Intuit App Assessment accepted. |
| **M365 Graph** | ✅ Live | mail/Teams ingestion proven; tokens in Key Vault; reuses the SSO Entra app (Mark's call). |
| **ACS email** | ✅ Verified | `acs.imperionllc.com`; agent sends as `crm@` shared mailbox (Exchange ApplicationAccessPolicy scoped). **SMS deferred** (no number). |
| **Autotask** | ✅ Webhook live | ticket + ticket-note webhooks → backend; 181 tickets bronze==silver. |
| **Receipts** | ✅ Provisioned | private blob container + 90-day lifecycle; backend MI holds Blob Data Owner. |
| **Meta (FB/IG)** | ✅ Live | posts/DMs/lead forms ingested (migration 0075). |
| **Dark Web ID / Televy** | ▶ Wired, gated | no-op until API key configured. |
| **MileIQ** | ▶ v2 | deferred; v1 mileage manual. |
| **DocuSign** | ▶ Sandbox/demo | operator card + test-connection shipped; prod account + admin consent are Mark gates. |
| **Credential registry** | ✅ | `connection` table extended to a Key Vault credential registry (ADR-0103, migration 0141): scope personal/company/client + account_id + cert-or-secret. |

---

## 4. Migration & ADR ledger (recent)

**Migrations** (all applied to prod; full set in [`db/migrations/`](../db/migrations)):
- `0085–0093` time/expense finance · `0094–0101` work-management (PM parity)
- `0131/0132` CMDB curated layer · `0144` cloud first-class CI · `0145` change_affected_ci allows cloud · `0146` posture_policy allows purview_compliance
- `0141` connection credential registry · `0147` `connection.client_id` · `0142` LP merge write grants
- `0143` `source_skill` routing registry · `0148` `intune_managed_apps` bronze
- `0152` `app_user.group_ids` (#974) · `0153` `personal_note` + first RLS owner policy (#975 — verify via [`docs/testing/rls-access-spine.md`](testing/rls-access-spine.md)) · `0158` actuation dial + cockpit queue · `0159` `metric_definition` · `0160` `entity_xref` · `0161` Pax8 bronze · `0162` `unifi_devices` bronze · `0165` client mapping (`account_tenant` → `entity_xref`, ADR-0112)
- `0163` Jarvis run-ledger + action plane (**#1064, prod-applied 2026-06-21**): `agent.display_name` + seed · `agent_conversation` (conversation_id correlation root) · `agent_run.conversation_id` · `agent_pending_action` chain (`run_id`/`plan_seq`/`depends_on_seq`) + `data_class` · `agent_governance_setting` (kill-switch/caps/TTL) · Autotask eval-case seeds
- `0164` `agent_event` durable wake-event inbox (**#998, 1B tracer of #991/#997; prod-applied 2026-06-22**): the event→`agent_run` substrate (Pipeline INSERTs, backend dispatcher drains pending rows on a timer + opens a run). DB-inbox transport does NOT pre-empt the Mark-gated bus choice (#997); `agent_subscription` deferred to #999, DLQ replay to #1000
- `0166` gold **hybrid-search substrate** (ADR-0115, gold hybrid ranker — semantic + FTS + metadata + temporal) · `0167` `memory_drawer` **bronze verbatim** (ADR-0113, non-agent captures, owner-axis RLS) · `0170` `memory_drawer.agent_slug` agent attribution (ADR-0116, Universal Memory MCP `store`/`recall`/`list_agents`) — **all PROD-APPLIED 2026-06-22** (substrate live but unhydrated; embeddings pending LP #176)
- `0168` `personal_fact` personal-tier temporal knowledge graph (**#1155, epic #1152, ADR-0114; PROD-APPLIED 2026-06-22**): owner-private entity–relation–object triples with a Validity Window (`valid_from`/`valid_to`; NULL = live, closed = superseded, never hard-deleted → auditable timeline). Provenance is polymorphic — `(source_kind, source_id)` cites `memory_drawer` (non-agent) or `agent_message` (agent), split by origin (ADR-0113). Owner-axis RLS (ADR-0105, 0153 mechanic). Data layer `src/lib/data/personal-fact.ts` = add/invalidate/timeline/current
- `0169` Curated Vault sync substrate + **Personal Curator god-view** (**#1157, epic #1152, ADR-0114 + ADR-0105 amendment; PROD-APPLIED 2026-06-22**): `personal_vault_file` (blob-path mirror of the per-owner Curated Vault, `sync_state` projected/human_edited/conflict), `personal_curation_event` (append-only god-view ledger), `personal_contradiction` (owner-resolved). God-view = permissive non-BYPASSRLS policy keyed on `current_user = 'imperion-personal-curator'` (Phase-2 INFRA-provisioned role) over ALL personal surfaces incl. existing `memory_drawer`/`personal_fact`; LP gets SELECT-only god-view on `memory_drawer` (#300). Owner-facing data layers `personal-vault-file.ts`/`personal-contradiction.ts`/`personal-curation-event.ts`. **Phase-2 provisioned live** (#1176/#1177): 6 per-owner `vault-<owner>` blob containers + per-owner RBAC + the non-BYPASSRLS `imperion-personal-curator` identity/login. Curator runtime = BE #302
- **`0205–0244` (all PROD-APPLIED)** — the social/agent-factory/finance/marketing/client-success wave:
  - *Social & comms*: `0205` backend campaign/ad Meta write-back · `0206` IG-DM bronze · `0207` Meta Lead-Ads bronze · `0208` Threads bronze · `0209/0210` Social-plane schema + deny-by-default Belle grants · `0211` `client_communication` silver (ADR-0126) · `0212` LP `social_engagement` write grant · `0213` `meta_mentions` bronze · `0214` `account_domain` backfill
  - *Web-role least-privilege (ADR-0127)*: `0216` SELECT-by-default + 107-table write allowlist. **⚠ Gotcha: `0215` (social/campaign read-only) over-revoked — never apply `0215` without `0216`** (CI guard bans blanket grants).
  - *Governed action*: `0217` action-catalog `auto_at_level` · `0218` executor action kinds (FE↔BE lockstep) · `0221` platform-scope AI credentials (ADR-0129) · `0220` Datto provider
  - *Agent silver substrate*: `0219` QBO bronze reconcile · `0222` dispatch technician+skill · `0223` `problem`/`known_error` · `0224` change-governance `change_request` · `0226/0227` `partner`/`partner_deal` + `partner_mdf`/`referral_payout`
  - *Finance/marketing/client-success*: `0236–0238` `content_asset`/`reference`/`brand_asset` · `0240` `budget` · `0241` `invoice` QBO mirror (ADR-0140) · `0243` `it_budget` · `0244` `stakeholder`
  - *Eval goldens*: `0225` org-agents seed · `0228–0235` (partner/marketing/deputy-cfo/sales/client-success/orchestrator/sales-desk) · `0239` marketing content/advocacy · `0242` finance
- `0245` `agent_run.parent_run_id` (tier-delegation run-tree link, [#1746](https://github.com/markdconnelly/ImperionCRM/issues/1746)) — **authored on `main`, prod-apply pending** (each prod `migrate.mjs` apply is Mark-gated, §10.3)

**Recent ADRs** ([`docs/decision-records/`](decision-records/README.md)) — note the
consolidated dossiers that supersede earlier scattered ADRs:
- `ADR-0091` AI/ICM platform · `ADR-0092` medallion data platform · `ADR-0093` employee finance · `ADR-0094` PM parity · `ADR-0095` RBAC · `ADR-0096` sale→delivery
- `ADR-0097` CMDB authority model · `ADR-0098` change enablement · `ADR-0099` manual-mileage-v1 / MileIQ-v2 · `ADR-0100` broad employee read · `ADR-0101` minimalist code generation · `ADR-0102` vector contract single home · `ADR-0103` connection credential registry · `ADR-0104` OKF orchestrator grounding cortex · `ADR-0105` two-axis RLS access spine
- `ADR-0106` agent eval/quality plane · `ADR-0107` governed action & tool-grant plane · `ADR-0108` LinkedIn integration · `ADR-0109` actuation autonomy dial (1–5) · `ADR-0110` rebrand to Imperion OS (identity names `ImperionCRM*` frozen, ADR-0016)
- `ADR-0111` agent event substrate · `ADR-0112` client mapping · `ADR-0113` verbatim memory tier · `ADR-0114` personal knowledge store data model · `ADR-0115` gold hybrid ranker contract · `ADR-0116` universal memory MCP contract · `ADR-0117` public technical papers + deep-dive doc set
- `ADR-0118` data_class third RLS axis + action ceiling · `ADR-0119` grounding-conflict resolution + domain-owner registry · `ADR-0120` eval feedback loop (PII-safe harvest) · `ADR-0121` earned graduated autonomy / hard ceilings · `ADR-0122` connections-surface consolidation + KV naming · `ADR-0123` agent-first build doctrine (QBO = money SoR, finance read-only) · `ADR-0124` social media management plane · `ADR-0125` Threads integration · `ADR-0126` client communications capture model
- `ADR-0127` web-role least-privilege write allowlist · `ADR-0128` canonical agent autonomy ladder (L0–L5) · `ADR-0129` platform-scope credentials · `ADR-0130` renewals & opportunity consistency · `ADR-0131` Executive Suite tier (orchestrator + delegate-only C-suite) · `ADR-0132` personal ingestion & distillation plane · `ADR-0133` operating-procedure catalog · `ADR-0134` policy-canon architecture · `ADR-0135` persona schema + three-matrix org
- `ADR-0136` workflow doctrine (archetype step-templates) · `ADR-0137` executive management surface · `ADR-0138` advisory-desk archetype (B10) · `ADR-0139` finance autonomy (explicit per-workflow, QBO-gated, no ladder inheritance) · `ADR-0140` AR/invoice own-vs-mirror (QBO read-only mirror; AR-aging derived)

---

## 5. Go-live spine — remaining gates

The critical path to `v1.0.0` is operator/credential work, mostly Mark-gated:

1. ▶ **On-prem host bring-up + hydration** (LocalPipeline #102) — collectors fill bronze → silver → gold/vectorize. Mark reports the host done; bronze→silver hydration counts to be verified.
2. ▶ **Agent-quality eval** (#186) — set `AGENT_EVAL_BASE_URL`, `npm run eval`.
3. ▶ **Mark UX sign-off**, then **declare v1.0.0** (`Release-As 1.0.0` across all four repos).
4. ▶ Non-blocking: DocuSign prod consent (#318), SSO cert rotation (#940, accepted-risk), ACS SMS number.

Scope is **frozen to v1.0.0**: no new features until the milestone is declared; cleanup,
bugfixes, and already-filed v1 work continue. Deferred-feature epics are parked for v2
(see the v2 milestone).

---

## 6. Deliberately deferred (stubbed, not broken)

- Remaining ingestion engines: YouTube / LinkedIn / Plaud (OAuth flow itself is live-wired).
- Embeddings generation + vector/semantic search over gold (LocalPipeline #176).
- SMS sends (no ACS number); MileIQ paid API (v2).

These degrade to an honest "logged to the timeline" / "recorded stub with a notice" path
and never fail a page — by design, so the GUI is demoable before every source is wired.

---

## 7. Shell, plumbing & aesthetic (shipped detail)

Detail relocated from `CLAUDE.md` §6 (issue [#970](https://github.com/markdconnelly/ImperionCRM/issues/970), right-sizing per meta-policy §4.5).

- **Three-column shell** — collapsible left nav (64px icon rail); central work area with
  a top bar (page title, wired global search → Knowledge, Graph-sync indicator); the
  collapsible right orchestrator panel. Collapse state persists to localStorage. User chip
  shows "Entra · SSO" + a **sign-out** button (`signOutAction` → `/login`). AI Agents +
  Board pages are admin-only (#90, `canSeeAgentPages`); Settings has an **AI tab** with the
  orchestrator preset / budget cap / month-to-date spend card.
- **Per-connection poll cadence** (ADR-0038, migration 0035): `connection.poll_interval_minutes`
  (0 = manual/paused) + auto-saving cadence selector on Settings cards; the pipeline honours
  it via `pollDue()` (pipeline ADR-0008).
- **Per-source bronze** (ADR-0039, migrations 0036/0037 + 0038–0041 posture, 0075–0079 newer
  feeds): one physical bronze table per (source, entity), read through union views; silver
  `device` table; manual entries use the `website` source. Posture bronze (Secure Score,
  Sentinel, Entra/Intune policies, Autotask contracts/tickets, IT Glue) + citation views are
  on-prem (LocalPipeline). Newer feeds: Meta (FB/IG), Defender, Entra auth-methods, SharePoint
  inventory, Entra groups + membership.
- **Security/assessment ingestion** (ADR-0040, migrations 0042/0043): Dark Web ID →
  `credential_exposure`; Televy → `assessment_artifact`. Wired but gated (no-op until key set).
- **Per-user OAuth connections** (ADR-0024 + backend ADR-0038): Settings → Your connections
  runs the backend authorization-code flow; tokens custodied in Key Vault by the backend;
  unconfigured providers degrade to a recorded stub with a notice. Activation = backend app
  settings (`OAUTH_REDIRECT_BASE_URL` + per-provider client ids).
- **1:1 email/SMS sends** (#183, ADR-0058): composer executes through the backend's
  approval-gated send path (consent re-asserted at execution; email as the employee's own M365
  mailbox + the `crm@` shared agent mailbox; SMS via ACS deferred — no number) and degrades to
  the logged-to-timeline stub where prerequisites aren't configured.
- **Aesthetic:** dense, premium internal-tool feel (Linear/Vercel-grade), dark theme. Design
  tokens (in `globals.css` + Tailwind): bg `#0B0E14` · panel `#111621` · panel-2 `#151B28` ·
  border `#1E2636` · text `#E6EAF2` · dim `#8A93A6` · accent `#5B8DEF` · accent-2 `#7C6BF0` ·
  green `#3FBF8F` · amber `#E0A33E` · red `#E2615A`. Display font Space Grotesk, body IBM Plex Sans.
