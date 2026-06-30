# Advocacy cultivation (Mark-editable — detect, ask, and hand off)

> DEFAULTS authored by the agent 2026-06-29. The rubric for `reference-cultivation`:
> how to detect a reference-ready account, the consent/scope-of-use ask framing, and the
> Celeste→Belle handoff contract. Mark: edit freely; stages cite this, nothing restates it.
> Reference data by id only — no PII, no client names.

## Detect a reference-ready account

An account is reference-ready when its relationship is genuinely strong — not to
manufacture an advocate:

- **Health** — high account health (`strategic_business_review` / `lead_score`), no open
  major incident or escalation.
- **Tenure** — an established relationship, not a brand-new account.
- **Clean relationship** — recent positive `interaction` sentiment; no churn-save in
  flight, no unresolved dispute.
- **No non-interest flag** — never solicit where it serves Imperion over the client
  (celeste.md guardrail 4).

Cite each signal **with its as-of** date and separate **measured signal** from your
**inference** (celeste.md guardrail 3). A **thin or negative** signal → **park**, never
manufacture an advocate.

## The ask kinds

Pick the ask that fits the account's strength and relationship:

- **Testimonial** — a named quote/endorsement.
- **Reference-case** — a written case study or a willingness to take a reference call.
- **Logo-use** — permission to use the client's name/logo as a customer.

## The consent / scope-of-use ask framing

The solicitation is a **request, never a promise** — advisory, warm, no pressure, **no
commitment** (no roadmap/SLA/pricing/spend/remediation; celeste.md guardrail 1,
dial-proof). Ask **explicitly for the scope of use** (which of testimonial /
reference-case / logo-use, and where it may appear). Consent is the gate:

1. **Consent gate (always).** Assert a current consent basis for the recipient + channel
   before any send (`consent.check`); re-check at send time. The consent ledger is canonical.
2. **The send is human-approved at every rung.** The solicitation is a non-routine,
   relationship-sensitive **first touch** — it parks for a human approval at every rung,
   never auto, and exits only through ADR-0058.
3. **Record consent with scope on agreement.** A `reference` reaches `consented` **only**
   with a recorded `consent_event` carrying the agreed scope of use. A decline is recorded;
   no reference is created.
4. **Opt-out outranks everything.** Stop / unsubscribe / opt-out is honored immediately,
   the ledger is written, and the run ends.

## The Celeste→Belle handoff contract

Celeste owns the **client touch** (detect → draft → consent-gated send → record consent).
On the client's agreement she creates a `reference` at status **`consented`**
(`reference.write`) linked to the account / contact / consent_event with the scope — and
**that record is the handoff to Belle's `advocacy-capture` (Stream 01-O)**.

- The handoff is a **record, not a client-contact path.** Belle captures advocacy from the
  consented `reference` and **never contacts the client** — soliciting an existing customer
  is Belle's refusal floor.
- Belle never receives, and never derives, a client-contact path from this handoff. If a
  reference needs more from the client, it routes **back to Celeste**, never client-direct
  from Belle.
