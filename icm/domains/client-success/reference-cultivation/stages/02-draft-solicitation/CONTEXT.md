# Stage 02 — draft-solicitation

**Job:** draft the solicitation in the relationship voice and assert the consent basis for the requested scope of use.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Advocate | `advocate.md` (stage 01 output) | full | client, recipient, ask kind |
| Cultivation skill | `./skills/advocacy-cultivation.md` | all | the consent/scope-of-use ask framing, no-pressure/advisory tone |
| Recipient | silver `contact` · `okf:contact` | the recipient | name/role for the relationship voice |
| Consent basis | consent ledger · `okf:consent_event` | this recipient + channel | the basis that gates the send |

## Process

1. `[sonnet]` Draft the solicitation in Celeste's relationship voice (warm,
   business-framed, advisory): **what we'd ask** (per the stage-01 ask kind) and **the
   scope of use** we're requesting (e.g. named testimonial, reference-case study,
   logo-use). Channel-correct (`send.email` for a request, `send.dm` for a short
   in-channel touch). **No commitment, no pressure** — a solicitation is a request, never
   a roadmap/SLA/pricing/spend/remediation promise (celeste.md guardrail 1, dial-proof).
2. `[script]` `consent.check` the consent basis for this recipient + channel. Basis =
   none, or a prior stop/opt-out, parks with the reason — no draft proceeds to send
   without a basis.

## Outputs

`solicitation.md` — the drafted solicitation text, the channel, the **requested consent
scope** (testimonial / reference-case / logo-use), and the consent-basis result.

## Audit

- [ ] Draft is in Celeste's relationship voice, advisory and channel-correct
- [ ] No commitment (roadmap/SLA/pricing/spend/remediation) and no pressure in the text
- [ ] Requested consent **scope of use** stated explicitly
- [ ] Consent basis asserted (a no-basis / opted-out recipient parks, not drafts onward)
