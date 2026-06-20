# CLAUDE.md

Guidance for Claude Code working on this repository. Read this file fully before
making changes. It captures the architecture, the decisions already made, the
current state of the work, and the immediate build plan. When a decision here
conflicts with a quick instinct, this file wins unless the human says otherwise.

/handoff commits files to C:\Development\GitHub\handoff-memory\filename instead of system settings.
when reporting information to me be extremley concise and sacrifice grammar for the sake of concision.

---

## 1. What this project is

**Imperion Business Manager** (this repo is the GUI; legacy slug `ImperionCRM`) — an
internal, AI-enabled operations platform an MSP runs its **whole business** on. It is
**not just a CRM**: it spans **CRM + ERP + extras + a full AI suite** on one surface,
covering the full lifecycle of a managed-services customer (lead → qualification →
proposal → onboarding → implementation → operational readiness → handoff → continuous
customer success) **and** the internal operations behind it (delivery, projects,
finance, support). The product name is **Imperion Business Manager**; the repo slug
and `package.json` name stay `imperion-crm` (Mark-gated, out of scope to rename).

It sits as an **operational intelligence layer above Microsoft 365 and Kaseya
systems**, augmenting them rather than replacing them.

### Capabilities (target scope)
- **CRM** — leads · contacts & Contact-360 · accounts · sales pipeline · opportunity
  tracking · campaigns · journeys · events · the assessment-led lifecycle · proposals.
- **ERP** — sale → delivery orchestration (ADR-0096) · projects & PM parity (ADR-0094) ·
  time & expense + Monthly Close (ADR-0093) · AR collections · CMDB & assets · service
  desk · QuickBooks Online / Autotask mirrors.
- **Extras** — reporting / BI hub · connector marketplace · security posture · consent
  & data governance · knowledge search.
- **AI suite** — single orchestrator + sub-agents · ICM + autonomy dial · self-hosted
  Managed Agents runtime · orchestration & observability matrix · agent rooms (OKF) ·
  RAG knowledge layer · AI-assisted surfaces (ADR-0091).

Full tour: [`docs/product/imperion-business-manager-overview.md`](docs/product/imperion-business-manager-overview.md).

### What it explicitly is NOT
- NOT just a CRM — CRM is one quadrant of a CRM + ERP + extras + AI platform
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

**Volatile status lives in [docs/STATE.md](docs/STATE.md)** — per the meta-policy
(§4.5: "Current state — kept SHORT; volatile detail belongs in `docs/STATE.md`").
This section stays a one-paragraph pointer so the contract above it stays stable.

The app is **built, deployed, and live** on Azure App Service
(`imperioncrm.azurewebsites.net`, Entra SSO) — the Next.js three-column shell, Entra
auth, PostgreSQL + pgvector, the typed repository data layer, and every UI module are
real and serving data. The board's verdict (2026-06-17) is that the *build* is done;
reaching `v1.0.0` is now an **operator/credential** problem, not a feature-build one.
Most flows that look "deferred" are **deploy-dormant**, not broken — they light up the
moment their source credential lands and the on-prem collectors hydrate bronze. The
dated, authoritative inventory — shipped modules, the migration/ADR ledger, integration
wiring status, the go-live spine, and what is deliberately stubbed — is the running
ledger in **[docs/STATE.md](docs/STATE.md)** (and, durably, GitHub issues/PRs + the ADRs).

---

## 7. Build plan & the four-repo division of labor

This is a **four-repo system** with a settled division of labor (2026-06-09, ADR-0042):
**this front end = strictly GUI** (direct DB *reads* for rendering are fine; every
*process* calls the backend) · **`ImperionCRM_Backend` = all processes** (Azure Functions
on the same App Service Plan, **identity-gated** — Easy Auth + caller allowlist, backend
ADR-0035; private networking deferred for cost — reached server-side via
`src/lib/services/external-client.ts`; boundary = ADR-0028) · **`ImperionCRM_Pipeline` =
live data** (webhooks, bronze→silver merge, on-demand refresh — pipeline ADR-0011) ·
**`ImperionCRM_LocalPipelineEnrichment` = heavy lifting** (on-prem PowerShell: scheduled
bulk ingestion, IT Glue hub, ALL vectorization). The shared security baseline is
[docs/security/unified-security-standard.md](docs/security/unified-security-standard.md).
**This repo remains the single source of truth for the database schema/migrations** —
the siblings are consumers; propose schema changes here.

The original scaffolding plan is complete (Next.js App Router + strict TS + Tailwind,
the three-column shell, the Entra auth gate per ADR-0005, PostgreSQL + pgvector with the
typed data layer, the orchestrator boundary, CI/CD on **Azure App Service** per ADR-0006).
**The current build status, the remaining "wire the live integrations" work, and the
go-live spine to `v1.0.0` are the dated ledger in [docs/STATE.md](docs/STATE.md).**

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

### ICM business-process automation

MSP business workflows are ICM workspaces under `icm/` (factory, ADR-0061), executed by the backend orchestrator with a per-workflow autonomy dial (draft -> auto). **Operating rule:** any work on or dry-run of a workflow follows the Layer-0 protocol in `icm/CLAUDE.md` - route via the workspace `CONTEXT.md`, load only the stage's Inputs table, stop at checkpoints, never send. Conventions: `icm/CONVENTIONS.md`; overview: `docs/agents/icm.md`.

### Skills plugin (canon)

Cross-repo agent skills live in `plugins/imperion-skills/` in this repo, served as the in-repo `imperion` marketplace (ADR-0060). One skill per micro-PR; an ADR that supersedes what a skill teaches updates the skill in the same PR. See `docs/agents/skills.md`.

### Semantic layer (OKF canon)

The curated *meaning* of the silver tier is the OKF bundle at `docs/database/semantic-layer/` (ADR-0086): one concept file per silver entity + `coverage-matrix.md` (every object → implementation archetype → IKF status → acting ICM workflow) + `index.md`, framed by `docs/architecture/data-and-automation-doctrine.md` (the eight archetypes). **This repo owns the bundle** (it owns the schema), so it is also where siblings propose updates. **Rule:** any PR that changes a silver entity's shape, source-of-record/authority, or join paths updates the matching concept file (at least its `timestamp`) **and** the `coverage-matrix.md` row in the SAME PR; a new silver entity gets a new concept file + a matrix row. PII-free, no secrets, no code knowledge (ADR-0086 conformance). Staleness is owned by pipeline ops — the **`semantic-layer` docs-gate CI now enforces this** (#535: a PR changing a silver table with a concept file must update that file in the same PR, else CI fails; escape-hatch label `semantic-layer-not-affected` — see `docs/operations/semantic-layer-gate.md`), the on-prem enrichment agent (LocalPipeline #175) later. The system-level CLAUDE.md §11 carries the binding cross-repo contract.
