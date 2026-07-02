# Stage 02 — quantify-draft

**Job:** raise the timely alert for each due clock — deadline + dollars + inaction consequence, urgency computed — and draft its renew/cancel recommendation.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Due clocks | `deadlines.md` (stage 01 output) | the due set only | the deadlines to quantify and draft against |
| Utilization facts | silver `license_assignment` · `okf:license_assignment` | assigned-vs-entitled counts on the due agreements | the utilization side of the recommendation |
| Cost / terms | `bronze pax8_*` (read-only) | current price, quantity, and term on due subscriptions | the dollars at stake (Pax8 = SoR, room.md) |
| Deadline rubric | `./skills/deadline-rubric.md` | urgency computation + recommendation shape | how urgency is computed (A6) and what a complete rec carries |

## Process

1. `[automation]` For each due clock, raise the **timely alert**: the deadline, the dollars
   at stake, and the **inaction consequence** (auto-renew = money committed by silence;
   window close = the cancel option lost) — **urgency computed per A6** from the ladder
   rung, the dollars, and the consequence class (`deadline-rubric.md`); a closing
   cancellation window is urgent. Urgency is computed, never asserted. Every figure cites
   its source + as-of (A5).
2. `[hybrid]` Draft the **renew/cancel recommendation** for each alert (the easy-button,
   pre-staged for the human decision): the cost, the utilization, and the **rejected
   alternative**, each with its source + as-of (vance.md §3). Missing cost or utilization
   data is an **escalated gap**, never an estimate — a wrong number here spends real money
   (vance.md §5). The draft is a recommendation only; the commit path it points at is the
   governed procurement sequence (02-B2), behind its money gate.

## Outputs

`alert-rec.md` — per due clock: the alert (deadline, dollars, inaction consequence, computed
urgency + its inputs) and the drafted renew/cancel recommendation (cost · utilization ·
rejected alternative, each cited + as-of); any escalated data gap, noted — not estimated.

## Audit

- [ ] Every alert carries deadline + dollars + inaction consequence; every figure cites source + as-of (A5)
- [ ] Urgency computed per A6 (inputs shown), never asserted
- [ ] Every rec carries cost + utilization + rejected alternative, or the gap escalated — never estimated into
- [ ] No actuation / no money commitment emitted (the rec is a draft; renew/cancel/buy stays `always_gate`, 0184)
