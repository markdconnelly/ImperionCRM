# Decision Records

Architecture Decision Records for the ImperionCRM **frontend** repo. Every ADR in this
folder uses the **unified Imperion ADR format** (see [`_template.md`](./_template.md)):
a `# ADR-NNNN: Title` heading, a metadata table (**Repo** · **Status** · **Date** ·
**Supersedes / Superseded by / Amends / Relates to / Companion** where applicable ·
**Cross-references**), then the sections *Problem / Context / Options considered
(with `### Tradeoffs`) / Decision / Consequences (`### Security impact`,
`### Cost impact`, `### Operational impact`) / Future considerations*. The **Date** is
the file's first commit date. Also see `CLAUDE.md` §8 and the project standards doc.

> **ADR numbers are per-repo, not global.** The sibling repos `ImperionCRM_Backend`,
> `ImperionCRM_Pipeline`, and `ImperionCRM_LocalPipelineEnrichment` keep their own
> `decision-records/`, and numbers from 0029 onward **overlap** with this index — e.g.
> *this* repo's ADR-0032 = per-source bronze tables, while backend ADR-0032 =
> agent-layer architecture. Within this repo a bare "ADR-00XX" refers to this index;
> **cross-repo references are always repo-qualified** ("backend ADR-0032",
> "pipeline ADR-0002", "local-pipeline ADR-0009") — the same convention the
> **Cross-references** metadata row uses. Note ADR-0029 (Agent layer runtime) lives at
> the repo root, not in this folder, because it governs the backend.

## Index

One-line decision summaries are an index convenience only — the ADR itself is the
authoritative record.

