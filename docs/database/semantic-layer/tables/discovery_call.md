---
type: Silver Table
title: discovery_call
description: Sales discovery engagement with a fit verdict — website system of record; anchors the SBR cadence.
resource: ../../../decision-records/ADR-0023-engagement-capture-and-relationship-data-model.md
tags: [silver, sales, discovery, engagement]
timestamp: 2026-06-14T00:00:00Z
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
| `account_id` | uuid | FK → `account` |
| `opportunity_id` | uuid | FK → `opportunity` (nullable) |
| `contact_id` | uuid | FK → `contact` |
| `conducted_by_user_id` | uuid | FK → `app_user` |
| `template_id` | uuid | FK → `question_template` |
| `status` | text | |
| `held_at` | timestamptz | |
| `verdict` | enum | fit / not_fit / nurture |
| `verdict_reason` / `next_step` | text | |
| `sbr_cadence` | text | seeds the SBR rhythm |

## Joins

- `account_id` → `account`; `contact_id` → `contact`; `opportunity_id` → `opportunity`.
- `engagement_answer` (polymorphic, `engagement_type='discovery_call'`) holds the captured
  answers.

## Notes

Discovery notes and verdict reasons reference client specifics — keep them out of this
doc; resolve against the live read-only DB.
