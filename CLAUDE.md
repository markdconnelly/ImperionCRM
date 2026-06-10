# CLAUDE.md

Guidance for Claude Code working on this repository. Read this file fully before
making changes. It captures the architecture, the decisions already made, the
current state of the work, and the immediate build plan. When a decision here
conflicts with a quick instinct, this file wins unless the human says otherwise.

---

## 1. What this project is

**Imperion CRM** — an internal, AI-enabled operations platform for a Managed Service
Provider (MSP). It manages the full lifecycle of a managed-services customer:
lead → qualification → proposal → onboarding → implementation → operational
readiness → handoff → continuous customer success.

It sits as an **operational intelligence layer above Microsoft 365 and Kaseya
systems**, augmenting them rather than replacing them.

### Capabilities (target scope)
CRM · sales pipeline · opportunity tracking · proposal lifecycle · client
onboarding · implementation project tracking · operational readiness validation ·
client handoff workflows · continuous customer success · AI-assisted operational
intelligence · agentic workflow automation.

### What it explicitly is NOT
- NOT a Power Platform application
- NOT a Dataverse-first application
- NOT a Copilot Studio application

It is a modern web application built on open web technology, using Microsoft and
Kaseya platforms where they add clear value.

---

## 2. Core architectural principles

These are non-negotiable unless an ADR (see §8) changes them.

1. **User experience comes first.** The web app is the authoritative interface.
   Microsoft Teams and Outlook-triggered workflows are secondary channels.
2. **Single agent experience.** The user talks to ONE orchestrator. Many
   specialized sub-agents exist internally (CRM, Sales, Proposal, Onboarding,
   Documentation, IT Glue, Autotask, M365, Reporting) but never interact with the
   user directly. The orchestrator routes requests, selects tools, invokes
   sub-agents, manages context and memory, enforces permissions, and returns
   responses.
3. **Microsoft for identity and security.** Entra ID is the mandatory identity
   provider. Use Entra ID, OAuth/OIDC, Conditional Access, Passkeys, MFA, Device
   Compliance, RBAC. Do NOT introduce third-party identity providers (Clerk,
   Auth0, Supabase Auth) without a compelling, documented justification.
4. **Open web development.** Prefer a modular monolith over microservices until
   scale justifies decomposition. Avoid unnecessary complexity. Prefer proven
   technology over hype.

---

## 3. Technology stack

**Frontend:** Next.js · React · TypeScript · Tailwind CSS · shadcn/ui
**Backend:** Next.js API Routes · Node.js services · Azure Functions where
appropriate
**Database:** PostgreSQL with the `pgvector` extension. Serves as system of
record, metadata store, embedding store, and agent memory layer.

**The AI stack is SETTLED (ADR-0043 / backend ADR-0034, supersedes
"provider-agnostic"):** **Claude** for generation (Haiku cheap tier / Sonnet premium
tier) + **Voyage `voyage-3-large` @ 1024 dims** for embeddings (ADR-0041's pinned
vector contract). One pair, one vector space; re-adding a provider is a new ADR. The
front end holds **no AI key** — the backend and on-prem pipeline call the providers.
(Note: this is the runtime AI the *application* calls — distinct from Claude Code,
the dev tool building the app.)

### Microsoft integration
Entra ID · Microsoft Graph · Azure Functions · Azure API Management · Power
Automate · SharePoint · Teams · Outlook · Power BI · Sentinel · Defender.
Power Automate is for triggers/approvals/notifications ONLY — never core business
logic. Core business logic belongs in the application.

### Kaseya integration
Deep integration with Autotask, IT Glue, My IT Process, and Kaseya APIs. Store
external identifiers for synchronization. Support bidirectional sync where
appropriate. Augment, do not replace.

---

## 4. Data architecture — staged enrichment pipeline

All external data flows through three layers:

- **Bronze:** raw source data (emails, meetings, Teams messages, IT Glue exports,
  Autotask records, Microsoft Graph content, My IT Process data). No
  transformations; store original payloads.
- **Silver:** normalized + enriched (cleaned entities, relationship mapping,
  metadata extraction, deduplication, classification).
- **Gold:** AI-ready knowledge (summaries, embeddings, knowledge objects,
  semantic relationships, agent-consumable datasets). Most agent reasoning should
  consume Gold only.

