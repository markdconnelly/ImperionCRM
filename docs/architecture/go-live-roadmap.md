# Imperion CRM — go-live roadmap

> **You are in: `ImperionCRM` — the CANONICAL copy.** Synced copies live in the three
> sibling repos; update here and re-sync. **As of 2026-06-10.** Companion to the
> [production-readiness plan](production-readiness-plan.md) — that doc tracks *what*
> remains; this one sequences *how we get the app online*, phase by phase, with exit
> criteria. Based on a fresh four-repo code review (2026-06-10, post build-sprint).

## What "online" means (the go-live definition)

The app counts as online when all of the following hold:

1. Employees sign in via Entra SSO and every module serves real data (already true).
2. The orchestrator agent and the AI Board answer over the **full** gold layer
   (9 entity types, vectorized) — semantic search returns results, not 501.
3. At least one per-user OAuth provider (m365) connects end to end.
4. Real-time Autotask tickets flow through the cloud pipeline webhook.
5. Outbound sends are real (consent-gated), or consciously deferred with the stub UI.
6. The on-prem pipeline runs unattended on schedule (no human in the loop).
7. The identity perimeter is verified locked (Easy Auth + caller allowlist on both
   Function Apps) and the deferred secrets are rotated.

## Note: the new library-shipped agent skills

This review was prompted by agent skills appearing in the repos. Finding: the only
skills present are **eight `SKILL.md` files shipped inside `@reduxjs/toolkit` 2.12.0**,
which arrives in the front end's `node_modules` **transitively via `recharts@3.8.1`**.
No repo has project-authored skills, and the app does not use Redux.

**Guidance:** these skills change nothing architecturally. The front end stays
server-components + typed repositories (no client state library). If RTK is ever
adopted deliberately (a heavy client-state feature), follow the bundled skills —
notably the SSR store-per-request pattern — and record the adoption as an ADR. Until
then, do not let the skills' presence steer new code toward Redux.

## Review delta — what the 2026-06-10 review confirmed and found

**Confirmed real (not stubs):** front-end Agents/Board/OAuth-callback modules; backend
orchestrator (ADR-0036), budget cap (ADR-0037), per-user OAuth (ADR-0038), Board
runtime (ADR-0039); pipeline Autotask webhook with byte-for-byte hash parity to the
bulk loader + GDAP-fail-closed Graph handling (ADR-0013); local module v0.5.0 with 12
bronze post writers, 9 gold composers, idempotent vectorization (ADR-0009).

**New gaps the review surfaced (now scheduled below):**

- **Missing grant migrations (front end, blocks Phase 1):** the five new composers
  (device, exposure, assessment, proposal, posture) lack SELECT grants on their source
  tables, and the m365 post writers target migration-0036 tables without write grants
  (local repo `docs/STATUS.md` details the exact tables). A 0058+ grant migration must
  land **before** the knowledge re-sync.
- **Graph subscription create/renew timer (pipeline):** confirmed absent — Graph
  notifications cannot flow until it exists (already on the plan; scheduled Phase 3).
- **CI gaps:** front-end CI never runs its vitest suite; the backend has **no PR CI at
  all** (deploy-only on main); the local repo has no CI (local
  ScriptAnalyzer + Pester gate only). Scheduled Phase 4.
- **No front-end observability:** no Application Insights wiring; errors stop at
  `console.error`. Scheduled Phase 4.
- **Test-count verified:** the readiness plan's "279 hermetic tests" for the local
  module checks out — 279 test cases across 77 Pester files, re-run green (0 lint
  findings, 0 failures) on 2026-06-10 as part of this review.

## The phases

### Phase 0 — lock the perimeter (operator, ~hours, do first)

| # | Task | Repo / where |
| --- | --- | --- |
| 0.1 | Verify **Easy Auth is enabled** on both Function Apps and `ALLOWED_CALLER_CLIENT_ID` is set (backend = web app MI; pipeline = web app/backend MI). Pipeline falls back to permit-all in dev mode when unset — confirm it is set in prod. | Backend + Pipeline (Azure) |
| 0.2 | Replace the `AUTH_SECRET` CI dummy with a real generated value on the web app. | Front end (Azure) |
| 0.3 | Spot-check the audit trail: one agent turn, one board convene → rows in `audit_log` / `board_*`. | Backend |

**Exit:** anonymous calls to either Function App get 401; web-app session signing is real.

### Phase 1 — light the AI core (grants → Voyage key → re-sync → vectorize)

| # | Task | Repo / where |
| --- | --- | --- |
| 1.1 | **File + apply grant migration(s) 0058+:** SELECT grants for the five new composers' source tables; write grants for the m365 post-writer targets (per local `docs/STATUS.md`). Follow the 0044/0055/0057 pattern. | Front end (`db/migrations`) |
| 1.2 | Put the **real Voyage key** in Key Vault `Voyage-Embedding-API-Key`. | Operator (Key Vault) |
| 1.3 | `Invoke-ImperionKnowledgeSync` (interim mode) — adds the five new entity types to gold. | Local pipeline (Mark runs — cert) |
| 1.4 | `Invoke-ImperionKnowledgeSync -Vectorize` — embeds the full gold layer. | Local pipeline (Mark runs) |
| 1.5 | Verify the Claude key live (one real orchestrator turn) and semantic search returns results (`POST /api/search/semantic` no longer 501). | Backend |

