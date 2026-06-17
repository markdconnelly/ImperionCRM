---
adr: 0010
title: "Company-centric customer data model with dual-axis stages"
status: accepted
date: 2026-06-07
repo: frontend
summary: "`account` is the spine with dual-axis stages: `account.lifecycle_stage` plus per-`opportunity` sales stages."
tags: [crm-core]
---
# ADR-0010: Company-centric customer data model with dual-axis stages

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-07 |
| **Cross-references** | — |

## Problem

Choose the central record and lifecycle representation for the CRM so the
lead → managed-customer → re-sell cycle is modeled without later rework.

## Context

Imperion is an MSP managing businesses (M365/Kaseya). Leads arrive from Facebook
ads (people); customers are companies that, once managed, re-enter sales for upsells
and renewals. A managed customer can have an open new deal at the same time. The
delivery side (onboarding → implementation → operational readiness → handoff,
CLAUDE.md §6) is central to "customer health."

## Options considered

1. **Company-centric Account + many Opportunities**, with two stage dimensions.
2. Separate Lead entity that converts into Account/Contact/Opportunity.
3. Person-centric (B2C) spine.

### Tradeoffs

- (1) fits B2B/MSP: one long-lived Account, Contacts under it, and an Opportunity
  per sales motion so re-selling is just a new Opportunity — no conversion step,
  no duplication. Needs two stage fields, which is the point.
- (2) cleanly separates raw funnel but adds a conversion step and duplicate records;
  awkward when a managed customer re-enters sales.
- (3) wrong for an MSP that sells to businesses.

## Decision

**Company-centric.** `account` is the spine (with a computed `health_score` and a
`lifecycle_stage`); `contact` belongs to it; `opportunity` represents each sales
motion (1 account → many over time). **Two stage dimensions:**
`account.lifecycle_stage` (prospect → onboarding → implementation →
operational_readiness → managed_active) and `opportunity.sales_stage` (lead →
qualified → proposal → won/lost). Inbound FB leads create a Contact (+ tentative
Account) that converts. The **full delivery spine** (proposal, project, milestone,
readiness_item, handoff, task) is modeled now so the post-sale phase needs no
migration. The dashboard's five-stage strip is a read view over these.

## Consequences

### Security impact

Account ownership (`owner_user_id`) underpins row-level scoping (ADR-0016). No new
external exposure.

### Cost impact

None beyond Postgres storage.

### Operational impact

Health-score signal weighting is deferred (Phase 2). Stage enums are seed data and
versioned with migrations.

## Future considerations

Territory/team hierarchies; per-stage SLAs; account merge/dedupe.
