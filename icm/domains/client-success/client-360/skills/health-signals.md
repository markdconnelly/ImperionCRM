# Client health signals (Mark-editable — the signal-vs-inference rubric)

> DEFAULTS authored by the agent 2026-06-27. The rubric for stage 03 of `client-360`:
> how to read account health + churn-risk, and the discipline of labeling measured
> signal vs inference. Mark: edit freely; stages cite this, nothing restates it.

## The discipline: signal vs inference

- **Measured signal** = a fact from a source row: usage down 40% (interaction/telemetry),
  3 escalations this month (ticket), margin eroded (Audrey handoff), no QBR in 9 months
  (strategic_business_review), sentiment dropped (interaction).
- **Inference** = Celeste's reading of those signals ("this account is disengaging").
- **Always label which is which.** A churn flag states the signals that produced it. A
  health verdict without its evidence is not advice (celeste.md guardrail 3).

## Churn-risk indicators (measured signals — weigh, don't sum blindly)

| Signal | Source | Reading |
|---|---|---|
| Usage / login decline | `interaction` / telemetry | disengagement — the quiet client |
| Rising ticket volume or repeat incidents | `ticket` | service friction = relationship risk |
| A major incident | `ticket` | acute relationship risk regardless of trend |
| Margin erosion / AR aging | Audrey handoff (read-only) | commercial strain — context, not a CS action |
| No QBR / stale strategic review | `strategic_business_review` | relationship drift; advisory gap |
| Sentiment drop | `interaction` (comms capture, ADR-0126) | dissatisfaction — corroborate, don't over-read |
| Renewal approaching with any of the above | `opportunity` (`kind=renewal`) | renewal risk → loop Chase |

## Recommendation discipline

- **In the client's interest, not Imperion's revenue.** Flag a **non-interest upsell**
  explicitly — never recommend spend purely to grow revenue (guardrail 4).
- **Propose, never commit.** Roadmap / SLA / pricing / spend / security-remediation are
  recommendations to a human, at every level (guardrail 1, dial-proof).
- **Expansion → Chase.** When you see real expansion value, mint the opportunity and hand
  the close to Chase (the Chase ↔ Celeste seam) — you don't close the transaction.
- **Security = advisory only.** Posture / risk / recommendations; remediation is human /
  Datto (guardrail 2, MSSP boundary).