The platform must support relational queries, semantic/vector search, knowledge
graphs, agent memory, and document intelligence from the start. Traditional CRUD
alone is not sufficient.

---

## 5. Security posture ("Mythos Proof")

Assume continuous attack, AI-assisted attackers, credential theft, supply-chain
attacks, and insider threats. Every change must support: Zero Trust · Least
Privilege · RBAC · audit logging · secret rotation · OWASP Top 10 protection ·
secure file handling · dependency scanning · SAST · DAST · secure CI/CD · backup
validation · disaster recovery · incident response.

**Security is a product feature, not an afterthought.** Never commit secrets or
API keys — use environment variables locally and the platform secret store (Azure
Key Vault) in deployed environments.

---

## 6. Current state of the work

The app is **built, deployed, and live** on Azure App Service
(`imperioncrm.azurewebsites.net`, Entra SSO). It is no longer a chat-interface
prototype — the Next.js project, the three-column shell, Entra auth, PostgreSQL +
pgvector, the repository data layer, and all the UI modules below are real and
serving data.

**Built and live:**
- **Three-column shell** — collapsible left nav (64px icon rail), central work area
  with a top bar (page title, **wired** global search → Knowledge, Graph-sync
  indicator), and the collapsible right orchestrator agent panel. Collapse state
  persists to localStorage. User chip shows "Entra · SSO".
- **Modules (all real):** Dashboard, Leads (+ capture hooks & inbox), Discovery
  (+ agent-answer approval → fit/nurture routing), Accounts, Contacts (+ 360 detail:
  dossier, timeline, consent, composer), Pipeline (interactive — move deals between
  stages), Assessments, Proposals, **Projects** (the project board, ADR-0052 #95:
  every project type on one surface, user-creatable types — table not enum,
  migration 0058 — owners, per-project tasks via `task.project_id`,
  `canManageProjects`), Onboarding, Business Reviews, Tickets, Tasks,
  Campaigns (+ audiences/ads + builders), Communications (unified multi-channel
  timeline), Reporting, Knowledge (search over the gold layer), Workflows (+ builder
  & step editor), Consent (ledger), Integrations (per-user personal connections),
  Security (posture dashboard), Settings, Feedback (GitHub-coupled), **AI Agents**
  (ADR-0048: orchestrator preset + budget via the backend's GET/PUT `/agent/settings`,
  registered sub-agents, `agent.turn` audit activity), **Board of Directors**
  (ADR-0049 + backend ADR-0039: convene → POST `/board/sessions` runs the synchronous
  two-round deliberation + synthesis; sessions list + `/board/[id]` transcript &
  recommendation read the 0056 tables directly; convening is guarded by `agents:operate`,
  admin-only per ADR-0050).
  Editable discovery/assessment question catalog. The AI Agents and Board pages are
  **admin-only** (#90, `canSeeAgentPages` — same gate as Settings/ADR-0030), and
  Settings has an **AI tab** surfacing the orchestrator preset / budget cap /
  month-to-date spend card (same card + backend PUT as the AI Agents page).
- **Data:** PostgreSQL + pgvector; migrations **0001–0056 applied** to prod (0056 =
  agent core + board persistence with 5 seeded personas, ADR-0049; verified 2026-06-10).
  Typed repositories with a mock fallback. Entra SSO (certificate client auth) +
  break-glass.
- **Auth:** sidebar user chip has a **sign-out** button (`signOutAction` → `/login`).
- **Per-connection poll cadence (ADR-0038, migration 0035):** `connection.poll_interval_minutes`
  (0 = manual/paused) with an auto-saving cadence selector on the Settings cards; the pipeline
  honours it via `pollDue()` (pipeline ADR-0008).
- **Per-source bronze (ADR-0039, migrations 0036/0037):** one physical bronze table per
  (source, entity) — `{autotask,apollo,m365,itglue,website}_contacts`, the `_companies` set, and
  `{itglue,m365,website}_devices` — read through union views (`contact_bronze_all` etc.); a new
  silver **`device`** table; `contact`/`account` remain the silver aggregate. Manual entries use
  the `website` source. The on-prem local-pipeline adds its own security-posture bronze (Secure
  Score, Sentinel, Entra/Intune policies, Autotask contracts/tickets, IT Glue export) + related-
  source citation views (migrations 0038–0041).
- **Security/assessment ingestion (ADR-0040, migrations 0042/0043):** **Dark Web ID** compromised
  credentials → silver `credential_exposure`; **Televy** reports → `assessment_artifact`. Wired
  but gated (no-op until the API key is configured).
- **Per-user OAuth connections (ADR-0024 + backend ADR-0038):** Settings → Your connections
  runs the backend's real authorization-code flow (`connectionsService` →
  `/connections/{provider}/{start,callback,disconnect}`; callback route
  `/api/connections/[provider]/callback`; tokens custodied in Key Vault by the backend;
  disconnect revokes custody first). Unconfigured providers (and key-based Plaud) degrade
  to the recorded stub with a notice. Activation = backend app settings
  (`OAUTH_REDIRECT_BASE_URL` + per-provider client ids — docs/operations/credential-wiring-next-steps.md §4b).