| ID | Title | Status | Date | Decision |
| --- | --- | --- | --- | --- |
| [0001](./ADR-0001-open-web-stack-over-power-platform.md) | Open web stack over Power Platform | Accepted | 2026-06-06 | Build on the open web stack (Next.js/React/TypeScript); Microsoft provides identity, security, and ingestion — never the app framework. |
| [0002](./ADR-0002-entra-id-as-sole-idp.md) | Entra ID as sole identity provider | Accepted | 2026-06-06 | Entra ID is the mandatory, sole identity provider; no third-party IdP without a superseding ADR. |
| [0003](./ADR-0003-postgres-pgvector-unified-store.md) | PostgreSQL + pgvector as the unified data store | Accepted | 2026-06-06 | One PostgreSQL + pgvector database serves as system of record, metadata store, embedding store, and agent memory. |
| [0004](./ADR-0004-single-orchestrator-agent-model.md) | Single-orchestrator agent model | Accepted | 2026-06-06 | Users interact with one orchestrator agent; specialized sub-agents never face the user directly. |
| [0005](./ADR-0005-entra-auth-via-authjs-certificate.md) | Web auth via Auth.js with Entra certificate client assertion | Accepted | 2026-06-06 | Auth.js v5 + the Entra ID provider authenticating with a certificate client assertion (no client secret). |
| [0006](./ADR-0006-azure-app-service-hosting.md) | Azure App Service as the hosting target | Accepted | 2026-06-06 | Host on Azure App Service (`imperioncrm`), deployed from `main` via the OIDC GitHub Actions workflow. |
| [0007](./ADR-0007-repository-data-access-abstraction.md) | Repository abstraction for data access | Accepted | 2026-06-06 | Typed async repository contracts in `src/lib/data` with mock and PostgreSQL implementations behind one seam. |
| [0008](./ADR-0008-break-glass-emergency-access.md) | Break-glass emergency access | Accepted | 2026-06-06 | A dedicated `/break-glass` Credentials provider gives one env-configured non-Entra account emergency access. |
| [0009](./ADR-0009-bundling-resilient-customfetch-hook.md) | Bundling-resilient certificate `customFetch` hook | Accepted | 2026-06-06 | Wrap the Entra provider in a Proxy so the certificate `customFetch` hook survives production bundling. |
| [0010](./ADR-0010-customer-data-model-dual-axis-stages.md) | Company-centric customer data model with dual-axis stages | Accepted | 2026-06-07 | `account` is the spine with dual-axis stages: `account.lifecycle_stage` plus per-`opportunity` sales stages. |
| [0011](./ADR-0011-unified-interaction-timeline.md) | Unified interaction timeline with staged enrichment | Accepted | 2026-06-07 | A single append-only `interaction` table is the timeline, carrying bronze payloads, silver columns, and gold summaries. |
| [0012](./ADR-0012-integration-identity-map-ingest-poll.md) | External integration identity map, ingest-vs-poll, and demand gen | Accepted | 2026-06-07 | An external-identity map plus an ingest-vs-poll policy per source — augment external clouds, don't duplicate them. |
| [0013](./ADR-0013-feature-feedback-github.md) | Feature feedback coupled to GitHub | Superseded by 0058 | 2026-06-07 | `feature_request` intake/voting in-app; accepted requests create GitHub Issues with one-way status sync back. |
| [0014](./ADR-0014-consent-ledger-communications.md) | Append-only consent ledger and communications | Accepted | 2026-06-07 | An immutable `consent_event` ledger per contact × channel; outbound sends are blocked unless consent is current. |
| [0015](./ADR-0015-agent-platform-and-board.md) | Agent platform persistence and the AI Board of Directors | Accepted | 2026-06-07 | Persist the full agent core (agents, tool grants, runs, messages, memory); agent actions inherit the acting user's permission scope. |
| [0016](./ADR-0016-rbac-and-identity-model.md) | RBAC and identity model | Accepted | 2026-06-07 | `app_user` mirrors the Entra identity; roles derive from Entra group/app-role claims mapped to app permissions. |
| [0017](./ADR-0017-raw-sql-migrations.md) | Raw SQL migrations as the schema source of truth | Accepted | 2026-06-07 | Ordered, idempotent, transactional raw SQL migrations applied with short-lived Entra access tokens. |
| [0018](./ADR-0018-gui-only-frontend-external-functions.md) | GUI-only frontend; logic in DB or external functions | Accepted | 2026-06-07 | This repository is the GUI; everything it "does" is either direct DB access via repositories or a call to external functions. |
| [0019](./ADR-0019-proposal-lifecycle-model.md) | Proposal lifecycle model | Accepted | 2026-06-07 | A `proposal` belongs to exactly one `opportunity` with a `draft → sent → accepted/declined` status lifecycle. |
| [0020](./ADR-0020-delivery-project-model.md) | Delivery project model (onboarding/implementation) | Accepted | 2026-06-07 | A `project` belongs to one `account`, optionally referencing the won opportunity it came from. |
| [0021](./ADR-0021-reporting-read-model-and-recharts.md) | Reporting read model and Recharts | Accepted | 2026-06-07 | A dedicated read-only `reports` repository aggregating in SQL, rendered with Recharts. |
| [0022](./ADR-0022-assessment-led-gtm-and-engagement-model.md) | Assessment-led GTM & AI Security Readiness Assessment model | Accepted | 2026-06-07 | The paid AI Security Readiness Assessment becomes a first-class `assessment` entity in the sales motion. |
| [0023](./ADR-0023-engagement-capture-and-relationship-data-model.md) | Engagement capture & long-term-relationship data model | Accepted | 2026-06-07 | Versioned questionnaires as data (no migrations to edit questions) feeding engagement answers, evidence, and reviews. |
| [0024](./ADR-0024-per-user-personal-connections-and-lead-hooks.md) | Per-user personal connections & lead-capture hooks | Accepted | 2026-06-07 | One `connection` table for user- and company-scope integrations; OAuth tokens live only in Azure Key Vault. |
| [0025](./ADR-0025-contact-360-enrichment-and-lawful-basis.md) | Contact-360 enrichment dossier & lawful-basis gating | Accepted | 2026-06-07 | `contact_enrichment` stores one row per discovered fact, each carrying a lawful basis that gates its use. |
| [0026](./ADR-0026-demand-gen-audiences-and-ad-consent.md) | Demand-gen audiences & ad-targeting consent | Accepted | 2026-06-07 | Campaign → ad → metric model with static/dynamic audiences; ad targeting filters on consent. |
| [0027](./ADR-0027-pre-discovery-automation-and-agent-answer-approval.md) | Pre-discovery automation & agent-answer human approval | Accepted | 2026-06-07 | Agent/automation answers land as drafts; a salesperson confirms or rejects each before the discovery verdict locks. |
| [0028](./ADR-0028-backend-topology-and-network-isolation.md) | Backend topology — separate repo, Functions on shared plan, network-isolated | Accepted | 2026-06-07 | The backend is a separate repo (`ImperionCRM_Backend`) of Azure Functions on the shared plan, isolated to the front end. |
| [0029](../../ADR-0029-agent-layer-runtime.md) | Agent layer runtime | Accepted | 2026-06-07 | Own orchestrator over direct provider APIs — no Foundry Agent Service, no n8n (governs the backend; lives at the repo root). |
| [0030](./ADR-0030-rbac-gui-restrictions.md) | Role-based access control & GUI restrictions from Entra groups | Accepted | 2026-06-08 | Role predicates derived from five Entra security groups gate nav, routes, and server-side revenue redaction. |
| [0031](./ADR-0031-normalized-contact-lifecycle.md) | Normalized contact object & lifecycle pipeline | Accepted | 2026-06-08 | `contact.crm_stage` (audience → lead → prospect → client) normalizes one person across the lifecycle, two-axis with `lifecycle_status`. |
| [0032](./ADR-0032-per-source-bronze-tiering.md) | Per-source bronze tables for contacts and companies | Superseded by ADR-0039 | 2026-06-08 | Enum-discriminated `contact_source`/`account_source` bronze tables — replaced by per-source physical tables in ADR-0039. |
| [0033](./ADR-0033-assessment-televy-and-365-permission.md) | Assessment evidence (Televy), client-ready report & the 1:1 365 grant | Accepted | 2026-06-08 | Televy evidence plus analyst data entry produce the client-ready assessment report; the 365 grant is scoped 1:1. |
| [0034](./ADR-0034-onboarding-pm-and-task-categories.md) | Onboarding PM dashboard, R/Y/G milestones & task categories | Accepted | 2026-06-08 | `task.category` plus `project_milestone` with R/Y/G health and auto-completion checks power the onboarding dashboard. |
| [0035](./ADR-0035-apollo-enrichment-integration.md) | Apollo as the global contact & company enrichment provider | Accepted | 2026-06-08 | Apollo joins the provider enum as a company-scope connection and becomes the global enrichment source. |
| [0036](./ADR-0036-company-credential-configuration.md) | Company credential configuration in Settings | Accepted | 2026-06-07 | A tabbed Settings page gains a Company credentials tab — one card per provider, secrets custodied in Key Vault. |
| [0037](./ADR-0037-onboarding-playbook-template.md) | Standard onboarding playbook template & checklist | Accepted | 2026-06-08 | A 9-phase, ~90-step onboarding playbook template in code, instantiated into milestones + checklist steps per project. |
| [0038](./ADR-0038-per-connection-poll-cadence.md) | Per-connection poll cadence | Accepted | 2026-06-08 | `connection.poll_interval_minutes` (0 = manual/paused) with an auto-saving cadence selector per connection card. |
| [0039](./ADR-0039-per-source-bronze-tables.md) | Per-source physical bronze tables + device entity | Accepted | 2026-06-08 | One physical bronze table per (source, entity) read through union views, plus a new silver `device` entity. |
| [0040](./ADR-0040-darkwebid-televy-ingestion.md) | Dark Web ID + Televy ingestion (credential_exposure) | Accepted | 2026-06-08 | Dark Web ID compromises land in a new silver `credential_exposure`; Televy reports land as `assessment_artifact`. |
| [0041](./ADR-0041-gold-knowledge-vector-store.md) | Gold knowledge layer + pinned Voyage/1024 vector store | Accepted | 2026-06-09 | Unified `knowledge_object` → `knowledge_embedding` gold store pinned system-wide to Voyage `voyage-3-large` @ 1024 dims. |
| [0042](./ADR-0042-division-of-labor-reads-direct-processes-backend.md) | Division of labor: direct reads OK, every process in the backend | Accepted | 2026-06-09 | The front end is strictly GUI: direct DB reads for rendering stay; every process runs through the backend API. |
| [0043](./ADR-0043-settled-ai-stack-drop-legacy-vectors.md) | Settled AI stack (Claude + Voyage); drop legacy 1536-dim vector tables | Accepted | 2026-06-09 | Claude + Voyage are settled system-wide; migration 0046 drops the never-populated 1536-dim embedding tables. |
| [0044](./ADR-0044-silver-contracts-tickets.md) | Silver contracts + tickets from Autotask bronze | Accepted | 2026-06-09 | Migration 0050 adds typed silver `contract` + `ticket`, populated from bronze by the cloud pipeline's merge each sweep. |
| [0045](./ADR-0045-server-action-authorization.md) | Server-action authorization (write capabilities) & fail-closed bootstrap | Accepted | 2026-06-09 | Eight write capabilities gate every mutating server action via `requireCapability`; bootstrap fails closed. |
| [0046](./ADR-0046-saved-list-views.md) | Ticket board filters & saved/shareable list views | Accepted | 2026-06-09 | A `saved_view` table provides per-user, shared, and default saved list views over URL-param filters. |
| [0047](./ADR-0047-device-inventory.md) | Read-only device & cloud-asset inventory | Accepted | 2026-06-09 | A `device_inventory_all` view merges silver devices with IT Glue configurations for a read-only inventory page. |
| [0048](./ADR-0048-ai-agents-operations-page.md) | AI Agents operations page (orchestrator settings + activity) | Accepted | 2026-06-09 | The AI Agents page reads/writes the backend's `/agent/settings` and surfaces `agent.turn` audit activity with tiered fallback. |
| [0049](./ADR-0049-board-runtime-persistence.md) | Materialize the agent core + AI Board persistence (migration 0056) | Accepted | 2026-06-09 | Migration 0056 materializes the agent core and AI Board persistence; model routing is a tier hint resolved at runtime. |
| [0050](./ADR-0050-admin-only-ai-pages-settings-ai-tab.md) | AI pages are admin-only; Settings gains an AI tab | Accepted | 2026-06-10 | `canSeeAgentPages` (admin-only) gates the AI Agents and Board pages at all layers; Settings gains an AI tab. |
| [0051](./ADR-0051-security-posture-model-imperion-secure-score.md) | Security posture model — tenant mapping, posture silver, Imperion Secure Score | Accepted | 2026-06-10 | Explicit admin-managed tenant mapping, pipeline-maintained posture silver, and a versioned pillar-based Imperion Secure Score snapshotted immutably per account. |
| [0052](./ADR-0052-project-board-tasks-meetings-sales-activity.md) | Project board model — project types, unified tasks, meetings, sales activity | Accepted | 2026-06-10 | Project types become data (a table, not an enum); one task model gains `project_id`; easy-mode deploys verify-to-close; meetings link via `interaction.project_id`. |
| [0053](./ADR-0053-campaign-builders-events-scheduled-sends.md) | Campaign builders — events, scheduled sends, and the provider set | Accepted | 2026-06-10 | Events become first-class objects campaigns promote; `campaign_send` adds schedulable blasts; builders are forms + preview on Meta + ACS + Teams. |
| [0058](./ADR-0058-feedback-files-to-app-dev-queue.md) | Feedback files to the app-dev queue | Accepted | 2026-06-11 | The Feedback page files an idempotent Autotask ticket in the app-dev queue via backend #19, superseding the ADR-0013 GitHub coupling. |
| [0059](./ADR-0059-defender-incident-autotask-ticket-linkage.md) | Defender incident ↔ Autotask ticket linkage as a dedicated link table | Accepted | 2026-06-12 | A standalone `defender_incident_ticket_link` (never a bronze column) whose one-ticket-per-incident PK is the sync-back idempotency key. |
| [0084](./ADR-0084-merge-time-number-assignment.md) | Claim migration & ADR numbers at merge, not authoring | Accepted | 2026-06-13 | Parallel sessions collide on self-allocated migration/ADR numbers; assign the real number at merge against current `main`. Issue/PR numbers stay GitHub-allocated. |
| [00XX](./ADR-00XX-icm-budget-file-convention.md) | ICM least-privilege budget files (CONSTITUTION.yaml + domains/<d>/room.yaml) | Accepted | 2026-06-16 | Ratify the ICM budget-file convention — name/location/`{tools, okf_rooms}` shape of the two files, and the "absent budget ⇒ next-lower declared list" degradation rule; extends ADR-0088 §3. |
