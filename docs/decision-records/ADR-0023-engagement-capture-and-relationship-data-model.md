# ADR-0023: Engagement capture & long-term-relationship data model

- **Status:** Accepted
- **Date:** 2026-06-07

## Problem
The discovery call, the paid assessment, and the ongoing Strategic Business Reviews
each generate structured data (questionnaire answers, Televy/M365/Google evidence,
re-benchmarks, ticket history, concerns). It must be: captured **as received** in a
structured form usable downstream; **owned by the company (account)**, not the
contact; **editable** as the discovery/assessment questions change; and **never
duplicated downstream** — instead feeding tickets, opportunities, and projects.

## Context
Builds on the assessment-led lifecycle (ADR-0022,
[customer-lifecycle](../architecture/customer-lifecycle.md)). The discovery script
defines eight captures; the assessment scores six dimensions with deeper evidence; the
relationship is governed by ~quarterly SBRs. Heavy collection (Televy, Graph/Google
pulls, Autotask sync) runs in external functions (ADR-0018); this ADR is about how the
results are **stored and related**. Aligns with the bronze→silver→gold pipeline
(CLAUDE.md §4) and the company-centric spine (ADR-0010).

## Decision

**1. Editable questionnaires as data, not schema.** A versioned `question_template`
(`kind` = discovery | assessment) owns a set of `question` rows (prompt,
`response_type`, options, optional `dimension`, ordinal, required). Questions can be
added/edited, or a new template version cut, **without migrations**. Seeded defaults:
the discovery eight and the assessment evidence set (`0017_seed_questions.sql`).

**2. One normalized answer store.** Every answer is a single row in
`engagement_answer`, keyed UNIQUE on `(engagement_type, engagement_id, question_id)` —
so a captured fact exists **exactly once** and is reused, never copied. Typed value
columns (`value_text/number/bool/json/date`). `answered_by_contact_id` records the
employee who gave it; the engagement itself is account-owned.

**3. Engagements are account-scoped.** `discovery_call` and
`strategic_business_review` both have `account_id NOT NULL`; `contact_id` is nullable
and means "the employee who performed this instance." Discovery holds verdict
(`fit|not_fit|nurture`) and the locked next step; its eight captures live in
`engagement_answer`.

**4. Assessment evidence in a bronze/silver/gold store.** `assessment_artifact` holds
Televy reports/analytics and M365/Google current-state pulls (and external-scan /
phishing-sim output) as `payload_bronze` (raw, as received) → `normalized_silver` →
`summary_gold`, with `blob_ref`/`external_ref`. The summary six-dimension **ratings**
stay on `assessment` (ADR-0022); the granular evidence behind them is artifacts +
assessment answers — no overlap.

**5. SBRs benchmark over time.** `strategic_business_review` references a
`benchmark_assessment_id`; `sbr_dimension_score` re-rates the six dimensions per review
(a time series, not a duplicate); `sbr_ticket` **references** tickets for the period
(no copying). Concerns/summary/next actions captured inline.

**6. Tickets, and provenance feedback.** `ticket` is account-scoped, synced from
Autotask (ADR-0012, raw kept in `payload_bronze`). Downstream records carry **source
FKs** back to the engagement that produced them — `opportunity.source_discovery_id /
source_assessment_id / source_sbr_id`, `project.source_assessment_id / source_sbr_id`,
`ticket.source_assessment_id / source_sbr_id`. "Feed back into" = a pointer to the
origin, never a copy of its data.

## Options considered
- **Typed columns per capture** — rejected: every question change is a migration; can't
  edit questions in-app.
- **One generic EAV answer table keyed by question (this decision)** — editable,
  normalized, single source of truth; the small cost is value-type handling in the data
  layer.
- **Duplicating assessment ratings onto SBR rows** — rejected as duplication; SBR
  re-scores are a separate time series (`sbr_dimension_score`).
- **Linking engagements to the contact** — rejected per the company-centric rule; the
  contact is only the performing employee.

## Security impact
No new internet-facing surface; collection runs in external functions with their own
credentials (ADR-0018). Raw third-party payloads (Televy/Graph/Google/Autotask) land
in `*_bronze` JSONB and may contain sensitive environment data — treated as PII-adjacent
and access-controlled/audited (ADR-0016); `blob_ref` keeps large reports in object
storage, not the row. Answers may include sensitive business detail; same controls.

## Cost impact
Postgres storage for JSONB payloads; large artifacts go to object storage via
`blob_ref`. No new always-on compute.

## Operational impact
Adds migrations `0011`–`0017` (idempotent, transactional, ADR-0017): question catalog +
answers, discovery_call, assessment_artifact, ticket, SBR (+ dimension scores + ticket
links), provenance FKs, and seed questions. ERD gains Diagram 4. A new
`engagements` repository carries the read/write contracts; UI (question editor,
discovery & SBR pages) follows in later PRs.

## Future considerations
The question-editor and discovery/SBR UIs; auto-create opportunities/projects/tickets
from engagement outcomes (wiring the provenance FKs); silver/gold enrichment of
artifacts for agent retrieval (embeddings, §4); SBR scheduling/reminders; mapping
Televy's concrete export once available; per-answer history/versioning if audit needs it.
