---
adr: 0073
title: "Marketing automation — journeys, A/B, and lead scoring"
status: accepted
date: 2026-06-12
repo: frontend
summary: "A journey is a single object on the existing workflow substrate (RATIFIED)."
tags: [crm-parity]
---
# ADR-0073: Marketing automation — journeys, A/B, and lead scoring

| Field | Value |
|---|---|
| **Repo** | frontend (schema + builder GUI); backend (journey execution via ICM); local-pipeline (predictive scoring) |
| **Status** | Accepted (2026-06-12 — **ratified by Mark** with refinements: journeys are a **single object** on the existing `workflow`/`workflow_enrollment` substrate; the real missing build is **segments** + contact membership; ICM scale is not a concern at our volumes) |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0061 (ICM business-process automation), ADR-0053 (campaign builders / events / scheduled sends), ADR-0058 (composer sends via approval-gated backend path), ADR-0026 (demand-gen audiences / ad consent), ADR-0024 (lead hooks), ADR-0014 (consent ledger), ADR-0042 (division of labor) |
| **Epic** | #319 · Parent #314 |

## Problem

Campaigns can build an audience and send (ADR-0053), with sends approval-gated through the backend (ADR-0058). What is missing is **automation depth**: multi-step nurture **cadences**, **A/B** testing, **branching journeys** that react to engagement (opened / clicked / replied / no-action), and **predictive lead scoring**. HubSpot workflows and Salesforce/Pardot lead here; without it our marketing is one-shot blasts.

## Context

- **We already have most of the engine.** A `workflow` table + `workflow_enrollment` (one ACTIVE enrollment per `(workflow, contact)`, idempotent via partial unique index) already exist, and `campaign_workflow_autoenroll` (migration 0073) wires campaigns to a workflow on response. ICM (ADR-0061) is the execution framework over this. **Mark's read (ratified): a good chunk is established — do not rebuild it.** A journey is a workflow; reuse `workflow`/`workflow_enrollment` rather than minting `journey_step`/`journey_enrollment` siblings.
- **The journey is a single object.** Steps, branches, and A/B variants are the journey's embedded configuration (jsonb), not normalized child tables — one object to author, version, and reason about. (Ratified by Mark.)
- **The real gap is segments.** Today we have ad `audience` + `audience_member` (migration 0023) — but those are **ad-targeting** sets over aggregated profiles, gated on `ad_targeting` consent (ADR-0026). There is **no general-purpose contact segment** you can build and enroll into a journey. **This is the missing build Mark named:** a `segment` + `segment_member` model and the ability to put contacts into them.
- **Sends are gated (ADR-0058).** Automation must not become a bypass — an automated send crosses the same approval gate as a manual one, governed by the autonomy policy (ADR-0055).
- **Consent exists (ADR-0014/0026).** Enrollment respects communication consent; suppression is not optional. Segment membership for journeys is distinct from ad-targeting consent.
- **Scoring has two regimes.** Rule-based (fit + engagement) is deterministic and explainable; predictive (AI over engagement history) is stronger but opaque and belongs with the rest of our ML in `_LocalPipelineEnrichment`.

## Options considered (the key call)

- **A. New standalone journey engine.** Purpose-built marketing-automation runtime. Familiar shape, but it duplicates ICM's stage/transition/approval machinery, forks the autonomy + audit model, and creates a second thing to operate. Rejected.
- **B. Journeys as workflows on the existing substrate (chosen, RATIFIED).** A journey is a single workflow object on the existing `workflow`/`workflow_enrollment` tables (ICM-executed); steps/branches/A/B are embedded config; enrollment source is a new **segment**. Reuses execution, autonomy dial, approval queue, audit, and the idempotent enrollment we already have; the net-new build is **segments** + marketing step config, not a second engine.
- **C. Buy a marketing-automation SaaS.** Strong features fast, but a second system holding contact + consent data outside our ledger and 360. Rejected — off-strategy vs the AI-first, data-custody posture.

## Decision

1. **A journey is a single object on the existing workflow substrate (RATIFIED).** A `journey` is a `workflow` (ICM-executed, ADR-0061) whose `definition jsonb` holds the ordered steps — **send** (composer template, gated per ADR-0058), **wait** (delay), **branch** (engagement condition), **score** (lead-score delta), **exit** — and, on send steps, the **A/B variant** config. No `journey_step` / `journey_step_variant` child tables: the journey is authored, versioned, and reasoned about as one object. Enrollment reuses **`workflow_enrollment`** (one active per `(workflow, contact)`, idempotent) — no new enrollment table.

