# Churn-risk intervention rubric (Mark-editable — when to intervene, and how)

> DEFAULTS authored by the agent 2026-06-27. The rubric for `health-intervention`:
> when a churn-risk signal warrants an **intervention** vs a **watch**, the save-outreach
> playbook (routine vs relationship-sensitive), and the consent + non-interest discipline.
> Mark: edit freely; stages cite this, nothing restates it. The churn **indicators**
> themselves are NOT restated here — they live in
> [`../../client-360/skills/health-signals.md`](../../client-360/skills/health-signals.md)
> (the signal-vs-inference rubric + the churn-indicator table); this skill is the
> *act-on-it* layer on top of that *read-it* layer. 💤 dormant until #1046 + #1369/#1370.

## First principle: signal vs inference (cite, don't re-derive)

Read health + churn per `health-signals.md`: separate **measured signal** (a fact from a
source row — usage decline, rising tickets, a major incident, no recent QBR, sentiment drop,
renewal-at-risk) from **your inference** (your reading of those signals). **Every churn flag
carries the signals that produced it** (celeste.md guardrail 3). You never invent client
health to justify a touch.

## When a churn-risk signal warrants intervention vs watch

| Disposition | When | What happens |
|---|---|---|
| **Watch** | a single soft signal, no corroboration; recent positive contact; the client already has an open human-owned thread | flag + log; no outreach this run — re-evaluate next sweep |
| **Intervene — routine** | a clear, corroborated churn signal of the ordinary kind (usage dip, a service-friction pattern, a quiet client approaching renewal) with **no** commitment implied and **no** sensitivity | draft a routine save outreach (stage 02) → may auto-send at L3 (stage 03) |
| **Intervene — relationship-sensitive** | a major incident / acute dissatisfaction, an exec/escalated relationship, anything where tone or stakes are high, or any signal that *invites* a commitment ask | draft → **parks for a human** in every mode (the Teams loop co-shapes) |
| **Escalate / re-seam** | the right response is an expansion, a security action, or a financial concession | mint expansion → **Chase**; security → **vCISO** advisory; commitment → **human** (never this workflow) |

When in doubt between routine and relationship-sensitive, **treat it as relationship-sensitive**
— the cost of an over-cautious park is low; the cost of a tone-deaf auto-send to a strained
relationship is high.

## The save-outreach playbook

- **Routine save outreach** = a warm, low-stakes relationship touch: acknowledge the signal in
  human terms ("we noticed X — how's it going?"), offer help / a check-in / a knowledge asset,
  open the door to a conversation. It **asks**, it does not **promise**. Consent-gated, no
  commitment, may auto at L3.
- **Relationship-sensitive save outreach** = same warmth, higher stakes (post-incident, an
  unhappy exec, a renewal on the line). Same content rules, but a human co-shapes and approves
  before it leaves — always.
- **Both:** in the client's interest, business-framed, Celeste's voice (celeste.md). Surface
  the at-risk picture to the cockpit either way so a human has the whole context.

## NO-COMMITS-EVER (dial-proof — the hard line of a save)

A save outreach **can never promise** a credit, an SLA change, a price concession, a refund,
a remediation, or a roadmap item. Those are **binding commitments** — they park for a human at
every rung, no exceptions (celeste.md guardrail 1, extends ADR-0109/0121). If the right save
*requires* a commitment, the outreach **stops** and the commitment goes to the human queue; you
do not send a softened promise. A higher dial widens *autonomy of routine touches*, never
*authority to commit*.

## Consent + non-interest discipline

- **Consent gates every send.** Assert a current consent basis (`consent.check`) before any
  outreach; basis `none` → no send, it parks (ADR-0058). Honor non-interest / opt-out — a
  flagged non-interest account is not save-spammed.
- **In the client's interest, not Imperion's revenue** (guardrail 4). A save is a *relationship*
  action, never a disguised upsell. If you see real expansion value, **flag it as a separate
  opportunity to Chase** — never fold a sell into a save, and flag any **non-interest upsell**
  explicitly.
- **Stay in seam.** Security concern → vCISO advisory (no remediation, guardrail 2). Expansion
  close → Chase. The transaction is Chase's; the ongoing relationship is yours.