**Aesthetic:** dense, premium internal-tool feel (Linear/Vercel-grade), dark theme.
Design tokens (in `globals.css` + Tailwind): bg `#0B0E14` · panel `#111621` · panel-2
`#151B28` · border `#1E2636` · text `#E6EAF2` · dim `#8A93A6` · accent `#5B8DEF` ·
accent-2 `#7C6BF0` · green `#3FBF8F` · amber `#E0A33E` · red `#E2615A`. Display font
Space Grotesk, body IBM Plex Sans.

**Deferred to the next phase (deliberately stubbed, not broken):** the actual
ingestion engines (Microsoft Graph / YouTube / LinkedIn / Facebook — the per-user
OAuth flow itself is now live-wired, see above), real email/SMS sends, agent/LLM
enrichment execution, and embeddings generation + vector search. The agent layer is
no longer deferred: the orchestrator runtime is live in the backend (backend
ADR-0036), the AI Agents page is real (ADR-0048), and the **Board** page is real
(ADR-0049, backend ADR-0039). Until a source is wired, the remaining flows are
stubbed (e.g. a "send" logs to the timeline) and never fail the page.

---

## 7. Build plan — status & next phase

The original first-tasks plan is **complete**: ✅ project scaffolded (Next.js App
Router + TypeScript + Tailwind, ESLint, strict TS, `/docs` tree); ✅ three-column
shell + Dashboard; ✅ Entra ID auth gate (certificate client assertion, ADR-0005);
✅ PostgreSQL + pgvector with the typed repository data layer; ✅ the orchestrator
boundary stubbed behind interfaces; ✅ CI/CD on App Service (GitHub Actions: lint,
typecheck, build, docs check). Hosting landed on **Azure App Service** (ADR-0006),
not Static Web Apps.

**Next phase — wire the live integrations** (the deliberately-deferred work). This is a
**four-repo system** with a settled division of labor (2026-06-09, ADR-0042): **this
front end = strictly GUI** (direct DB *reads* for rendering are fine; every *process*
calls the backend) · **`ImperionCRM_Backend` = all processes** (Azure Functions on the
same App Service Plan, **identity-gated** — Easy Auth + caller allowlist, backend
ADR-0035; private networking deferred for cost — reached server-side via
`src/lib/services/external-client.ts`; boundary = ADR-0028) · **`ImperionCRM_Pipeline` =
live data** (webhooks, bronze→silver merge, on-demand refresh — pipeline ADR-0011) ·
**`ImperionCRM_LocalPipelineEnrichment` = heavy lifting** (on-prem PowerShell: scheduled
bulk ingestion, IT Glue hub, ALL vectorization). The shared security baseline is
[docs/security/unified-security-standard.md](docs/security/unified-security-standard.md).
**This repo remains the single source of truth for the database schema/migrations** —
the siblings are consumers; propose schema changes here.
1. ~~Live OAuth flows + Key Vault token storage for per-user connections~~ (done —
   backend ADR-0038 + this repo's wiring; per-provider app registrations remain an
   ops task), then the ingestion engines (Graph email/Teams, YouTube, LinkedIn,
   Facebook, Plaud) writing into the `interaction` timeline and `contact_enrichment`
   dossier.
