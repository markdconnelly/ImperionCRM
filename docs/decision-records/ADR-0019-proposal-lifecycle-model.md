# ADR-0019: Proposal lifecycle model

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-07 |
| **Cross-references** | — |

## Problem

Model the proposal artifact so the sales motion (CLAUDE.md §1: lead →
qualification → proposal → onboarding) has a first-class, manually editable record
in the GUI, ahead of any external quote feed.

## Context

ADR-0010 reserved a `proposal` table on the delivery axis but did not build it.
The CRM spine (account/contact/opportunity) and manual CRUD for accounts and tasks
already exist. Proposals are the natural next lifecycle stage after the Pipeline
(opportunities). Per ADR-0018 this work is fully in-repo: it is database reads/writes
through the repository abstraction (ADR-0007), no external function required. The
Kaseya Quote Manager feed (ADR-0012) will later generate/augment proposals.

## Options considered

- **Proposal under opportunity (this decision)** — one quote per sales motion; clean
  FK; no conversion step.
- **Proposal under account directly** — rejected: loses the link to the specific deal
  and breaks MRR/stage roll-ups.
- **Auto-advance the opportunity to `won` on acceptance** — deferred: acceptance is a
  proposal event; advancing the opportunity (and creating the onboarding project) is
  business logic better placed in an explicit action/workflow than as a write
  side-effect. Tracked as a future enhancement.

## Decision

A `proposal` row **belongs to exactly one `opportunity`** (`opportunity_id NOT NULL`,
`ON DELETE CASCADE`) — re-selling produces a new opportunity and therefore its own
proposals, consistent with ADR-0010. Status is the `proposal_status` enum
`draft | sent | accepted | declined`. The table carries `amount_mrr` (the quoted
monthly value, which may differ from the opportunity estimate), a `document_url`
pointer to the proposal document in object storage, free-text `notes`, and two
lifecycle timestamps, `sent_at` and `decided_at`.

Timestamps are **derived from the status transition**, not entered by hand: moving
off `draft` stamps `sent_at` (preserved once set); moving to `accepted`/`declined`
stamps `decided_at`; returning to `draft` clears them. CRUD lives in
`crm.{list,get,create,update,delete}Proposal` behind the repository contract, with
the Postgres implementation falling back to mock per call like its siblings.

## Consequences

### Security impact

No new external surface. Writes go through server actions behind the Entra auth gate
(ADR-0002) and the repository layer; `document_url` is a pointer, not file content,
so the web tier stores no proposal documents. Access inherits account ownership
scoping (ADR-0016).

### Cost impact

None beyond Postgres storage.

### Operational impact

Adds migration `0008_proposal.sql` (idempotent, transactional, ADR-0017) and the
`proposal_status` enum. The ERD in `docs/database/data-model.md` is updated to match.

## Future considerations

Acceptance → advance opportunity to `won` and open the onboarding project; proposal
versioning/revisions; generation from the Kaseya Quote Manager feed (ADR-0012);
e-signature status.
