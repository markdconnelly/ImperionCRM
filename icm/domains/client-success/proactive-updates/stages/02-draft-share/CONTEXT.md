# Stage 02 — draft-share

**Job:** draft the share in the relationship voice and assert the consent basis for the recipient + channel.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Subject | `subject.md` (stage 01 output) | full | share kind, client, recipient |
| Sharing rubric | `./skills/sharing-rubric.md` | all | how-to framing, no-commitment line, sensitivity check |
| Recipient | silver `contact` · `okf:contact` | the recipient | name/role for the relationship voice |
| Consent basis | consent ledger · `okf:consent_event` | this recipient + channel | the basis that gates the send |

## Process

1. `[sonnet]` Draft the share in Celeste's relationship voice (warm, business-framed):
   what the client needs to know and why it matters to them, or the asset and how to use
   it. Channel-correct (`send.email` for a notice/how-to, `send.dm` for a short in-channel
   touch). **No commitment text** — no roadmap/SLA/pricing/spend/remediation promise; a
   how-to is enablement, not a commitment (celeste.md guardrail 1, dial-proof).
2. `[script]` `consent.check` the consent basis for this recipient + channel. Basis = none,
   or a prior stop/opt-out, parks with the reason — no draft proceeds to send without a basis.
3. `[sonnet]` Tag the relationship-sensitivity per `sharing-rubric.md`: **routine how-to**
   (may auto at the earned rung) vs **relationship-sensitive / non-routine** (a churn-save,
   an advisory, a first touch → human-approved at every rung).

## Outputs

`draft.md` — the share text, the channel, the consent basis result, and the
relationship-sensitivity tag (routine-how-to / sensitive).

## Audit

- [ ] Draft is in Celeste's relationship voice and channel-correct
- [ ] No commitment (roadmap/SLA/pricing/spend/remediation) appears in the share text
- [ ] Consent basis asserted (a no-basis / opted-out recipient parks, not drafts onward)
- [ ] Relationship-sensitivity tagged (routine-how-to vs sensitive)
