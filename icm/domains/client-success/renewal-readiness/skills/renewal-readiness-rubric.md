# Renewal-readiness rubric (Mark-editable — readiness dimensions + posture rule)

> DEFAULTS authored by the agent 2026-06-28. The rubric for `renewal-readiness`: the
> dimensions that make a renewal ready (or at risk) and how to pick the recommended
> posture. Mark: edit freely; stages cite this, nothing restates it.

## Readiness dimensions (each a measured signal)

| Dimension | Source | Ready signal | At-risk signal |
|---|---|---|---|
| Health / engagement | `interaction` / telemetry | steady or rising usage | decline, the quiet client |
| Service track record | `ticket` | low friction, SLAs met | rising tickets, a major incident |
| Strategic alignment | `strategic_business_review` | recent QBR, shared roadmap | no QBR, relationship drift |
| Commercial fit | Audrey margin handoff (read-only) | margin healthy | margin eroded |
| Sentiment | `interaction` (ADR-0126) | positive / neutral | dissatisfaction |

## The posture rule (recommend one; show the signals)

- **Renew-as-is** — health + service + margin all ready; no reason to disturb the terms.
- **Uplift** — real, *client-interest* expansion value is present (more seats they need, a
  posture gap worth closing). Mint the opportunity for Chase; do not push an uplift the
  client doesn't need (**non-interest upsell** — flag and decline, guardrail 4).
- **At-risk → save-play** — one or more at-risk signals dominate; recommend a save outreach
  (a parked recommendation for a human) and loop Chase early on the renewal risk.

## Discipline

- **Signal vs inference.** The posture states the signals that produced it (guardrail 3).
- **You don't price or close.** The renewal price + close are Chase's (renewal-reprice),
  gated; Audrey supplies margin; you supply relationship readiness.
- **Propose, never commit** (guardrail 1, dial-proof). **Security = advisory only**
  (guardrail 2).