2. Real email/SMS sends behind the consent gate; agent/LLM enrichment execution.
3. Embeddings generation + vector (semantic) search over the gold layer.
4. ~~The orchestrator agent runtime + the AI Agents page~~ (done — backend ADR-0036,
   front-end ADR-0048); ~~the Board page~~ (done — backend ADR-0039, front-end
   ADR-0049 + the `/board` module).
5. Pre-go-live security: rotate the deferred secrets (see the project memory).

Before starting each task, restate the plan briefly and flag anything that
conflicts with the principles in §2–§5.

### Git / GitHub
The human authenticates `gh` themselves (`gh auth login`). You may run
`git`/`gh` to create the repo, commit, and push **with their go-ahead** —
confirm the repo name and visibility first. Never create accounts or store
their credentials.

---

## 8. Documentation standards (REQUIRED — from the project's standards doc)

Documentation is a required deliverable and a security control. **Code without
documentation is considered incomplete.** A feature is not done until: code
committed, tests done, docs updated, diagrams updated, API specs updated, security
impacts documented, and deployment instructions updated if applicable. Docs are
updated as part of every pull request.

**Documentation as code:** all docs live in GitHub, version-controlled, stored
alongside source, reproducible from source. Preferred formats: Markdown, Mermaid,
OpenAPI, PlantUML, D2, ADR documents, YAML config docs. Avoid docs that live only
in Word/PDF/Visio/whiteboards/external wikis.

**Create and maintain this `/docs` tree:**

```
/docs/architecture      /docs/security        /docs/agents
/docs/integrations      /docs/database        /docs/api
/docs/workflows         /docs/deployment      /docs/runbooks
/docs/disaster-recovery /docs/operations      /docs/user-guides
/docs/admin-guides      /docs/testing         /docs/decision-records
/docs/diagrams          /docs/compliance      /docs/data-governance
```

Key required artifacts (see the standards doc for the full field lists):
- **Architecture:** system overview; the eight required diagrams (high-level,
  application, infrastructure, data flow, security, agent, integration,
  deployment); per-component docs (purpose, responsibilities, dependencies,
  interfaces, authn/authz, security controls, failure handling, monitoring,
  recovery).
- **Agents:** every agent gets a dedicated doc — identity, responsibilities,
  inputs, outputs, tool access, security boundaries, failure handling, and a
  workflow diagram.
- **API:** OpenAPI spec + endpoint catalog; per-endpoint purpose, inputs, outputs,
  validation, dependencies, security.
- **Database:** ERD updated on every schema change; entity docs; vector-data docs
  (embedding models, chunking, retrieval, lifecycle, retention, agent usage);
  bronze/silver/gold lifecycle.
- **Security:** threat models, trust boundaries, identity architecture, secrets
  management, logging/monitoring (Sentinel), incident response.
- **Integrations / Operations / User guides:** per the standards doc.
- **ADRs** for every significant decision: problem, context, options, tradeoffs,
  decision, security impact, cost impact, operational impact, future
  considerations. **Record the decisions already made in §2–§3 as the first
  ADRs** (e.g., "Open web stack over Power Platform", "Entra ID as sole IdP",
  "PostgreSQL + pgvector as unified store", "Single-orchestrator agent model").

**Visuals:** assume visual learners; prefer Mermaid/PlantUML/D2 generated from
source; store diagram source in GitHub.

**CI/CD doc validation** (GitHub Actions): markdown formatting, broken links,
diagram generation, OpenAPI validation, documentation completeness, ADR
formatting, repo standards compliance, doc build success. PRs should fail if
required documentation is missing.

**Quality bar:** documentation must answer what it is, why it exists, how it
works, how it's secured/monitored/deployed/recovered/maintained, and how users,
agents, and admins interact with it. If a knowledgeable engineer can't understand
a component from its docs alone, the docs are incomplete.

---

## 9. Working agreement

- Prefer maintainability, security, cost efficiency, excellent UX, and long-term
  scalability. Avoid unnecessary complexity.
- When designing any feature, provide: business purpose, user story, UI behavior,
  data-model impact, API requirements, agent interactions, security
  considerations, testing requirements, cost considerations, future enhancements.
- Keep secrets out of the repo. Surface any action that is irreversible or touches
  permissions/billing/deploys to the human before doing it.

## Agent skills

### Issue tracker

Issues are tracked in this repo's GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root + ADRs in `docs/decision-records/`. See `docs/agents/domain.md`.
