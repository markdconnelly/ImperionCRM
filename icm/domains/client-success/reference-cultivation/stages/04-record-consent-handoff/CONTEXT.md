# Stage 04 — record-consent-handoff

**Job:** on the client's agreement, record the consent with scope and hand a consented `reference` to Belle.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Sent | `sent.md` (stage 03 output) | full | the solicitation that was sent + the requested scope |
| Cultivation skill | `./skills/advocacy-cultivation.md` | all | the Celeste→Belle handoff contract (record, not contact) |
| Client agreement | the client's reply (agreement or decline) | full | does a reference get created, and at what scope |
| Consent ledger | consent ledger · `okf:consent_event` | this recipient + scope | record/confirm the agreed scope of use |
| Recipient | silver `contact` · `okf:contact`; silver `account` · `okf:account` | this client | link targets for the reference |

## Process

1. `[script]` On the client's **agreement**, record/confirm the `consent_event` with the
   **agreed scope of use** (testimonial / reference-case / logo-use). No `consent_event`
   with scope = no reference.
2. `[script]` Create a `reference` at status **`consented`** (`reference.write`) linked to
   the `account`, `contact`, and `consent_event`, carrying the scope — **this is the
   handoff to Belle's `advocacy-capture` (Stream 01-O)**. Belle captures from there and
   **never contacts the client**; the handoff is a **record**, not a client-contact path.
3. `[script]` On a **decline**, record the decline (consent ledger), create **no**
   reference, and end — terminal.

## Outputs

`reference.md` — the consented `reference` id at status `consented` (with account /
contact / consent_event refs and the scope), **or** a recorded decline. Terminal stage.

## Audit

- [ ] A `reference` reaches `consented` **only** with a recorded `consent_event` + agreed scope
- [ ] The `reference` is linked to the `account`, `contact`, and `consent_event` with the scope
- [ ] The handoff to Belle is a **record** (`reference` at `consented`), not a client-contact path
- [ ] A decline records the decline, creates no reference, and terminates
