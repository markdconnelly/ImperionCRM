# Stage 03 — route-notify

**Job:** route each alert + drafted recommendation to its decision owner, and climb the escalation ladder until answered.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Alerts + drafted recs | `alert-rec.md` (stage 02 output) | full | what routes, and with what urgency |
| Client spine | silver `account` · `okf:account` | owning account per due agreement | client-contract renewal vs Imperion-self — picks the route |
| Deadline rubric | `./skills/deadline-rubric.md` | routing + escalation ladder | who owns each decision, when an unanswered rung climbs |

## Process

1. `[automation]` Route each alert + rec to its decision owner: a **client-contract
   renewal** seams to **Chase (02-A7)** — the client-renewal conversation is his, Vance
   supplies the numbers [→ **SEAM** Chase]; an **Imperion-own subscription** routes to the
   budget owner up Sterling's line (room.md). Routing is internal notification only —
   nothing external is sent from this workflow.
2. `[automation]` Notify at each lead-time rung (T-30 / T-7 / T-1); an **unanswered rung
   escalates up `reports_to`** (Sterling, room.md) with the urgency recomputed per A6 for
   the tighter rung.
3. `[automation]` A **passed deadline is a logged escalation failure**: record it and
   surface it in the owning C-suite synthesis-brief. It is **NEVER a license to actuate**
   (B9; room.md structural rule 1) — the renew/cancel/buy stays `always_gate` (0184) in the
   governed procurement sequence (02-B2) no matter how the clock ended.

## Outputs

`routing.md` — per alert: the route taken (Chase seam / budget owner) + when, the escalation
state per rung (answered / climbed), and any logged escalation failure with the passed
deadline cited + as-of. Terminal stage; ends parked with the deadline's decision owner.

## Audit

- [ ] Every alert routed with route + timestamp; client renewals seamed to Chase (02-A7), not handled here
- [ ] Unanswered rungs escalated up `reports_to`; every date cited + as-of (A5)
- [ ] Any passed deadline logged as an escalation failure and surfaced — never acted on
- [ ] No actuation / no money commitment emitted; nothing sent externally (sends are ADR-0058, not this workflow)

## Checkpoint

The deadline-owner decision loop: a human (Chase's client conversation, or the budget owner)
decides renew vs cancel off the drafted recommendation; the decision **executes only through
the governed procurement sequence** (02-B2) behind its `always_gate` money gate (0184).
**`auto` (L2) may self-approve raising, routing, and escalating the alert + drafted rec
ONLY** — there is no renew, cancel, buy, or order in this workflow's catalog at any rung
(sentinel, not buyer — room.md; vance.md §6).