**Exit:** Knowledge search + agent retrieval answer over all 9 entity types.

### Phase 2 — connections & comms (OAuth → ACS → GDAP)

| # | Task | Repo / where |
| --- | --- | --- |
| 2.1 | Grant the backend MI **Key Vault Secrets Officer** (token + state writes). | Operator (Azure RBAC) |
| 2.2 | Register the **m365 OAuth app** first; set `OAUTH_REDIRECT_BASE_URL` (`https://imperioncrm.azurewebsites.net/api/connections`) + `OAUTH_M365_CLIENT_ID` / `OAUTH_M365_CLIENT_SECRET_SECRET`. Walk the full loop: connect → token in KV → refresh-on-read → disconnect/revoke. Then the remaining providers as needed. | Backend (app settings + Entra) |
| 2.3 | **ACS:** connection string → KV (`ACS_CONNECTION_SECRET`) + `ACS_SMS_FROM` → live SMS sends. | Backend |
| 2.4 | **GDAP partner app** (Partner Center registration) → backend `GDAP_CLIENT_ID`/`GDAP_REDIRECT_URI`, pipeline `PARTNER_APP_CLIENT_ID`/`PARTNER_APP_SECRET_NAME` → un-501s GDAP consent and feeds the GDAP health sweep. | Backend + Pipeline |

**Exit:** Settings → Your connections completes a real m365 round-trip; GDAP consent no longer 501.

### Phase 3 — real-time data (the pipeline goes hot)

| # | Task | Repo / where |
| --- | --- | --- |
| 3.1 | Set pipeline `PARTNER_TENANT_ID`; create KV secrets `autotask-webhook-secret`, `graph-notification-client-state`; ensure `conn-company-autotask` exists. | Pipeline (Azure + KV) |
| 3.2 | Register the webhook in Autotask; verify the **first live ticket**: payload field casing matches the parser, and hash parity holds (watch the bulk reconcile's `unchanged` tally). | Pipeline + Autotask |
| 3.3 | **BUILD: Graph subscription creation/renewal timer** — per active GDAP tenant, create subscriptions and renew before expiry (`src/functions/timers/`). The notification receiver is ready; this is the only code blocker in the pipeline. | Pipeline (code) |

**Exit:** a ticket created in Autotask appears in the app in near-real-time; Graph notifications flow without manual subscription babysitting.

### Phase 4 — go-live hardening (rotation, host, CI, observability)

| # | Task | Repo / where |
| --- | --- | --- |
| 4.1 | Run the [secrets-rotation runbook](../operations/secrets-rotation-runbook.md) end to end (cert expiry check, Claude key age, company credentials). | Operator |
| 4.2 | **On-prem host provisioning** per the local repo's `docs/deployment/unattended-bringup.md` (8 steps: module install → machine cert → `svc-imperion` → config → SecretStore/CMS → chain test → register scheduled tasks → first real load). Ends interim `-SkipSecretStore` mode. | Local pipeline (on the host) |
| 4.3 | **CI hardening:** add `npm run test` to front-end CI; add a backend **PR gate** (lint, typecheck, test, build — 105 tests exist and pass, they just never gate PRs); add the local repo's deferred workflow (ScriptAnalyzer + Pester). | All four repos |
| 4.4 | **Observability:** wire Application Insights into the web app (errors + key latencies: agent turn, board convene, backend calls). Backend/pipeline already emit run telemetry. | Front end |

**Exit:** unattended schedule running 24/7; every repo gates PRs; rotated secrets documented with dates.

### Phase 5 — post-go-live build tail (highest value first)

1. **Backend ingestion engines** — M365 Graph email/Teams → `interaction` timeline
   first (per-user OAuth from Phase 2 feeds it), then Plaud, then social.
2. **M365 mail/Teams bronze tables** — front-end migration first, then the local
   repo's post writers (collectors already built and waiting).
3. **Lead-capture receivers** (backend) — schema exists; handlers don't.
4. **LLM enrichment endpoints** (backend) — `contact_enrichment` facts + pre-discovery
   draft answers; consent gate is already in place.
5. **Real sends behind the consent gate** — replace the front end's logged-to-timeline
   stubs (`sendMessageAction`, campaign platform push) with backend calls.
6. **Remaining collectors** (local) — Sentinel, KQM, DocuSign (bronze tables exist;
   KQM shape is still an assumption — verify against live access first).

## Sequencing rationale

Phase 0 is hours of pure configuration and closes the only security-posture risk.
Phase 1 unlocks the single highest-payoff feature (the agent reasoning over the full
estate) and its one hidden code dependency is the grant migration — everything else in
the phase is operator action. Phases 2–3 are independent of each other and can run in
parallel; both are config-heavy with one code item (the Graph subscription timer).
Phase 4 is everything that should be true *before* declaring go-live but doesn't block
feature work. Phase 5 is the deferred-build backlog in payoff order — none of it
blocks being online.

## References

- [Production-readiness plan](production-readiness-plan.md) (canonical state + operator checklist)
- [Secrets-rotation runbook](../operations/secrets-rotation-runbook.md)
- [Credential wiring next steps](../operations/credential-wiring-next-steps.md)
- Local repo: `docs/deployment/unattended-bringup.md` · `docs/STATUS.md` (grant gaps)
- Pipeline ADR-0013 (webhooks) · backend ADR-0036–0039 · front-end ADR-0048/0049
