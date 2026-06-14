# My Timesheets — employee guide

How an employee logs and attests their weekly time (ADR-0082). The surface is at
**Timesheets** in the left nav (`/timesheets`).

## What it is

A weekly, **Monday–Sunday** timesheet of your own attendance. You enter **Time
Entries** (start/end blocks; duration is calculated, never typed), see a
**Reconciliation** memory-jogger comparing your attended time to the same day's
Autotask ticket time, then **Attest** the week to submit it for approval.

You only ever see and edit **your own** timesheets — the surface is scoped to your
signed-in identity (resolved by email to your employee record).

## The landing — your weeks

Opening **Timesheets** shows a list, not a single week:

- **Active & upcoming** (top): the current week and the next week (plus any earlier
  week you started but haven't submitted). Each tile is **Open week** if you've already
  started it, or **Start timesheet** if not. You don't have to create weeks early — make
  one only when you have time to log.
- **Your timesheets** (middle): a table of every week you've worked — week, attended
  hours, entry count, and status. **Edit** an open week or **View** a submitted one.
- **Status & payments** (bottom): every week you've submitted, shown moving along the
  track **Submitted → Admin approved → Finance approved → Paid**, so you can watch your
  pay progress without asking anyone.

Click any week to open its day-by-day detail.

## Entering time

1. **Open a week** from your list, or **Start timesheet** on the current/upcoming tile
   (inside a week, **← Prev / This week / Next →** still navigate; **← All timesheets**
   returns to the list).
2. Under each day, fill the inline row: **Start**, **End**, a **Category**
   (`Billable` → tie to an Autotask ticket · `Internal` · `Admin`), an optional
   **Ticket #**, and optional **Notes**. Click **Add**.
3. Remove a block with **Remove**. You can have several blocks per day.

Duration is derived from start/end; a block must be positive length.

## Reconciliation (the memory-jogger)

The right-hand panel lines up, per day, your **attended** time against the same
day's **Autotask allocation** (ticket time), with a verdict:

| Verdict | Meaning |
|---|---|
| **Balanced** (green) | Logged ticket time ≈ attended time (within ~30 min). |
| **Under-logged** (amber) | You attended more than you logged to tickets — an unallocated gap. Soft: attestable. |
| **Over-logged** (red) | More ticket time than attendance — impossible. **Hard: blocks attestation** until cleared. |

Overlapping blocks on the same day are also a **Hard** deviation. (Autotask
allocation appears once that ingestion is live; until then days show "No allocation".)

## Attesting

**Attest & submit week** affirms the entries are your true hours and **locks you
out** — only an admin can edit the week afterward. You can't attest while a **Hard
deviation** is unresolved, or with no entries. After attesting, the week moves to
**Submitted** and on through Approved → Payroll-Approved → Paid (admin/finance
steps, documented separately).

## Security & privacy

You see only your own time. Compensation data (pay rate, classification) is **not**
on this surface — it lives in a separate, payroll-role-gated store and is never
shown to employees, agents, or clients (ADR-0082 §Security).
