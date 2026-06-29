# Stage 02 — consent-gate

**Job:** hard-filter the recipient list per recipient — CAN-SPAM, opt-out, and
frequency caps — dropping every non-consented recipient before the send is proposed.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brief | stage 01 output | all | the built send + the resolved recipient basis |
| Recipients | `` `okf:contact` `` | the resolved recipient set | the people to check consent for |
| Consent state | `` `okf:consent_event` `` | each recipient | opt-in/opt-out + CAN-SPAM basis, authoritative |
| Send history | `` `okf:campaign_send` `` | recent sends to these recipients | frequency-cap evaluation |

## Process

1. `[script]` For **each recipient**, check `consent_event`: a valid opt-in / CAN-SPAM
   basis and **no** standing opt-out. A non-consented or opted-out recipient is
   **dropped** from the send list — a hard filter, not advisory.
2. `[script]` Apply the **frequency cap** per recipient against recent `campaign_send`
   history; a recipient over cap is **dropped** (or deferred), not sent again.
3. `[script]` Produce the filtered send list (consented ∩ within-cap). If a consent
   check cannot be evaluated for a recipient, **exclude** that recipient — never send on
   an unknown consent state. A systemic consent-source failure → **park**.

## Outputs

`consented-list.md` — the filtered recipient basis (counts: eligible vs dropped, with
drop reason category: opted-out | no-consent | over-cap | unverifiable), and the
consent/cap as-of. No row-level PII — counts and categories only.

## Audit

- [ ] Consent checked per recipient against `consent_event` (no list-level shortcut)
- [ ] Opted-out / non-consented recipients dropped (hard filter, not advisory)
- [ ] Frequency cap applied per recipient; over-cap recipients dropped/deferred
- [ ] Unverifiable consent → excluded, never sent on an unknown state
- [ ] Drop reasons recorded as categories + counts; no row-level PII in the output
