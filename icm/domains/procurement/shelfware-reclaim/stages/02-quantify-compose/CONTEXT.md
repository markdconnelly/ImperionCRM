# Stage 02 — quantify-compose

**Job:** quantify the reclaimable dollars and draft the reclaim recommendation (cancel/downgrade) per candidate.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Shelfware candidates | `shelfware.md` (stage 01 output) | full | the cited candidates to quantify and recommend on |
| Billing consequence | silver `invoice` · `okf:invoice` | invoice lines for the candidate subscriptions | the measured unit cost each candidate actually bills at |
| Pax8 pricing/terms | bronze `pax8_*` (read-only) | candidate subscriptions' price + term | price and commitment term where the invoice mirror is silent |
| Shelfware rubric | `./skills/shelfware-rubric.md` | the $ quantification method | how reclaimable $ is computed, measured vs derived |

## Process

1. `[automation]` Quantify the reclaimable dollars per candidate using the rubric's $
   method — measured unit cost off the invoice mirror / Pax8 pricing, derived
   monthly/annual reclaim totals **labeled measured vs derived**, each figure **citing its
   cost source + as-of date** (A5). Never invent a price — a candidate with no measured
   cost is a noted gap, not an estimate (vance.md §5).
2. `[hybrid]` Draft the reclaim recommendation — **cancel or downgrade** per candidate —
   the way Vance recommends (vance.md §3): the cost, the utilization (or unassignment)
   evidence, and the **rejected alternative** (e.g. why keep-and-reassign was rejected for
   this candidate, or why downgrade beats cancel). Sequence the list by reclaimable $.

## Outputs

`reclaim-rec.md` — the as-of date, per candidate: the recommended action
(cancel/downgrade), the reclaimable $ (measured vs derived labeled, source + as-of), the
utilization/unassignment evidence, and the rejected alternative; plus total reclaimable $
and the carried-forward data gaps.

## Audit

- [ ] Every figure carries its cost source + as-of date; measured vs derived labeled (A5)
- [ ] Every recommendation names the cost, the utilization evidence, and the rejected alternative (vance.md §3)
- [ ] No price invented; data gaps carried forward as gaps, not estimated
- [ ] Draft only — no actuation, no cancel/downgrade, no money commitment emitted
