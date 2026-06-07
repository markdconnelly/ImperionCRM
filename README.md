# Imperion CRM

Internal, AI-enabled operations platform for Imperion LLC (an MSP) — the single
interface employees use to track customer health across the full lifecycle (lead →
qualified → onboarding → implementation → managed, cycling back into new sales).
It is an operational intelligence layer above Microsoft 365 and Kaseya.

This repository is the **GUI** (ADR-0018): it renders the interface, reads/writes
PostgreSQL through a data-access layer, and calls external functions/APIs for heavy
or integration work. See `CLAUDE.md` for architecture/principles, `/docs` for the
full documentation set, and `/docs/architecture/application-boundary.md` for what
lives here vs. externally.

## Stack
Next.js (App Router) · React · TypeScript (strict) · Tailwind CSS.
PostgreSQL 18 + pgvector (Azure Flexible Server). Entra ID as sole IdP (certificate
client auth). Provider-agnostic AI model-routing layer (external).

## What works today
- **Auth:** Entra ID SSO via Auth.js with certificate client authentication; sign-in
  gate enforced by middleware; break-glass emergency access (ADR-0005/0008/0009).
- **Database:** PostgreSQL + pgvector is live; Phase 1 schema applied (CRM core,
  engagement timeline, identity/RBAC — see `db/migrations`). The App Service connects
  via its **managed identity** (no stored password). Initial accounts seeded.
- **Dashboard:** three-column shell (nav → work area → agent panel) with a KPI row,
  five-stage pipeline strip, and "Accounts Needing Attention" table — backed by the
  repository abstraction, which serves **real data when the DB is configured** and
  falls back to mock otherwise.
- **Service clients:** typed placeholders (`src/lib/services`) for the external
  agent/integration/enrichment/comms/campaign/board functions — fail closed until
  their endpoints exist.

In progress: opportunities/delivery data, integrations, the agent runtime, and the
AI Board (see the [build phases](docs/architecture/product-requirements.md) and the
GitHub epics/milestones).

## Develop
```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run lint
npm run build
```
On Windows, exclude the repo + npm cache from Defender if `npm install` fails with
`EACCES` (real-time scanning locks `node_modules`).

## Database
Raw SQL migrations in `db/migrations` (ADR-0017) applied in order. See
[`db/README.md`](db/README.md) for how to apply them with an Entra token (no stored
password). Update the ERD in `docs/database/data-model.md` on every schema change.

## Deploy
Azure App Service (Linux, Node 24) via GitHub Actions on merge to `main` — builds a
Next.js standalone bundle (ADR-0006). App configuration (DB host/user, managed
identity client id, auth) lives in App Service settings; secrets in Key Vault.

Copy `.env.example` to `.env.local` for local development. Never commit secrets.
