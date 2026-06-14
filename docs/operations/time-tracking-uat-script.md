# Time-tracking UAT script (employee → attest → admin approve → reopen)

Hands-on user-acceptance test for employee time tracking (ADR-0082, epic #458).
Walks one tester (with a second admin login) through the **testable** path on the
live app. Companion to the readiness plan (`time-expense-user-test-plan.md`,
Track A) and the seed runbook (`time-tracking-uat-seeding.md`, #511).

## Scope — read this first

- **Testable end-to-end:** employee weekly entry → reconciliation memory-jogger →
  attest (incl. the hard-deviation **BLOCK** case) → admin approve → reopen →
  re-attest → employee mappings.
- **Stubbed / out of scope** (do **not** fail the test on these — see the table at
  the end): payroll-approval + Paid surface (#466), QuickBooks payroll/reimbursement
  match, the actual Autotask Time Ticket write (verified out-of-band or accepted as
  request-logged), and **all of expense**.
- If the backend/pipeline aren't reached, the app runs **graceful-degraded**: the
  per-day reconciliation shows "No allocation" and the typed deviation list is
  empty. The UI still works — that is an expected pass, not a failure.

## Prerequisites

1. **Seed test employees** — Mark runs `scripts/seed-time-uat.mjs` per
   `time-tracking-uat-seeding.md` (#511): 2–3 **test** Entra users, each with an
   `employee_profile` + a `pay_rate`. *(Prod write is Mark-gated; the agent never
   runs it.)*
2. **Two logins:**
   - an **Employee** — any seeded test user (the employee surface is self-scoped;
     `time:write` is held by all roles).
   - an **Admin** — a user with the admin role (`time:approve` + `time:map`;
     same gate as Settings, ADR-0030). May be the same person in two sessions.
3. Each test user must have **signed in once** via Entra SSO so an `app_user` row
   exists (the seed resolves employees by email and skips unknown ones).

## Access map

| Surface | Path | Who |
|---|---|---|
| My timesheets (entry + attest) | `/timesheets` | the employee (self) |
| Time approvals (approve/reopen) | `/timesheets/approvals` | admin only |
| Employee mapping | `/timesheets/mappings` | admin only |

---

## Test cases

Record **PASS/FAIL + note** for each. Steps reference exact on-screen labels.

### TC0 — Seed landed (admin)
1. As **admin**, open `/timesheets/mappings`.
2. **Expect:** each seeded test employee appears as a row (Employee, Email, Autotask
   Resource, QuickBooks vendor, Status). Status is **Unmapped** (amber) until TC7.
   - *If "No employees yet" shows:* the seed hasn't run or the user has no
     `app_user` row — resolve before continuing.

### TC1 — Employee enters a week (employee)
1. As the **employee**, open `/timesheets`. It defaults to the current week; use
   **← Prev / This week / Next →** to pick the test week (Mon–Sun).
2. On a weekday card, fill **Start**, **End**, **Category** (Billable/Internal/Admin,
   default Internal), optional **Ticket #** and **Notes**, click **Add**.
3. Add a few entries across **2–3 different days** (e.g. Mon 09:00–12:00 Billable,
   Mon 13:00–17:00 Internal, Wed 10:00–15:00 Admin).
4. **Expect:** each entry lists under its day as `HH:MM–HH:MM · duration · category`;
   the day header shows the day total; the header subtitle shows total attended.
   A **Remove** link appears on each entry.
   - *Note:* times are entered/shown in **UTC** (v1). End must be **after** Start —
     an invalid range is silently ignored (no entry added).
5. Click **Remove** on one entry. **Expect:** it disappears and totals update.

### TC2 — Reconciliation memory-jogger (employee)
1. In the right-hand **Reconciliation** panel, review the per-day rows.
2. **Expect (graceful-degraded — no pipeline):** each day shows **No allocation**
   and the typed deviation list is empty. *This is a pass.*
3. **Expect (if Autotask allocation data is present):** each day shows
   `attended vs logged` with a verdict — **Balanced** (green), **Under-logged**
   (amber), or **Over-logged** (red).

### TC3 — Hard-deviation BLOCK case (employee)  ← required
The reliably reproducible Hard deviation **without** the pipeline is **two
overlapping blocks on the same day** (the other Hard case, an over-logged day,
requires Autotask allocation data — test it only if that data is present).
1. On one day, add two **overlapping** entries (e.g. **09:00–12:00** then
   **11:00–13:00**).
2. **Expect:** a red note appears — *"A Hard deviation (over-logged day or
   overlapping blocks) must be cleared before you can attest."* — and the
   **Attest & submit week** button is **disabled** (greyed).
3. Confirm the block is also server-enforced: it cannot be bypassed (the attest
   action re-checks and no-ops while a Hard deviation exists).
4. **Clear it:** Remove one of the overlapping entries (or edit so they don't
   overlap). **Expect:** the red note disappears and the Attest button enables.

### TC4 — Attest & submit (employee)
1. With ≥1 entry and **no** Hard deviation, click **Attest & submit week**.
2. **Expect:** the week state badge flips **open → submitted**; a green
   *"Attested — submitted for approval."* banner shows; the day cards become
   **read-only** with *"This timesheet is Submitted — you attested it and are
   locked out. Only an admin can edit it now."* (Add/Remove gone.)
   - *Note:* the Attest button is also disabled with **zero** entries — an empty
     week can't be attested.

### TC5 — Admin approves (admin)  ← documents the week
1. As **admin**, open `/timesheets/approvals`.
2. **Expect:** the attested week appears in the queue (Employee, Week, Attended,
   Entries, Attested date). Click **Review**.
3. **Expect:** a read-only review of the attested entries + per-day reconciliation,
   with **Reopen** and **Approve & document** buttons.
4. Click **Approve & document**.
5. **Expect:** the sheet leaves the queue; its state moves to **Approved**. Approving
   also enqueues the **idempotent backend Time Ticket request** (one weekly Autotask
   Time Ticket on the house company).
   - **Stubbed tail:** the actual Autotask write is backend BE-1 — verify in Autotask
     out-of-band if creds are live, otherwise accept the request as logged. **Do not
     fail TC5** on the Autotask write.

### TC6 — Reopen → re-attest (admin + employee)
1. As **admin**, review another attested sheet (repeat TC1/TC4 with a second test
   employee or week if needed) and click **Reopen**.
2. **Expect:** the sheet leaves the approval queue and returns to **open** for the
   employee.
3. As the **employee**, reload `/timesheets` for that week. **Expect:** it is
   **editable again**; correct an entry, then **Attest & submit week** once more.
4. **Expect:** it returns to the admin queue as Submitted — the reopen→re-attest
   loop is closed.

### TC7 — Confirm mappings (admin)
1. As **admin**, open `/timesheets/mappings`.
2. For each test employee, enter the **Autotask Resource id** and **QuickBooks
   vendor id**, then click **Confirm**.
3. **Expect:** Status flips **Unmapped (amber) → Mapped (green)**; the header count
   (`N of M employees mapped`) increments; hovering Status shows who/when confirmed.
   - Email is the read-only join key; this surface never shows comp data.

---

## What to stub & how to set expectations

Mirror of the readiness plan's stub table — state these up front to the tester:

| Area | Test approach |
|---|---|
| Payroll approval / Paid (time) | **not built (#466)** — skip; set `timesheet.paid_at` manually if a Paid demo is needed |
| QB payroll & reimbursement match | mock; no QB read wired |
| Autotask Time Ticket write | optimistic — verify in Autotask out-of-band or accept request-logged |
| Reconciliation allocation / deviation list | degrades to "No allocation" / empty when pipeline/backend off — still a pass |
| All of expense | not in scope — exclude |

**Bottom line to communicate:** *time tracking is testable through admin approval;
the payroll/QuickBooks tail and all of expense are stubbed or out of scope.*

## Cleanup

Test data is removable by deleting the seeded test `employee_profile` / `pay_rate`
rows and any test `timesheet` / time-entry rows (Mark-gated; test users only). No
schema changes are made by this test.

## Result log (fill in)

| TC | Result | Note |
|---|---|---|
| TC0 seed landed | | |
| TC1 entry | | |
| TC2 reconciliation | | |
| TC3 hard-deviation block | | |
| TC4 attest | | |
| TC5 admin approve | | |
| TC6 reopen → re-attest | | |
| TC7 mappings | | |

Refs: epic #458 · ADR-0082 · seed script #511 · `time-expense-user-test-plan.md`.
