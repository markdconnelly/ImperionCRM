# ADR-0073: Marketing automation — journeys, A/B, and lead scoring

| Field | Value |
|---|---|
| **Repo** | frontend (schema + builder GUI); backend (journey execution via ICM); local-pipeline (predictive scoring) |
| **Status** | Proposed (2026-06-12, scope locked with Mark; journeys-on-ICM is the key call for review) |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0061 (ICM business-process automation), ADR-0053 (campaign builders / events / scheduled sends), ADR-0058 (composer sends via approval-gated backend path), ADR-0026 (demand-gen audiences / ad consent), ADR-0024 (lead hooks), ADR-0014 (consent ledger), ADR-0042 (division of labor) |
| **Epic** | #319 · Parent #314 |

## Problem

Campaigns can build an audience and send (ADR-0053), with sends approval-gated through the backend (ADR-0058). What is missing is **automation depth**: multi-step nurture **cadences**, **A/B** testing, **branching journeys** that react to engagement (opened / clicked / replied / no-action), and **predictive lead scoring**. HubSpot workflows and Salesforce/Pardot lead here; without it our marketing is one-shot blasts.

## Context

- **We already have a workflow engine — ICM (ADR-0061).** ICM executes multi-stage business processes in the backend with a draft→auto autonomy dial and approval queue. A nurture journey *is* a multi-stage process over an audience. `campaign_workflow_autoenroll` (migration 0073) already wires campaigns to a workflow.
- **Sends are gated (ADR-0058).** Automation must not become a bypass — an automated send crosses the same approval gate as a manual one, governed by the autonomy policy (ADR-0055).
- **Audiences + consent exist (ADR-0026/0014).** Enrollment respects ad/communication consent; suppression is not optional.
- **Scoring has two regimes.** Rule-based (fit + engagement) is deterministic and explainable; predictive (AI over engagement history) is stronger but opaque and belongs with the rest of our ML in `_LocalPipelineEnrichment`.

## Options considered (the key call)

- **A. New standalone journey engine.** Purpose-built marketing-automation runtime. Familiar shape, but it duplicates ICM's stage/transition/approval machinery, forks the autonomy + audit model, and creates a second thing to operate. Rejected.
- **B. Journeys as ICM workflows (chosen, recommended).** A journey is an ICM workflow whose enrollment set is a campaign audience and whose steps are sends/waits/branches. Reuses ICM execution, autonomy dial, approval queue, and audit; adds only marketing-specific step types and the enrollment/branch model. One engine, one governance story.
- **C. Buy a marketing-automation SaaS.** Strong features fast, but a second system holding contact + consent data outside our ledger and 360. Rejected — off-strategy vs the AI-first, data-custody posture.

## Decision

1. **Journeys run on ICM (ADR-0061), not a new engine.** A `journey` is an ICM workflow definition; `journey_step` types: **send** (a composer template, gated per ADR-0058), **wait** (delay), **branch** (condition on engagement), **score** (adjust lead score), **exit**. `journey_enrollment` tracks each contact's position, with consent/suppression checked at every send step (ADR-0014/0026).

2. **Branch conditions are engagement predicates** — opened / clicked / replied / bounced / no-action-after-wait — evaluated from the interaction timeline (ADR-0011). Branches route to different downstream steps; this is the "if-opened → X else Y" behaviour.

3. **A/B at a send step.** A send step may declare variants with a split ratio; a `journey_step_variant` records assignment, and a winner is chosen by a configured metric (open/click) after a sample/window, then remaining enrollees get the winner. Assignment is sticky per enrollee.

4. **Lead scoring: rule-first, predictive-later.** v1 ships a **rule-based** `lead_score` (fit attributes + weighted engagement events), explainable and editable, written onto lead/contact and consumed by routing (ADR-0024) and forecasting (#316). A **predictive** score (model over engagement history) is a later slice computed in `_LocalPipelineEnrichment` (canon: ML lives there), surfaced alongside — never silently replacing — the rule score.

5. **No gate bypass (ADR-0058/0055).** Every automated send is subject to the approval gate and autonomy dial. At scale this means a journey in `auto` mode sends without per-message approval *only* where the autonomy policy already permits that class of send; otherwise sends queue.

**Table sketch (migration number assigned at implementation; verify on disk):**

```sql
journey (                                  -- an ICM workflow definition (ADR-0061)
  id, name, audience_id fk, status text, autonomy_mode text, ...
)
journey_step (
  id, journey_id fk, ord int,
  kind text check (kind in ('send','wait','branch','score','exit')),
  config jsonb,                            -- template ref / delay / predicate / score delta
)
journey_enrollment (
  id, journey_id fk, contact_id fk, current_step_id fk,
  status text check (status in ('active','completed','exited','suppressed')),
  enrolled_at, ...
)
journey_step_variant ( id, step_id fk, label, split_pct numeric, ... )   -- A/B
lead_score ( id, contact_id fk, score numeric, breakdown jsonb,
             kind text check (kind in ('rule','predicted')), computed_at, ... )
```

## Consequences

- One automation engine (ICM) for both internal processes and marketing journeys — shared autonomy, approval, audit; no second runtime to secure or operate.
- Lead score becomes a shared signal: routing (ADR-0024), forecasting (#316), and later conversational-intel risk (#315) read it.
- Marketing-specific step types are the main new build; the runtime is reused.

## Future considerations

- Predictive lead score (LP model) and send-time optimisation.
- Goal-based journeys (exit on conversion) and journey-level analytics.
- Multi-channel steps (SMS via ACS, social) once those send paths are gated.
