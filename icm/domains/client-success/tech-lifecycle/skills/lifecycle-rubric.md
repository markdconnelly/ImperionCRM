# Technology lifecycle rubric (Mark-editable — read EOL, prioritize, advise)

> DEFAULTS authored by the agent 2026-06-27. The rubric for `tech-lifecycle`: how to read
> asset lifecycle / EOL, prioritize refreshes by client-risk × business value, the
> signal-vs-inference discipline, and the vCIO advisory framing. Mark: edit freely; stages
> cite this, nothing restates it.

## Where the asset facts come from (read this first)

The CMDB substrate (`cloud_asset` / `device`) is a **direct read** in client-success's rooms
(#1689) — **but Felix/Service owns it as system of record**. Read those CIs read-only to
ground the estate; never write or correct a CI, and stay strictly within THIS client's CIs.
Cite each asset fact to its CI row. If the CMDB holds no CIs for the client, the estate is
unknown: say so and park the review. Never reconstruct an estate from the relationship rooms
alone, and never fabricate a CI.

## The discipline: signal vs inference

- **Measured signal** = a fact in a source row: a stated EOL/EOS date, a hardware age, an OS
  version past support (`cloud_asset`/`device`), repeat incidents on a named asset (`ticket`),
  warranty lapsed (`device`). Cite its CI / source row.
- **Inference** = Celeste's reading of those facts ("this fleet is aging into risk", "this
  refresh is overdue").
- **Always label which is which.** An EOL flag carries the fact that produced it. A
  lifecycle verdict without its evidence is not advice (celeste.md guardrail 3). Cite each
  asset fact to its `cloud_asset`/`device` CI row so its provenance is visible.

## Lifecycle reading (measured signals — weigh, don't sum blindly)

| Signal | Source | Reading |
|---|---|---|
| Vendor EOL / end-of-support date passed or near | `cloud_asset`/`device` | unsupported = security + reliability risk; refresh candidate |
| Hardware age beyond useful life | `device` | aging — failure + performance risk rising |
| OS / firmware past support | `cloud_asset`/`device` | patch gap = posture risk (advisory; remediation is human/Datto) |
| Repeat incidents on a named asset | `ticket` + `device` | the estate is already costing service friction |
| Warranty / support contract lapsed | `device` | unsupported failure exposure |
| Strategic record names a planned refresh / standard | `strategic_business_review` | align the plan to the client's own roadmap |
| Renewal approaching with aging estate | `opportunity` (`kind=renewal`) | renewal moment to plan the refresh → may loop Chase |

## Prioritization: client-risk × business value

Rank refresh candidates on two axes, not cost alone:

- **Client-risk** — likelihood × impact of leaving the asset as-is: security exposure
  (unsupported/EOL), reliability (age, incident history), compliance/posture gap. Acute risk
  (a critical system EOL) outranks a slow-aging convenience asset.
- **Business value** — what the refresh enables for the client: removes a recurring
  service-cost, unblocks a strategic initiative in the QBR record, restores supportability.
- **Order by risk first, then value.** A high-risk / high-value item leads the plan; a
  low-risk / low-value item is noted, not pushed. State the axis reasoning for each item so a
  human can re-rank.

## Advisory discipline (vCIO framing)

- **Recommend, never commit.** The refresh plan, any spend / refresh-budget, and any
  roadmap / SLA / pricing implication are **recommendations to a human**, at every level
  (guardrail 1, dial-proof). The plan parks; a human decides and commits the spend.
- **In the client's interest, not Imperion's revenue.** Prioritize by the client's risk and
  value, not Imperion's margin. Flag a **non-interest upsell** explicitly — never recommend
  a refresh purely to grow revenue (guardrail 4).
- **Security = advisory only.** Posture / EOL / patch-gap findings are visibility, risk, and
  advice; remediation is human / Datto, and there is no compliance-management in v1
  (guardrail 2, MSSP / vCISO boundary).
- **Expansion → Chase.** When a refresh carries real expansion value (new project, added
  scope), mint the opportunity and hand the close to Chase (the Chase ↔ Celeste seam) — you
  draft the advisory, you don't close the transaction.
