# Product Requirements (original design-intent record)

- **Status:** Historical design-intent record — decisions D1–D11 locked 2026-06-07.
  The modules described here are **built and live** today; the product has since grown
  well beyond this CRM-centric scope into a full **CRM + ERP + extras + AI** platform.
- **Owner:** Mark Connelly (Imperion LLC)
- **Related:** [data-model](../database/data-model.md), ADR-0010 … ADR-0016,
  [capability overview](../product/imperion-os-overview.md)
  (the *current* shipped surface), [product-roadmap-v1-v3](product-roadmap-v1-v3.md)

> **Read this as the founding requirements doc, not the current scope.** It captures
> the 2026-06-07 design interview that defined the CRM spine; everything in it shipped.
> For what exists *now* — including the ERP backbone (sale→delivery, projects/PM,
> time/expense, finance close, collections, CMDB, service desk) and the full AI suite
> that postdate this interview — read the
> [capability overview](../product/imperion-os-overview.md).

**Imperion OS** is the internal operations platform for Imperion LLC (an
MSP). It is the **single interface employees use to track the health of a customer
across the entire lifecycle** — from an inbound lead, through the sales cycle,
onboarding, implementation, operational readiness, handoff, and continuous
managed-service success, then *cycling back* into new sales motions. It sits as an
operational intelligence layer above Microsoft 365 and Kaseya (CLAUDE.md §1).

This document captures the requirements elicited in the 2026-06-07 design
interview. Each module below is a bounded context; the data model
([data-model.md](../database/data-model.md)) is deliberately modular so satellite
features evolve without reworking the core.

## Personas

- **Salesperson** — works leads/opportunities, reviews AI lead briefs, logs calls
  (Plaud) and interactions.
- **Delivery / Ops** — runs onboarding/implementation projects, readiness, handoff.
- **Admin** — triages feature requests, manages configuration.
- **Leadership (Mark)** — uses the AI Board of Directors; sees portfolio health.
- **Read-only** — visibility without edit.

All identities come from **Entra ID**; roles derive from Entra groups (CLAUDE.md
§3, ADR-0016). Single tenant — Imperion employees only.

## Modules & requirements

### 1. CRM Core (the spine)
- Company-centric: a long-lived **Account** (a business) is the central record;
  **Contacts** (people) belong to it; each sales motion is an **Opportunity**, so
  one Account runs many opportunities over its life (initial sale, upsell, renewal).
- **Two stage dimensions** (ADR-0010): the Account carries a *customer lifecycle*
  stage (Prospect → Onboarding → Implementation → Operational Readiness →
  Managed/Active); each Opportunity carries its own *sales* stage (Lead → Qualified
  → Proposal → Won/Lost). A managed customer can have an open upsell at the same
  time. The dashboard's five-stage strip is a **view** over these.
- **Account health** is a *computed* score from signals (engagement recency, open
  Autotask tickets, onboarding/readiness status, sentiment), not a manual field.

### 2. Engagement Timeline — the "lifetime history"
- One **append-only interaction stream** captures every touch: email, SMS, Teams
  message, Plaud call (audio + transcript), meeting, note, ad engagement, and
  system/lifecycle events (ADR-0011).
- Staged enrichment (CLAUDE.md §4): **bronze** (raw payload, JSONB) → **silver**
  (normalized, entity-linked) → **gold** (summary + vector embedding for agent
  retrieval). Large blobs (call audio, attachments) live in object storage with a
  DB pointer.

### 3. Integrations & data aggregation
- A central **external-identity map** links each Account to its IDs across systems
  (Autotask company, IT Glue org, M365 tenant/domain, Facebook) (ADR-0012).
- **Ingest** into the timeline: M365 email + Teams (background), Plaud calls,
  Facebook lead/ad data.
- **Poll on demand, never duplicate:** Autotask tickets, IT Glue assets/docs.
  Fetched live, cached only briefly. Autotask ticket history is *referenced*, not
  copied.

### 4. Demand generation & lead intel
- **Facebook ad campaigns** (only FB for now): create campaigns and read analytics.
  `Campaign`/`Ad` entities with polled metrics (spend, impressions, leads).
