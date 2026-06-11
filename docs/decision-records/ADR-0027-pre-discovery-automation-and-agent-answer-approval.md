# ADR-0027: Pre-discovery automation & agent-answer human approval

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-07 |
| **Cross-references** | — |

## Problem

Before a salesperson runs a discovery call, as much of the discovery data as possible
should already be gathered — by chat/text/email outreach and agent enrichment — so the
human call confirms rather than collects. The salesperson must then **confirm and stamp**
the agent-gathered answers and decide fit: a fit advances to the assessment, a not-fit
drops back into the nurture workflow. The existing answer store has no notion of *who*
produced an answer or whether a human approved it.

## Context

Builds on the engagement capture model (ADR-0023: editable questionnaires, one
normalized `engagement_answer` per question, discovery verdict `fit|not_fit|nurture`),
the consent ledger (ADR-0014), and the enrichment dossier (ADR-0025). Nurture and
pre-discovery sequences are modelled in-app; Power Automate only fires the actual
send/notify (CLAUDE.md §3).

## Options considered

1. Add provenance + approval columns to `engagement_answer`, and model sequences as
   `workflow` → `workflow_step` → `workflow_enrollment` (this decision).
2. A separate `agent_answer` table merged at display time (rejected — two sources of
   truth for one captured fact; breaks the "stored once" rule of ADR-0023).
3. Free-form agent notes with no structured approval (rejected — no human stamp,
   no auditable gate before the verdict).

### Tradeoffs

- (1) one answer row, now carrying `source` (human|agent|automation), `confidence`,
  `status` (draft|confirmed|rejected), and an approval stamp — backward-compatible
  (existing answers default human/confirmed). Reuses the EAV store. Small added gate
  logic in the UI.
- (2) duplicates the answer; (3) is indefensible and unstructured.

## Decision

- Extend **`engagement_answer`** with `source`, `confidence`, `status`,
  `approved_by_user_id`, `approved_at` (migration `0025`). Agent/automation answers
  land as `draft`; the salesperson **confirms** (stamp) or **rejects** each before the
  discovery verdict is locked. `confirmAnswer`/`rejectAnswer` carry the stamp.
- Model automation as **`workflow`** (kind = nurture | pre_discovery | re_engagement),
  **`workflow_step`** (send_email | send_sms | chat_prompt | agent_enrich | wait |
  branch), and **`workflow_enrollment`** (migration `0024`).
- The fit decision wires existing provenance: **fit → spawn an assessment**
  (ADR-0023 provenance FKs); **not_fit → enroll the contact in a nurture workflow**.
- Agent execution (running the steps, generating draft answers) lands in external
  functions (ADR-0018); this scaffold defines the store, the approval gate, and the
  routing.

## Consequences

### Security impact

Every confirmed answer records the approving user and time (auditable, ADR-0016).
Outreach steps that send are consent-gated (ADR-0014). Agent-drafted facts are never
treated as truth until a human stamps them.

### Cost impact

Negligible storage. Agent/LLM and send volume accrue when execution is wired.

### Operational impact

Adds migrations `0024` (workflows) and `0025` (answer provenance). The `engagements`
repository gains `confirmAnswer`/`rejectAnswer`; a `workflows` repository carries
list/enroll/exit. The discovery UI (agent-answer review + confirm/stamp, fit/nurture
routing) follows.

## Future considerations

The workflow execution engine and step runners; chat/SMS/email channel integrations;
draft-answer generation and confidence calibration; branching/conditional steps;
per-answer history if audit needs it.
