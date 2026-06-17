# Time & Expense — user-test readiness plan (target: 2026-06-14)

[← Operations](README.md) · [Documentation library](../README.md) ·
[Time-tracking UAT script](time-tracking-uat-script.md) ·
[UAT seeding runbook](time-tracking-uat-seeding.md)

---

> **What this is.** The cross-repo *readiness plan* for taking **Imperion Business
> Manager**'s employee time-tracking (ADR-0082) and expense (ADR-0083) features to
> hands-on user testing — what is testable, what is stubbed, and the critical path. It is
> the planning companion to the hands-on [UAT script](time-tracking-uat-script.md) and the
> [seeding runbook](time-tracking-uat-seeding.md). Point-in-time (2026-06-13/14); verify
> live state against git + the prod DB before relying on the tables below.

Cross-repo plan to get **employee time tracking** (ADR-0082) and **employee
expense** (ADR-0083) to hands-on user testing. Grounded in a 2026-06-13 survey of
all four repos plus read-only introspection of the prod database.

## Bottom line

- **Time tracking — testable tomorrow** for the employee → admin path. The schema
  is **already live in prod** and the front-end surfaces are built and wired. The
  payroll/QuickBooks tail is stubbed; that is acceptable for a first test.
- **Expense — not end-to-end tomorrow.** Schema is complete but **zero front end
  exists** (no pages, no data layer, no types). A real test needs the data layer
  (#486) + entry GUI (#487) at minimum, and the migrations applied. A thin
  "employee enters out-of-pocket items + attest" slice is possible if prioritized
  hard; the approval/Autotask/QB/MileIQ tail is days out.

## Verified prod schema state (2026-06-13, read-only introspection)

The recorded "prod at 0079" is **stale**. Actual prod:

| Migrations | Feature | Prod state |
|---|---|---|
| 0001–0084 | core + DNS + sale→delivery | applied |
| **0085–0087** | **time tracking** (employee_profile, pay_rate, timesheet, website/autotask time entry, time_record, time_ticket, time_reconciliation_day + timesheet_payroll_status views) | **applied — live** |
| **0088–0090** | **expense** (expense_report/item, categories, policy, mileage_rate, mileiq_drive, receipts, autotask_expense_report, policy-violation + reconciliation + monthly_close views) | **NOT applied** — Mark-gated #494 |

All seven time tables are **empty** → clean slate; seeding employees is a test
prerequisite. (Migration files are dense 0001–0090, no gaps, idempotent; schema
docs in `data-model.md` are current.)

---

## TIME TRACKING — readiness by repo

| Repo | Component | State | Ref |
|---|---|---|---|
| Frontend | `/timesheets` employee weekly entry + memory-jogger + attest | ✅ built & wired | #464 |
| Frontend | `/timesheets/approvals` admin queue + review + approve/reopen | ✅ built & wired | #465 |
| Frontend | `/timesheets/mappings` employee → Autotask resource + QB vendor | ✅ built & wired | #468 |
| Frontend | payroll-approval (CFO) → Paid-via-QB surface | ❌ not built | #466 |
| Frontend | admin inline correction of a submitted sheet | ❌ not built (reopen→re-attest works) | #477 |
| Backend | idempotent Autotask Time Ticket writer | ✅ implemented | BE #101 |
| Backend | reconciliation #1 — 6-deviation detector | ✅ implemented | BE #105 |
| Backend | reconciliation #2 — payroll vs QuickBooks | ❌ issue only (QB read) | BE #104/#105 |
| Pipeline | Autotask TimeEntry refresh + bronze→silver merge | ✅ implemented | PL #100/#106 |
| LocalPipeline | scheduled Autotask + QB bulk pull | ❌ issue only (seed instead) | LP #164/#165 |

**Gaps that matter for the test:** payroll surface (#466) absent; backend recon #2
(QB) absent. Both are in the *payroll tail* — stub or skip for a first test.
**Acceptable-empty:** allocation corroboration and the deviation list degrade
gracefully to empty if the pipeline/backend aren't reached — the UI still works.

---

## EXPENSE — readiness by repo

| Repo | Component | State | Ref |
|---|---|---|---|
| Frontend | data layer (repo methods + types + tests) | ❌ blocks all UI | #486 |
| Frontend | employee entry GUI (report, receipt upload, drives, policy jogger, attest) | ❌ not built | #487 |
| Frontend | admin approve → Autotask trigger | ❌ not built | #488 |
| Frontend | category-mapping admin / mileage-rate admin | ❌ not built | #489 / #490 |
| Frontend | unified Monthly Close (time + expense finance) | ❌ not built | #491 |
| Backend | policy-violation detector (view) | ✅ ready | BE #107 |
| Backend | Autotask ExpenseReport + receipt writer | ❌ issue only | BE #108 |
| Backend | reimbursement reconciliation (QB bill-payment) | ❌ issue only | BE #110/#111 |
| Backend | MileIQ OAuth custody | ❌ issue only | BE #109 |
| Pipeline | expense bronze→silver merge + MileIQ/QB refresh | ❌ issue only | PL #105 |
| LocalPipeline | MileIQ / QB / receipt-lifecycle scheduled jobs | ❌ issue only | LP #166–169 |
| Ops | apply 0088–0090 · MileIQ creds · receipt storage · QBO scope | ❌ pending | #494/#495/#496/#497 |

**Verdict:** schema-complete, everything above it unbuilt. Not a one-day end-to-end.

---

## Tomorrow's critical path

### Track A — Time tracking (recommended: ship this test)

1. **Seed test data in prod** (tables are empty): 2–3 `employee_profile` rows for
   real Entra test users, a `pay_rate` each, and confirm mappings via
   `/timesheets/mappings`. *(New prep task — file an issue.)*
2. **Confirm the backend deviations endpoint + ticket-writer are reachable** from
   the deployed app, or knowingly accept graceful-empty (deviations blank, approval
   optimistic). No code needed either way.
3. **Decide the payroll tail:** either (a) quick-build the #466 payroll-approval
   surface, or (b) skip it for the test and stub `payroll_approved`/`paid` by hand
   in the DB. Recommend **(b)** for tomorrow.
4. **Write the test script** (employee enters a week → attests → admin approves →
   reopen path → hard-deviation block). *(New prep task — file an issue.)*

Result: a credible employee→admin demo on live prod schema, payroll tail stubbed.

### Track B — Expense (recommended: defer, or thin slice only)

- **Defer** the end-to-end test; it is not achievable cleanly in a day.
- **If a slice is required:** apply 0088–0090 to a test DB (or prod, Mark-gated
  #494) → build data layer #486 → build employee-entry-only #487 (out-of-pocket
  items + policy memory-jogger + attest), with admin/Autotask/QB/MileIQ all
  stubbed. Treat as a UX-feedback session, not a functional test.

---

## What to stub & how to set expectations

| Area | Test approach |
|---|---|
| Payroll approval / Paid (time) | skip surface; set `timesheet.paid_at` manually |
| QB payroll & reimbursement match | mock; no QB read wired |
| Autotask write (time ticket / expense report) | optimistic; verify in Autotask out-of-band or accept request-logged |
| MileIQ mileage | seed `mileiq_drive` rows; skip OAuth |
| Expense admin/finance flow | not present — exclude from scope |

Set the expectation up front: **time tracking is testable through admin approval;
the payroll/QuickBooks tail and all of expense are stubbed or out of scope.**

## New prep tasks to file (issue-first)

1. `chore: seed test employees + pay rates + mappings for time-tracking UAT`
2. `docs/test: time-tracking UAT script (employee→attest→admin approve→reopen)`
3. (optional) `feat: #466 payroll-approval surface` — only if Track A step 3(a)

## Risks

- Backend/pipeline must be deployed and reachable, or the test runs in
  graceful-degraded mode (still demoable, but no real Autotask/recon).
- Seeding/stubbing writes directly to **prod** — keep to test users; no client PII.
- Applying expense migrations to prod is Mark-gated (#494) — do not self-apply.