- **Attribution** on every inbound Contact/Opportunity (campaign, ad, UTM) so
  pipeline traces back to ad spend.
- **Enrichment**: agentic web-scrape intel stored as refreshable gold records
  (source, confidence, summary, embedding) powering a salesperson's lead brief.

### 5. Communications & consent
- Email and SMS are first-class, logged to the timeline.
- **Consent ledger** (ADR-0014): per Contact × channel (email, SMS, call-recording),
  every opt-in/opt-out is an immutable event with timestamp, source, and proof;
  current consent is *derived*. Sends are blocked unless consent is current
  (TCPA/CAN-SPAM/GDPR defensibility).
- **Nurture sequences** modeled in-app as Workflow + Enrollment; Power Automate only
  fires the actual send/notify (CLAUDE.md §3).

### 6. Delivery (post-sale)
- **Proposal** on the Opportunity (status, document, sent/accepted).
- **Project** (onboarding/implementation) with **Tasks**, **Milestones**, a
  **Readiness checklist** (operational-readiness validation), and a **Handoff**
  record — the lead→managed lifecycle completed in the schema (ADR-0010).
- A general **Task / to-do** model used across sales and delivery.

### 7. Agent platform
- The orchestrator model (single user-facing orchestrator → internal sub-agents) is
  CLAUDE.md §2. Persisted in Postgres (ADR-0015): **agent definitions**
  (instructions, model-routing, tool-scope), append-only **runs + messages** audit
  (inputs, tool calls, outputs, tokens/cost, acting user, permission scope), and
  **pgvector memory**. A `module` tag separates CRM agents from the Board.
- Agent actions **inherit the acting user's permission scope**.
- The web orchestrator is the authoritative surface; an M365/Teams/Outlook channel
  can attach later with no schema change.

### 8. AI Board of Directors (distinct, non-CRM module)
- Persona agents mimicking executive roles (e.g. CFO/CMO/COO/CTO) — instructions +
  knowledge scope, on the shared agent core, `module='board'` (ADR-0015).
- Usable 1:1, **or** via a convened **Board Session** on a topic where selected
  members deliberate (multi-agent) and the session records each member's input plus
  a synthesized recommendation. Reads granted business context; walled off from the
  CRM operational surface.

### 9. Feature feedback
- Employees submit **Feature Requests**, **upvote**, admins triage (status,
  priority, target release) (ADR-0013).
- On acceptance, push to **GitHub** as an Issue on the project board (one-way to
  start); status and linked release/PR reflected back so users see "released."

### 10. Identity & access
- `app_user` mirrors Entra; roles from Entra groups → app permissions (Admin,
  Sales, Delivery/Ops, Leadership/Board, Read-only) (ADR-0016).
- PII fields flagged; access audit-logged; schema ready for row-level (owner/team)
  scoping.

## Build phasing (schema designed now, built in order)

1. **Phase 1 — Core + timeline:** Account/Contact/Opportunity, stages, interaction
   stream (bronze/silver/gold), users/RBAC, Postgres+pgvector stood up; dashboard
   reads real data behind the existing repository abstraction (Task 4).
2. **Phase 2 — Integrations:** identity map, M365 + Plaud ingest, Autotask/IT Glue
   poll; health scoring.
3. **Phase 3 — Demand gen & comms:** Facebook campaigns/attribution, consent ledger,
   email/SMS, enrichment briefs.
4. **Phase 4 — Delivery:** proposals, projects, readiness, handoff.
5. **Phase 5 — Agent platform & Board:** orchestrator, memory, Board sessions.
6. **Phase 6 — Feature feedback ↔ GitHub.**

## Out of scope (for now)
- Ad platforms other than Facebook.
- Multi-tenant / external-customer access.
- Replacing Autotask/IT Glue/M365 (augment only — CLAUDE.md §1).

## Open items
- Health-score signal weighting (Phase 2).
- Retention policy per data class (PII, recordings, transcripts).
- Whether feedback↔GitHub becomes two-way sync.
