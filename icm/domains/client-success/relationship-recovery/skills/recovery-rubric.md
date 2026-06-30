# Acute relationship-recovery rubric (Mark-editable — the recovery posture, the touch, the routing)

> DEFAULTS authored by the agent 2026-06-29 (issue #1693). The rubric for
> `relationship-recovery`: choosing the **recovery posture** for an acute relationship
> rupture, the **executive recovery touch + save-plan** playbook, and the **NO-COMMITS
> routing** (which binding asks leave this workflow, and to whom). Mark: edit freely;
> stages cite this, nothing restates it. The churn / health **indicators** are NOT restated
> here — they live in
> [`../../client-360/skills/health-signals.md`](../../client-360/skills/health-signals.md);
> this skill is the *acute-save* layer on top of that *read-it* layer. 💤 dormant until
> #991 + #1369/#1370.

## First principle: signal vs inference (cite, don't re-derive)

Read the incident + relationship per `health-signals.md`: separate **measured signal** (a
fact from a source row — the major-incident / SLA-breach `ticket`, a sentiment drop in
`interaction`, a string of failures) from **your inference** (your reading of the rupture's
severity). **Every recovery read carries the signals that produced it** (celeste.md
guardrail 3). You never invent client dissatisfaction to justify a touch.

## Recovery posture — how acute is the rupture

| Posture | When | What happens |
|---|---|---|
| **Reassure** | a single SLA breach, contained, no exec heat, sentiment intact | a measured executive touch acknowledging the miss + the save plan; track |
| **Recover** | a major incident / SEV1, or repeated failures, with a real relationship signal (sentiment drop, escalation) | the full executive recovery touch + save plan; the default acute posture |
| **Escalate / re-seam** | the right response is a credit, an SLA change, a remediation, a price concession, or a security action | route the binding ask (see NO-COMMITS routing below) — never promised in this workflow |

When in doubt between **Reassure** and **Recover**, treat it as **Recover** — the cost of an
over-attentive executive touch is low; the cost of under-reacting to a relationship at risk
is the account.

## The executive recovery touch + save-plan playbook

- **Executive recovery touch** = a warm, **accountable**, business-framed message in
  Celeste's relationship voice (celeste.md): name the incident honestly, own the impact in
  human terms, and signal a plan and a path back to trust. It **acknowledges and asks**, it
  does not **promise**. Pitched to the exec/decision contact, consent-gated, no commitment.
- **Save plan** = the relationship steps to repair trust — a recovery call, the open
  questions, the watch-items, the strategic re-frame from the `strategic_business_review`.
  Relationship steps only; it **carries no binding line**.
- **Both:** in the client's interest, business-framed, Celeste's voice. Surface the at-risk
  relationship + its signals to the cockpit so a human has the whole context. Because this is
  acute + executive, **a human co-shapes and approves the send — always** (the Teams loop).

## NO-COMMITS-EVER (dial-proof — the hard line of a recovery)

The recovery touch and save plan **can never promise** a credit, an SLA change, a price
concession, a refund, a remediation, or a roadmap item. Those are **binding commitments** —
they park for a human at every rung, no exceptions (celeste.md guardrail 1, extends
ADR-0109/0121). If the right save *requires* a commitment, the touch **stops at the ask** and
the commitment is **routed**, never softened into a promise:

- **Credit** → **Audrey / 08-P** (SLA-credit) — the only credit path.
- **SLA change** → a **human** (no SLA commitment, celeste.md guardrail 1).
- **Remediation** → **Felix / Datto** (MSSP advisory-only, guardrail 2 — you do not remediate).
- **Price concession** → a **human** (pricing per BO-02 §5).

A higher dial widens *autonomy of internal assemble + draft*, never *authority to commit* and
never the *send* — the executive recovery send is human-gated at every rung.

## Consent + non-interest + seam discipline

- **Consent gates every send.** Assert a current consent basis (`consent.check`) before the
  touch; basis `none` → no send, it parks (ADR-0058). Honor non-interest / opt-out.
- **In the client's interest, not Imperion's revenue** (guardrail 4). A recovery is a
  *relationship* repair, never a disguised upsell. Real expansion value is a **separate**
  opportunity to **Chase** — never folded into a save.
- **Stay in seam.** Felix owns the technical incident and its remediation tracking; you own
  the relationship. Security concern → vCISO advisory (no remediation, guardrail 2). The
  transaction is Chase's; the binding promise is a human's.
