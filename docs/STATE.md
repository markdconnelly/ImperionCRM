# Current state — Imperion Business Manager (frontend repo)

> **What this is.** The dated, volatile inventory of *what is actually shipped* — the
> detail the meta-policy (`CLAUDE.md` §4) keeps **out** of `CLAUDE.md` so the contract
> there stays short and stable. `CLAUDE.md` §6 carries the one-paragraph summary and
> points here. The **why / what we are building** narrative lives in
> [`docs/product/imperion-business-manager-overview.md`](product/imperion-business-manager-overview.md);
> the durable decisions live in [`docs/decision-records/`](decision-records/README.md).
> The authoritative cross-session record is GitHub issues/PRs + the ADRs — this file is
> a navigable index over them, not a replacement.

**Last refreshed:** 2026-06-20 · **Milestone:** pre-`v1.0.0` (build complete; go-live is
now an operator/credential problem, not a code problem) · **Schema:** migrations
**0001–0148 applied to prod** · **ADRs:** through **0104** · **OKF bundle:** 56 concept files.

---

## 1. Headline

The app is **built, deployed, and live** on Azure App Service
(`imperioncrm.azurewebsites.net`, Entra SSO). Every UI module listed in `CLAUDE.md` §6 is
real and serving data. The board's own verdict (2026-06-17) is that the *build* is done;
reaching `v1.0.0` (first real employee use, target ≈ 2026-07-01) is an **operator**
problem — wiring credentials, hydrating the on-prem collectors, and a UX sign-off — not a
feature-build problem. Most flows that look "deferred" are **deploy-dormant**, not broken:
they light up the moment their source credential lands and the collectors hydrate bronze.

---

## 2. Shipped capability inventory (by domain)

Each row is live in the app unless flagged. Routes and governing ADRs are in the
[capability overview](product/imperion-business-manager-overview.md); this is the
done/▶-in-flight ledger.

### CRM
- ✅ Leads + capture hooks + lead inbox + lead scoring (`lead_score`).
- ✅ Contacts + Contact-360 (dossier, unified communications timeline, per-contact consent, composer).
- ✅ Accounts; interactive Pipeline (drag deals between stages).
- ✅ Campaigns + audiences/ads + builders; Journeys (single-object workflow model, ADR-0073); Events (JSON-form registration).
- ✅ Communications — one unified multi-channel timeline per contact.
- ✅ Discovery → Assessments → Proposals engagement chain (agent-prefilled discovery answers a human confirms).
- ✅ **CRM-parity epic [#314](https://github.com/markdconnelly/ImperionCRM/issues/314) CLOSED** (2026-06-19) — table-stakes gaps vs major CRMs closed; 28/30 children shipped, the 2 deferred re-homed to v2 sub-epics.

### ERP
- ✅ **Sale → delivery** (ADR-0096): KQM read-only quote SoR → silver `opportunity` merge → backend executor (client/provisioning/ticket-fire, idempotent, DocuSign-gated). Provisioning-flow GUI + DocuSign consent remain.
- ✅ **Projects & PM parity** (ADR-0094): project board (user-creatable types), shared `task` model (subtasks, dependencies, multi-assign, custom fields, statuses, tags, comments, @mentions, attachments, watchers, notifications — migrations 0094–0101), Kanban/calendar/timeline views, workload/capacity/sprints/baselines/goals/portfolio, intake forms, templates + recurrence, onboarding.
- ✅ **Time & expense + Monthly Close** (ADR-0093): website-authoritative weekly timesheets → `time_record`; monthly expense reports → `expense_item`; idempotent Autotask Time-Ticket/Expense-Report writers; unified Monthly Close; QBO payment fact read back (read-only). Comp data (pay/mileage rate) role-gated.
  - ✅ **Expense v1 effectively COMPLETE** ([#482](https://github.com/markdconnelly/ImperionCRM/issues/482)): manual-mileage path live end-to-end (form → `website_mileage` bronze 0137 → silver `expense_item`); receipt upload live ([#899](https://github.com/markdconnelly/ImperionCRM/issues/899) → `receipt_attachment`); QBO production app connected.
  - ▶ MileIQ paid mileage API → **deferred to v2** (ADR-0099); v1 mileage = manual entry.
- ✅ **AR collections** (ADR-0085): dunning worklist over the read-only QBO invoice mirror + app-native `collections_activity` overlay (never writes QBO).
- ✅ **CMDB & assets** (ADR-0092/0097): read-only CI register + Device inventory over per-source bronze merged to silver `device`; **cloud is now a first-class CI** (migration 0144 — 23 cloud→account edges + criticality overlay verified in prod), Intune managed-apps device drill (0148).
- ✅ Service desk: tickets (Autotask-linked), omnichannel queue + live-chat console with deflection telemetry + escalate-to-Autotask; Strategic Business Reviews.

### Extras
- ✅ Reporting / BI hub (ADR-0062) + Dashboard cross-domain summary strip.
- ✅ Connector marketplace (manifest registry + `connector_instance`); Security posture dashboard; Consent ledger + lawful-basis gate; Knowledge search (semantic search pending vectorization); Workflows builder; GitHub-coupled Feedback.

### AI suite
- ✅ Single orchestrator runtime live in the backend (backend ADR-0036); right-hand orchestrator panel on every page.
- ✅ AI Agents page (ADR-0048) + Board of Directors (ADR-0049) — both admin-only, real, reading live tables.
- ✅ ICM framework + autonomy dial (ADR-0091); self-hosted Managed Agents runtime; orchestration & observability matrix (ADR-0087).
- ✅ **OKF semantic layer as the orchestrator grounding cortex** (ADR-0104, amends ADR-0086): grounding-only meaning/authority/joins; `source_skill` routing registry (migration 0143); three freshness gates live (same-repo + cross-repo okf-sync + on-prem reconciliation).
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

**Recent ADRs** ([`docs/decision-records/`](decision-records/README.md)) — note the
consolidated dossiers that supersede earlier scattered ADRs:
- `ADR-0091` AI/ICM platform · `ADR-0092` medallion data platform · `ADR-0093` employee finance · `ADR-0094` PM parity · `ADR-0095` RBAC · `ADR-0096` sale→delivery
- `ADR-0097` CMDB authority model · `ADR-0098` change enablement · `ADR-0099` manual-mileage-v1 / MileIQ-v2 · `ADR-0100` broad employee read · `ADR-0101` minimalist code generation · `ADR-0102` vector contract single home · `ADR-0103` connection credential registry · `ADR-0104` OKF orchestrator grounding cortex

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
