# Vendor/solution evaluation rubric (Mark-editable — how to structure the advisory)

> DEFAULTS authored by the agent 2026-06-27. The rubric for `vendor-eval-advisory`:
> how to structure a vendor/solution evaluation — options, weighted criteria, tradeoffs,
> fit-to-client-need — and the discipline of labeling measured signal vs inference. Mark:
> edit freely; stages cite this, nothing restates it.

## The shape of an evaluation

A vCIO evaluation is a **decision aid**, not a sales sheet. It frames the client's choice
so a human (and the client) can decide:

1. **The need** — what the client is actually trying to solve, in their words and from
   their record (account + strategic context). The need anchors every criterion.
2. **The options** — the candidate vendors/solutions. Vendor facts (products, pricing,
   terms, EOL/risk) arrive from **Vance** — take them as given; never restate them across
   the boundary and never re-derive them here.
3. **Weighted criteria** — the dimensions that matter *to this client*, each weighted by
   how much it matters to *them* (not to Imperion). Typical dimensions below; reweight per
   client, never apply a fixed scorecard blindly.
4. **Tradeoffs** — the honest "this option wins X but costs you Y" for each, not a single
   collapsed score. A number without its tradeoff is not advice.
5. **Fit-to-need** — how well each option meets the framed need, given the client's
   existing stack and constraints.

## Criteria dimensions (weigh to the client's need — don't sum blindly)

| Dimension | Reading |
|---|---|
| Fit to the stated need | does it solve the actual problem, not an adjacent one |
| Fit to the existing stack | integration with what the client already runs (CMDB device concepts, M365/identity) |
| Total cost of ownership | the client's real cost over time — pricing/terms are **Vance's facts**, taken as given |
| Operational burden | what it costs the client's team to run it day to day |
| Risk / longevity | vendor stability, EOL exposure, lock-in (Vance flags vendor risk; you weigh it for the client) |
| Security posture | advisory-only — visibility/posture/risk of the option (guardrail 2); remediation is human/Datto |
| Migration cost | the one-time cost to get from today's state to the option |

## The discipline: signal vs inference

- **Measured signal** = a fact from a source row or a Vance handoff: the client runs X
  (account/strategic record), three escalations point to a capability gap (interaction),
  a vendor EOL is dated (Vance handoff).
- **Inference** = your reading of those signals ("option B fits better because…").
- **Always label which is which.** A fit verdict states the signals that produced it. A
  recommendation without its evidence is not advice (celeste.md guardrail 3).

## Recommendation discipline

- **In the client's interest, not Imperion's revenue.** Recommend the option that best
  serves the client's need. Flag a **non-interest upsell** explicitly — never steer to a
  pricier option to grow revenue (guardrail 4).
- **Advise, never commit, never buy.** Spend, a procurement direction, and the purchase
  itself are **recommendations to a human**, at every level (guardrail 1, dial-proof).
- **Procurement → Vance.** The recommended direction hands to Vance (#1398), who sources
  and procures — and **the buy is human-gated money**. You frame and recommend; you do
  not source, negotiate, or purchase. The pricing/terms boundary is one-way: Vance owns
  those facts; you take them as given and never restate them back across the seam.
- **Security = advisory only.** Posture / risk / recommendations on an option; remediation
  is human / Datto (guardrail 2, MSSP boundary).
