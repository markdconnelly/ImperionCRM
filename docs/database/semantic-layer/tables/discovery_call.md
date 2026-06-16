---
type: Silver Table
title: discovery_call
description: Sales discovery engagement with a fit verdict — website system of record; anchors the SBR cadence.
resource: ../../../decision-records/ADR-0023-engagement-capture-and-relationship-data-model.md
tags: [silver, sales, discovery, engagement]
timestamp: 2026-06-15T00:00:00Z
---

# discovery_call

The structured discovery engagement that qualifies a prospect and sets the verdict
(`fit` / `not_fit` / `nurture`). Born silver — website system of record. Governed by
[ADR-0023](../../../decision-records/ADR-0023-engagement-capture-and-relationship-data-model.md);
question/answer capture in `question` / `engagement_answer` (ADR-0027).

## Source of record / authority

**Website system of record.** The `verdict` routes the prospect (fit → assessment/proposal;
nurture → workflow enrollment). `sbr_cadence` seeds the post-sale strategic-business-review
rhythm.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `account_id` | uuid | FK → `account` (ON DELETE CASCADE) — the owning company; the call is account-scoped |
| `opportunity_id` | uuid | FK → `opportunity` (nullable, ON DELETE SET NULL) |
| `contact_id` | uuid | FK → `contact` (nullable, ON DELETE SET NULL) — the client employee on this instance |
| `conducted_by_user_id` | uuid | FK → `app_user` (nullable, ON DELETE SET NULL) — the Imperion rep |
| `template_id` | uuid | FK → `question_template` (nullable) — the question-set version used |
| `status` | text | `scheduled` \| `completed` \| `cancelled` (default `scheduled`) — call lifecycle |
| `held_at` | timestamptz | when conducted |
| `verdict` | enum `discovery_verdict` | `fit` \| `not_fit` \| `nurture` — routes the prospect |
| `verdict_reason` / `next_step` | text | the locked next step |
| `sbr_cadence` | text | `monthly` \| `quarterly` — mandated on the call; seeds the post-sale SBR rhythm |
| `created_at` / `updated_at` | timestamptz | trigger-maintained (`set_updated_at`) |

## Joins

- `account_id` → `account`; `contact_id` → `contact`; `opportunity_id` → `opportunity`.
- `engagement_answer` (polymorphic, `engagement_type='discovery_call'`) holds the captured
  answers.

## Notes

Discovery notes and verdict reasons reference client specifics — keep them out of this
doc; resolve against the live read-only DB.
