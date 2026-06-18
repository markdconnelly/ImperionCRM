---
adr: 0099
title: "Manual mileage entry as the v1 interim; full MileIQ External API integration deferred to v2"
status: accepted
date: 2026-06-17
repo: frontend
summary: "MileIQ's External API is paid/partner-gated (#495), so v1 ships manual mileage entry: a new website_mileage bronze (0137, source=website/kind=mileage) the FE can write, normalized into silver expense_item by the cloud pipeline. Miles only (the rate is comp data; $ derived backend-side); an Autotask ticket link is required only when billable. The MileIQ OAuth client is scaffolded (mileiqService, no-op-gated) so v2 is a wiring change. MileIQ credential/ingestion issues move to the v2 Refined milestone."
tags: [expense-tracking]
---
# ADR-0099: Manual mileage entry as the v1 interim; full MileIQ External API integration deferred to v2

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-17 |
| **Cross-references** | ADR-0083 (employee expense tracking & reimbursement) · ADR-0039 (per-source bronze) · ADR-0043 (front end holds no provider key) · ADR-0042 (four-repo boundary) |

## Problem

ADR-0083 chose MileIQ as the mileage source: the on-prem pipeline pulls business-classified
drives into `mileiq_drive` bronze, normalized into silver `expense_item(kind=mileage)`. But the
MileIQ External API is **not self-serve** — credentials are request-gated behind a MileIQ for
Business / Teams subscription, the account is partner-owned, and conversion + application is a
human-coordination prerequisite (gate #495). That gate is a paid/partner blocker on the
go-live critical path, yet employees need to log mileage now for the expense + Monthly-Close
loop to function.

## Context

- The front end writes **bronze only**; silver `expense_item` is merged by the cloud pipeline
  (ADR-0042). So any mileage the FE captures must land in a bronze table the web identity may
  INSERT — `mileiq_drive` is read-only to the FE (pipeline/local-pipeline own it).
- The mileage **rate is comp data** (ADR-0083): the broadly-granted roles may not read it, so a
  mileage row's reimbursement dollar is derived by the backend, never hand-typed.
- Reimbursable and billable are independent legs; the billable leg must be traceable to a client.
- MileIQ's API contract (OAuth 2.1 authorization-code, per-user `drives:read:all`) is already
  documented (`docs/integrations/mileiq-api.md`, #522) and is partner-gated, not technical.

## Options considered

1. **Block on MileIQ.** Wait for gate #495; no mileage capture until then.
2. **Manual mileage entry now + MileIQ API at v2 (chosen).** Ship a manual entry path that writes
   a new `website_mileage` bronze, parallel to `mileiq_drive`; keep the MileIQ API contract +
   front-end scaffolding ready so v2 is a wiring change.
3. **Extend `website_expense_item` to carry mileage.** Reuse the out-of-pocket bronze for mileage
   rows instead of a new table.

### Tradeoffs

- **(1)** keeps the model pure but blocks a go-live-critical capability on a paid/partner gate.
- **(2)** unblocks immediately and preserves ADR-0039 per-source/per-kind bronze discipline (a new
  `website_mileage` is the website-sourced sibling of `mileiq_drive`); cost = one migration + a
  cloud-pipeline merge branch (ImperionCRM_Pipeline#124).
- **(3)** is less new code but muddies "`website_expense_item` = out-of-pocket authoritative" and
  forces kind/shape branching into a table that never had it.

## Decision

Adopt option **(2)**. v1 ships **manual mileage entry**; full MileIQ External API integration
(paid credentials + live drive ingestion) is **deferred to v2 ("Refined" milestone)**.

- **Storage:** new `website_mileage` bronze (migration `0137`, #851), `(source='website',
  kind='mileage')`, with the employee's open-report FK (like `website_expense_item`). The silver
  `expense_item` `source↔kind` CHECK is loosened to admit `(website, mileage)`; the cloud pipeline
  merges it (ImperionCRM_Pipeline#124).
- **Entry (#853):** miles only (the $ is backend-derived — the rate is comp data, so no dollar is
  shown to the employee); reimbursable/billable independent legs; an **Autotask ticket link
  required only when billable** (#852 picker over locally-synced silver `ticket`, no live call).
- **MileIQ scaffolding (#854):** `mileiqService` in the external-service registry (per-user OAuth
  connect + business-drive pull, typed `MileIqDriveWire`), no-op-gated via `callService` exactly
  like `connectionsService`. The front end holds no MileIQ key (ADR-0043).
- **Re-scope:** the MileIQ-credential/ingestion issues (#495, #811) move to the **v2 — Refined**
  milestone; the MileIQ-drives portion of the entry GUI (#487) follows the same path.

## Consequences

### Security impact

No new secret surface — the FE holds no MileIQ key; `mileiqService` only ever calls the backend.
Manual mileage writes are self-scoped (session employee, Open+owned report re-checked under a row
lock) and carry no comp data (`website_mileage` has miles, never the rate). The ticket picker reads
non-comp ticket numbers already visible on the Tickets board.

### Cost impact

Avoids paying for a MileIQ for Business / Teams subscription on the go-live critical path; that
spend moves to v2 when the value (automatic drive capture) is actually wired. One additional bronze
table; negligible storage.

### Operational impact

Like every FE bronze write, a manual mileage row surfaces in the items table only after the
cloud-pipeline silver merge runs (ImperionCRM_Pipeline#124) — the same deploy-dormancy as
out-of-pocket entry, not a regression. Employees gain a working mileage path immediately.

## Future considerations

- v2 wires MileIQ for real: backend #109 (OAuth custody), LocalPipeline #167 (scheduled drive
  pull → `mileiq_drive`), gate #495 (credentials). Setting `INTEGRATION_SERVICE_URL` activates
  `mileiqService` with no FE re-architecture.
- Manual entry can coexist with MileIQ post-v2 (e.g. a forgotten-to-track drive); the two bronze
  sources already normalize into one silver surface.
- The Teams group-admin OAuth tier (beta) could later collapse per-employee onboarding into one
  admin consent (ADR-0083 §future / mileiq-api.md).
