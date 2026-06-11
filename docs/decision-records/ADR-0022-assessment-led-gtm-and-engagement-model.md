# ADR-0022: Assessment-led GTM and the AI Security Readiness Assessment model

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-07 |
| **Cross-references** | — |

## Problem

The CRM's sales/delivery model (ADR-0010) was generic. Imperion's actual motion is
**assessment-led**: a *paid* AI Security Readiness Assessment is run before proposing
managed services and is the wedge that wins the long-term contract. The data model had
no representation of this engagement, its six-dimension scorecard, or the credited fee
— so the funnel couldn't be tracked faithfully.

## Context

Source business assets (archived at `docs/reference/sales-marketing/`) define the
motion: a white-paper lead magnet → segmented nurture (Track A/B) → executive
discovery call (eight captures + verdict) → the **AI Security Readiness Assessment**
(paid) → six-dimension scorecard + remediation roadmap → managed-services contract
(2–5 yr MRR) → onboarding + remediation → expansion + quarterly SBRs. Full narrative:
[customer-lifecycle](../architecture/customer-lifecycle.md). Per ADR-0018 the
assessment record is in-repo (DB + UI); the heavy scanning/agents/phishing simulation
that *produce* the scores run in external services.

## Options considered

- **Assessment as its own entity (this decision)** — matches the business: a distinct
  paid engagement with its own lifecycle, scorecard, and credited fee; gates managed
  services cleanly.
- **Reuse `opportunity` with a type flag** — rejected: an opportunity tracks a sales
  motion with MRR, not a six-dimension scored engagement with a one-time credited fee.
- **Reuse `proposal`** — rejected: a proposal is a document moving draft→accepted, not
  a scored deliverable.
- **Six ratings as a child `assessment_finding` table** — deferred: cleaner for
  per-finding text and history, but the six dimensions are fixed and columns keep the
  first cut simple. Revisit when per-dimension findings/evidence are needed.

## Decision

Model the assessment as a first-class **`assessment`** entity (migration
`0010_assessment.sql`):

- **Belongs to one `account`** (`account_id NOT NULL`, cascade); optionally references
  the `opportunity` that sold it (`ON DELETE SET NULL`).
- **`status`** (`assessment_status`): `proposed → scheduled → in_progress → delivered →
  closed`. `delivered_at` is derived from the status transition (stamped on
  delivered/closed, preserved once set).
- **One-time `fee_amount`** plus **`credit_to_onboarding`** (default true) — the fee is
  credited toward onboarding on conversion. This is deliberately separate from
  recurring managed-services MRR (`opportunity.amount_mrr`); the two money types must
  not be conflated.
- **The six-dimension scorecard** as six `assessment_rating`
  (`at_risk|needs_work|solid|strong`) columns: Identity, Endpoint, Network
  Segmentation, Email & Collaboration, Backup & Recovery, Incident Readiness — the
  exact dimensions and ratings from the deliverable.
- **`top_priorities`**, **`recommendation`**, **`report_url`** (deliverable pointer),
  **`notes`**, **`kickoff_at`**.

The six dimensions/ratings live in one shared module (`src/lib/assessment.ts`) used by
both the data mapping and the UI scorecard, so the names stay canonical in one place.
The **remediation roadmap is NOT stored here** — it is realized as the delivery
`project`'s milestones (ADR-0020).

## Consequences

### Security impact

No new internet-facing surface in the web tier. Writes go through server actions behind
the Entra gate (ADR-0002); the scanning/agent/phishing workloads that generate scores
are external services with their own credentials (ADR-0018). `report_url` is a pointer,
not file content. Access inherits account ownership scoping (ADR-0016). The assessment
itself secures the legal basis (contract) for the deep-dive admin access.

### Cost impact

None beyond Postgres storage. (The assessment is revenue-generating.)

### Operational impact

Adds `0010_assessment.sql` (idempotent, transactional, ADR-0017) and the
`assessment_status` / `assessment_rating` enums; ERD and customer-lifecycle docs
updated. Adds an "Assessments" nav entry between Pipeline and Proposals.

## Future considerations

Per-dimension findings/evidence (child table); auto-create the managed-services
opportunity and apply the fee credit on conversion; tie the assessment's remediation
roadmap to generated `project` milestones; capture the discovery-call eight fields and
qualification verdict on the lead/opportunity; segment-driven nurture wiring; SBR as a
recurring scheduled review on managed accounts.
