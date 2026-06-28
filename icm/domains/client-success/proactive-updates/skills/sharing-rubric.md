# Sharing rubric (Mark-editable — what to share, and how it is gated)

> DEFAULTS authored by the agent 2026-06-27. The rubric for `proactive-updates`:
> what makes an update worth proactively sharing, the knowledge-asset library framing,
> the L3-with-approval vs L4-fully-auto distinction, the consent + relationship-sensitivity
> check, and churn-save framing. Mark: edit freely; stages cite this, nothing restates it.

## Is this update worth proactively sharing?

Share when it **changes what the client should do or know**, in their interest, now —
not to manufacture a touch:

- **Advisory / notice** — a change the client should hear (a posture/risk advisory, a
  service-affecting notice in Celeste's relationship scope). Security work is
  **advisory-only** — visibility, posture, risk, recommendation; remediation is
  human/Datto (celeste.md guardrail 2, dial-proof).
- **Knowledge asset (how-to)** — an enablement how-to from the knowledge-asset library
  (e.g. 1Password, M365) that fits a contact's current need. Enablement, not a sale.
- **Churn-save outreach** — a save touch the client-360 flagged. Label **measured
  signal** vs **inference** (usage decline, rising tickets, stale QBR → "this account is
  disengaging" is your inference; celeste.md guardrail 3). Never invent a churn reason.

Do **not** share: anything that is really a marketing send (Belle), a service-incident
notice (Felix), a non-interest upsell dressed as enablement (flag it, celeste.md
guardrail 4), or anything carrying a commitment (below).

## The knowledge-asset library framing

Knowledge assets are reusable enablement how-tos (1Password, M365, and the like) — the
client-enablement catalogue Celeste draws from. A how-to is **enablement, not a
commitment**: it tells a client how to do something they already have, it does not
promise a roadmap, an SLA, a price, a spend, or a remediation. That distinction is what
lets routine how-tos earn higher autonomy while everything relationship-weighted stays
gated.

## L3-with-approval vs L4-fully-auto (the earned progression)

The manifest rung is capped at **L3** by the schema gate; L4 is the described ceiling
(the full L0–L5 map is celeste.md §"Your autonomy ladder"):

| Rung | What it enables here |
|---|---|
| **L3** (manifest default) | Auto-share an important update + provide a knowledge asset **WITH approval** + routine churn-save outreach — every share consent-gated, sent via ADR-0058. |
| **L4** (described ceiling, not the rung) | Fully-**automatic** sharing of routine **knowledge/enablement how-tos** (1Password, M365, etc.) — no per-send approval for the routine how-to. |

Higher rungs widen *autonomy of routine enablement*, never *authority to commit*.

## Consent + relationship-sensitivity check (every send)

1. **Consent gate (always).** Assert a current consent basis for the recipient + channel
   before any send (`consent.check`); a send with basis = none, or after a stop/opt-out,
   does not go. The consent ledger is canonical.
2. **Relationship-sensitivity gate.** A **routine knowledge how-to** is the only thing
   that may auto-send at the earned rung. Anything **customer-relationship-sensitive or
   non-routine** stays human-approved at every rung: a churn-save outreach, an advisory,
   a first touch to a contact, anything that reads as a relationship moment. When unsure,
   it is sensitive — park it.
3. **Stay in seam.** Never DM beyond Celeste's relationship scope; service-incident comms
   are Felix's, marketing sends are Belle's — coordinate, don't freelance (celeste.md
   §Seams).

## Hard lines (cite, never cross)

- **No commitments, ever.** No roadmap/SLA/pricing/spend/security-remediation promise in
  any share — those are recommendations to a human, at every rung (celeste.md guardrail 1,
  dial-proof).
- **Client-confidential.** One client's data/signals/posture never enter another client's
  share (celeste.md guardrail 5).
- **Opt-out outranks everything.** Stop / unsubscribe / opt-out is honored immediately,
  the consent ledger is written, and the run ends.
