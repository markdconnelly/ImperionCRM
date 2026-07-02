# Workflow: deadline-sentinel (procurement v1)

**Job:** watch every vendor renewal and cancellation-window clock — client vendor agreements
AND Imperion's own subscriptions — and guarantee that **no deadline passes unseen**: a timely
alert (deadline + dollars + inaction consequence) with a drafted renew/cancel recommendation,
routed to the human who owns the decision. Realizes **02-B1**
(`docs/workflows/streams/02-lead-cash.md`, leaf #1481, archetype **B9 deadline-sentinel**) —
Vance's highest-value procedure.

**Trigger:** schedule — a subscription/agreement approaching auto-renew or its
cancellation-window close, watched over Pax8 bronze + `license_assignment` + `contract` at
the policy lead times (T-30 / T-7 / T-1, `deadline-rubric.md`). One run per sweep.

**What this is NOT — NOT THE BUYER.** Vance watches, quantifies, drafts, and routes; he
**never actuates a renew, cancel, or buy** — a deadline, however close, never licenses an
autonomous commitment (B9; room.md structural rule 1). Every renewal/cancellation actuation
is architecturally `always_gate` (ADR-0109, migration 0184) — no dial setting unlocks it —
and executes only through the **governed procurement sequence** (02-B2, leaf #1487), after a
human approves at the money gate. A passed deadline is a **logged escalation failure**
surfaced in the owning C-suite synthesis-brief — never a license to act.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | watch-deadlines | Read every renewal/cancellation clock at the lead-time ladder; cite each date + as-of | — |
| 02 | quantify-draft | Raise the timely alert (deadline + dollars + consequence, urgency per A6); draft the renew/cancel rec | — |
| 03 | route-notify | Route the alert + rec (client renewals → Chase 02-A7); escalate unanswered up `reports_to` | **Deadline-owner decision loop** |

## Autonomy

Watch/flag/draft; **tops out at L2** for this workflow (the day-job rung, room.md). Default
rung **L1** (draft the alert + recommendation → park); every procedure **ships at L0**
(ADR-0136 A3 ship-dial) and climbs only on earned autonomy. At **L2**, the alert + drafted
recommendation **auto-raise and auto-route** (internal, reversible — an alert can be
dismissed), and escalation climbs `reports_to` (Sterling, room.md) on silence. At NO rung
does this workflow renew, cancel, buy, or place an order — the commit is `always_gate`
(0184) and belongs to 02-B2. Every date and dollar carries its source and **as-of date**
(A5); urgency is computed, never asserted (A6).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `deadline-rubric.md` (the T-30/T-7/T-1 lead-time
ladder, the A6 urgency computation, and the sentinel-never-actuates rule). Mark-editable;
stages cite, never restate. Rules of the format: `../../../CONVENTIONS.md`. The structured
manifest is `agent.yaml`; the composed prose is `prose.md`.
