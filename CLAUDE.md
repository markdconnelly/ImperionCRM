# CLAUDE.md

Guidance for Claude Code working on this repository. Read this file fully before
making changes. It captures the architecture, the decisions already made, the
current state of the work, and the immediate build plan. When a decision here
conflicts with a quick instinct, this file wins unless the human says otherwise.

---

## 1. What this project is

**Meridian** — an internal, AI-enabled operations platform for a Managed Service
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

**AI must be provider-agnostic.** Support OpenAI, Azure OpenAI, and Claude behind
a model-routing layer that selects on cost, capability, context window, and task
requirements. No hard dependency on a single provider. (Note: this is the runtime
AI layer the *application* calls — the Claude API — and is distinct from Claude
Code, which is the dev tool building the app.)

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

## 6. Current state of the work (as of handoff)

Work so far has been a **design-phase UI prototype**, authored in the Claude chat
interface, not yet in this repo as a running app.

What exists conceptually and should be ported into the real Next.js project:

- A **three-column application shell**:
  - Left **navigation sidebar**, collapsible to a 64px icon rail (toggle in the
    header; expand control on the rail when collapsed). Nav items: Dashboard,
    Accounts, Pipeline, Proposals, Onboarding, Reporting, then a divider, then
    Integrations, Knowledge, Security, Settings. User chip at the bottom shows
    "Entra · SSO".
  - Central **work area** with a top bar (page title, global search, Graph-sync
    status indicator) and a **Dashboard** view: a KPI row (Open Pipeline, Active
    MRR, Onboarding, Avg. Time to Live), a five-stage **pipeline** strip (Lead,
    Qualified, Proposal, Onboarding, Active), and an **"Accounts Needing
    Attention"** table with per-row health dots.
  - Right **orchestrator agent panel** ("Meridian Agent"), collapsible entirely;
    when collapsed a compact "Agent" button appears in the top bar to reopen it.
    The panel shows a conversation feed and an input, framed as "scoped to your
    Entra permissions."
- **Aesthetic direction:** dense, premium internal-tool feel (Linear/Vercel-grade,
  not consumer SaaS). Dark theme. Reference design tokens used in the prototype
  (port into Tailwind theme + CSS variables; refine as needed):
  - bg `#0B0E14` · panel `#111621` · panel-2 `#151B28` · border `#1E2636` ·
    text `#E6EAF2` · dim `#8A93A6` · accent `#5B8DEF` · accent-2 `#7C6BF0` ·
    green `#3FBF8F` · amber `#E0A33E` · red `#E2615A`.
  - The prototype used Inter for body; the design guidance prefers a more
    distinctive display face — feel free to pair a display font with a refined
    body font.

All data in the prototype is mock data. The agent input is stubbed (no backend).
Panel collapse state is in-memory React only.

---

## 7. Immediate build plan (suggested first tasks)

Tackle roughly in this order. Confirm hosting choice with the human before wiring
deploy (Azure Static Web Apps is the recommended default given the Microsoft-first
posture; Vercel is the lower-friction Next.js alternative but sits outside the
Azure perimeter).

1. **Scaffold the project:** Next.js (App Router) + TypeScript + Tailwind +
   shadcn/ui. ESLint + Prettier. Strict TypeScript. Set up the `/docs` tree
   described in §8.
2. **Port the shell:** implement the collapsible three-column layout, theme
   tokens, and the Dashboard view from §6 as real components with typed mock data.
   Keep panel-collapse state ready to be persisted (user setting / localStorage).
3. **Wire Entra ID auth** (OAuth/OIDC) as the sign-in gate before any data view.
   No third-party IdP.
4. **Stand up PostgreSQL + pgvector** and a typed data-access layer; replace mock
   data on the Dashboard with real queries behind a repository abstraction.
5. **Define the orchestrator boundary:** a single server-side entry point for the
   agent that will later route to sub-agents via the provider-agnostic model
   layer. Stub sub-agents behind interfaces.
6. **CI/CD:** GitHub Actions for lint, typecheck, build, plus the documentation
   validation in §8.

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
