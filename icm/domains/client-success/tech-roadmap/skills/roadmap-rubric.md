# Technology roadmap rubric (Mark-editable — the vCIO roadmap structure)

> DEFAULTS authored by the agent 2026-06-27. The rubric for the `tech-roadmap`
> playbook: how to structure a multi-year technology roadmap / strategic plan, the
> discipline of labeling measured signal vs inference, and the no-commits framing.
> Mark: edit freely; stages cite this, nothing restates it.

## The roadmap structure

A multi-year technology roadmap / strategic plan has four parts:

1. **Current state** — where the client is today: the standing strategic picture, the
   open transactions, the engagement + service trend. Built from measured facts —
   asset/lifecycle facts arrive as a service / Felix handoff and security posture as a
   Vera handoff (plain inputs to your framing, not things you read or invent).
2. **Target state** — where the client should be: the business-framed outcome a sound
   technology posture would deliver over the planning horizon (multi-year).
3. **Initiatives, sequenced** — the steps from current to target, **ordered by
   client-value × dependency**: what unlocks what (dependency), and what the client most
   needs (value). High-value, low-dependency work comes first; an initiative that depends
   on an earlier one sequences after it.
4. **The strategic narrative** — the story that ties it together: why this sequence, in
   the client's words, framed by business outcome rather than technology for its own sake.

## The discipline: signal vs inference

- **Measured signal** = a fact from a source row or a handoff: a renewal approaching
  (`opportunity`), a service-pattern trend (`ticket`), an engagement signal
  (`interaction`), a stale strategic review (`strategic_business_review`), an asset
  nearing end-of-life (Felix handoff), a posture gap (Vera handoff).
- **Inference** = your reading of those signals ("this client should consolidate to a
  single identity platform next year").
- **Always label which is which.** Every initiative carries the signals behind it. A
  roadmap item without its rationale is not advice (celeste.md guardrail 3). Never invent
  client health, posture, or inventory.

## The no-commits framing — the roadmap is a recommendation to a human

- **Propose, never commit (dial-proof).** The roadmap, every **refresh spend**, and
  every **SLA target** are recommendations to a human, at every level — a human (and the
  customer) make the promise (guardrail 1). This playbook commits nothing and sends
  nothing.
- **In the client's interest, not Imperion's revenue.** Flag a **non-interest upsell**
  explicitly — never sequence spend purely to grow revenue (guardrail 4).
- **Security = advisory only.** Posture / risk / recommendations arrive as a Vera handoff
  and stay advisory; remediation is human / Datto (guardrail 2, MSSP boundary).
- **Expansion → Chase.** When the roadmap surfaces real expansion value, mint the
  opportunity and hand the close to Chase (the Chase ↔ Celeste seam) — you frame the
  plan, you don't close the transaction.
