# Decision Records

Architecture Decision Records. See [`_template.md`](./_template.md) for the required
fields, and `CLAUDE.md` section 8 / the project standards doc.

> **ADR numbers are per-repo, not global.** The sibling repos `ImperionCRM_Backend` and
> `ImperionCRM_Pipeline` keep their own `decision-records/`, and numbers from 0029 onward
> **overlap** with this index — e.g. *this* repo's ADR-0032 = per-source bronze tables,
> while backend ADR-0032 = agent-layer architecture. Within this repo a bare "ADR-00XX"
> refers to this index; cross-repo references are always qualified ("backend ADR-0032",
> "pipeline ADR-0002"). Note ADR-0029 (Agent layer runtime) lives at the repo root, not in
> this folder, because it governs the backend.

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](./ADR-0001-open-web-stack-over-power-platform.md) | Open web stack over Power Platform | Accepted |
| [0002](./ADR-0002-entra-id-as-sole-idp.md) | Entra ID as sole IdP | Accepted |
| [0003](./ADR-0003-postgres-pgvector-unified-store.md) | PostgreSQL + pgvector as unified store | Accepted |
| [0004](./ADR-0004-single-orchestrator-agent-model.md) | Single-orchestrator agent model | Accepted |
| [0005](./ADR-0005-entra-auth-via-authjs-certificate.md) | Web auth via Auth.js + Entra certificate | Accepted |
| [0006](./ADR-0006-azure-app-service-hosting.md) | Azure App Service hosting | Accepted |
| [0007](./ADR-0007-repository-data-access-abstraction.md) | Repository data-access abstraction | Accepted |
| [0008](./ADR-0008-break-glass-emergency-access.md) | Break-glass emergency access | Accepted |
| [0009](./ADR-0009-bundling-resilient-customfetch-hook.md) | Bundling-resilient customFetch hook | Accepted |
| [0010](./ADR-0010-customer-data-model-dual-axis-stages.md) | Company-centric data model, dual-axis stages | Accepted |
| [0011](./ADR-0011-unified-interaction-timeline.md) | Unified interaction timeline, staged enrichment | Accepted |
| [0012](./ADR-0012-integration-identity-map-ingest-poll.md) | Integration identity map, ingest-vs-poll, demand gen | Accepted |
| [0013](./ADR-0013-feature-feedback-github.md) | Feature feedback coupled to GitHub | Accepted |
| [0014](./ADR-0014-consent-ledger-communications.md) | Append-only consent ledger and communications | Accepted |
| [0015](./ADR-0015-agent-platform-and-board.md) | Agent platform persistence and AI Board | Accepted |
| [0016](./ADR-0016-rbac-and-identity-model.md) | RBAC and identity model | Accepted |
| [0017](./ADR-0017-raw-sql-migrations.md) | Raw SQL migrations as schema source of truth | Accepted |
| [0018](./ADR-0018-gui-only-frontend-external-functions.md) | GUI-only frontend; logic in DB or external functions | Accepted |
| [0019](./ADR-0019-proposal-lifecycle-model.md) | Proposal lifecycle model | Accepted |
| [0020](./ADR-0020-delivery-project-model.md) | Delivery project model (onboarding/implementation) | Accepted |
| [0021](./ADR-0021-reporting-read-model-and-recharts.md) | Reporting read model and Recharts | Accepted |
| [0022](./ADR-0022-assessment-led-gtm-and-engagement-model.md) | Assessment-led GTM & AI Security Readiness Assessment model | Accepted |
| [0023](./ADR-0023-engagement-capture-and-relationship-data-model.md) | Engagement capture & long-term-relationship data model | Accepted |
| [0024](./ADR-0024-per-user-personal-connections-and-lead-hooks.md) | Per-user personal connections & lead-capture hooks | Accepted |
| [0025](./ADR-0025-contact-360-enrichment-and-lawful-basis.md) | Contact-360 enrichment dossier & lawful-basis gating | Accepted |
| [0026](./ADR-0026-demand-gen-audiences-and-ad-consent.md) | Demand-gen audiences & ad-targeting consent | Accepted |
| [0027](./ADR-0027-pre-discovery-automation-and-agent-answer-approval.md) | Pre-discovery automation & agent-answer human approval | Accepted |
| [0028](./ADR-0028-backend-topology-and-network-isolation.md) | Backend topology — separate repo, Functions on shared plan, network-isolated | Accepted |
| [0029](../../ADR-0029-agent-layer-runtime.md) | Agent layer runtime | Accepted |
| [0030](./ADR-0030-rbac-gui-restrictions.md) | Role-based access control & GUI restrictions from Entra groups | Accepted |
| [0031](./ADR-0031-normalized-contact-lifecycle.md) | Normalized contact object & lifecycle pipeline | Accepted |
| [0032](./ADR-0032-per-source-bronze-tiering.md) | Per-source bronze tables for contacts and companies | Accepted |
| [0033](./ADR-0033-assessment-televy-and-365-permission.md) | Assessment evidence (Televy), client-ready report & the 1:1 365 grant | Accepted |
| [0034](./ADR-0034-onboarding-pm-and-task-categories.md) | Onboarding PM dashboard, R/Y/G milestones & task categories | Accepted |
| [0035](./ADR-0035-apollo-enrichment-integration.md) | Apollo as the global contact & company enrichment provider | Accepted |
| [0036](./ADR-0036-company-credential-configuration.md) | Company credential configuration in Settings | Accepted |
| [0037](./ADR-0037-onboarding-playbook-template.md) | Standard onboarding playbook template & checklist | Accepted |
| [0038](./ADR-0038-per-connection-poll-cadence.md) | Per-connection poll cadence | Accepted |
| [0039](./ADR-0039-per-source-bronze-tables.md) | Per-source physical bronze tables + device entity | Accepted |
| [0040](./ADR-0040-darkwebid-televy-ingestion.md) | Dark Web ID + Televy ingestion (credential_exposure) | Accepted |
| [0041](./ADR-0041-gold-knowledge-vector-store.md) | Gold knowledge layer + pinned Voyage/1024 vector store | Accepted |
| [0042](./ADR-0042-division-of-labor-reads-direct-processes-backend.md) | Division of labor: direct reads OK, every process in the backend | Accepted |
| [0043](./ADR-0043-settled-ai-stack-drop-legacy-vectors.md) | Settled AI stack (Claude + Voyage); drop legacy 1536-dim vector tables | Accepted |