2. **Segments are the new build (Mark's named gap).** A `segment` is a general-purpose, named contact set (static or rule-based, mirroring `audience_kind`), with `segment_member` for membership and the UI/ops to **put contacts into a segment** (manual add, bulk, or rule). A journey enrolls from a segment. Segments are **distinct from ad `audience`** (ADR-0026): audiences are aggregated-profile sets gated on ad-targeting consent; segments are CRM contact sets for journeys/comms. Enrollment still honours communication consent + suppression (ADR-0014).

3. **Branch conditions are engagement predicates** — opened / clicked / replied / bounced / no-action-after-wait — evaluated from the interaction timeline (ADR-0011); branches route to different downstream steps ("if-opened → X else Y"). Held as branch-step config in the journey object.

4. **A/B as send-step config.** A send step may declare variants with a split ratio (embedded in the journey `definition`); assignment is sticky per enrollee (recorded on the enrollment), and a winner is chosen by a configured metric after a sample/window, then remaining enrollees get the winner. No separate variant table.

   **As built (#400, builder #399):** the variant model + sticky-split ratios shipped with the builder (#399). Winner *selection* (#400) adds a `winner` variant-key field to the send step in the same `definition` jsonb (no new table, no migration) plus a deterministic largest-remainder split allocator (`allocateSplitPercent` — whole percents summing to exactly 100). Winner selection is **honest-manual / operator-chosen** for now: there are **no live per-variant journey-run metrics** yet (the runner is backend #398 and exposes no run telemetry), so the metric-driven auto-pick from decision 4 is degraded — `variantMetricsAvailable()` is the single source of that truth (currently `false`) and the builder shows an empty-metrics state rather than fabricating open/click rates. Flip that flag and feed real counts when the backend exposes journey-run metrics; the operator promote/demote control stays as the manual override.

5. **Lead scoring: rule-first, predictive-later.** v1 ships a **rule-based** `lead_score` (fit attributes + weighted engagement), explainable and editable, written onto lead/contact and consumed by routing (ADR-0024) and forecasting (#316). A **predictive** score (model over engagement history) is a later slice in `_LocalPipelineEnrichment` (canon: ML lives there), surfaced alongside — never silently replacing — the rule score.

6. **No gate bypass (ADR-0058/0055).** Every automated send is subject to the approval gate and autonomy dial. **Scale is not a concern at our volumes (Mark)** — `auto` mode sends without per-message approval only where the autonomy policy already permits that send class; otherwise sends queue.

**Table sketch (reuse existing where noted; migration number at implementation):**

```sql
-- REUSE: workflow (journey = a workflow row; steps + A/B live in its definition jsonb)
--        workflow_enrollment (one active per (workflow, contact), idempotent — already built)
journey_def jsonb on workflow            -- ordered steps: send/wait/branch/score/exit (+ A/B on send)

-- NEW — the missing build Mark named:
segment (
  id, name, kind text check (kind in ('static','dynamic')),   -- mirrors audience_kind
  rule jsonb null,                        -- for dynamic segments
  created_by, created_at, updated_at, ...
)
segment_member (
  segment_id uuid references segment(id) on delete cascade,
  contact_id uuid references contact(id) on delete cascade,
  added_via text,                         -- manual | bulk | rule
  primary key (segment_id, contact_id)
)
-- a journey references its source segment(s) for enrollment.

lead_score ( id, contact_id fk, score numeric, breakdown jsonb,
             kind text check (kind in ('rule','predicted')), computed_at, ... )
```

## Consequences

- One automation engine for both internal processes and marketing journeys — shared autonomy, approval, audit; no second runtime, no second enrollment table.
- **Segments are reusable beyond journeys** — any contact set you can build and add to becomes available for comms, list views, and reporting, not just nurture.
- Lead score becomes a shared signal: routing (ADR-0024), forecasting (#316), and later conversational-intel risk (#315) read it.
- Net-new build is small: `segment`/`segment_member` + the add-to-segment UI + marketing step config; the journey runtime and enrollment are reused.

## Future considerations

- Predictive lead score (LP model) and send-time optimisation.
- Goal-based journeys (exit on conversion) and journey-level analytics.
- Multi-channel steps (SMS via ACS, social) once those send paths are gated.
