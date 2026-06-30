# Stage 02 — capture

**Job:** format the reference, consent-clean — using only the approved attribution
and in-scope verbatim.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Verified consent | stage 01 output | this candidate | the recorded consent_event + scope of use (the precondition is met) |
| Reference record | `` `okf:reference` `` | this reference | the typed proof record to format and stage |
| Brand voice | `./skills/consent-and-rights.md` · `domains/marketing/skills/brand-voice.md` | all | the rights rules + how marketing copy reads |

## Process

1. `[sonnet]` Format the `reference` (kind: `testimonial` | `review` |
   `reference_case`) using **only the approved attribution** and **verbatim that
   falls within the consent scope** (stage 01). No paraphrase that exceeds scope,
   no fabricated quote, no attribution the consent does not cover.
2. `[script]` `reference.write` stages the record **internally** (L2, reversible).
   Set `status → captured` **only with consent on file** (stage 01 verified it);
   no recorded consent → the run was already parked at stage 01.

## Outputs

`captured-reference.md` — the staged reference (id, kind, account/contact by id,
the in-scope attribution + verbatim, the backing consent_event reference); status
`captured` only with consent on file. Reference data by id, no PII.

## Audit

- [ ] The reference is backed by the stage-01 consent_event; `status = captured`
      only with consent on file
- [ ] Attribution + verbatim are within the consent scope (nothing beyond scope)
- [ ] The write is the INTERNAL `reference.write` (L2, reversible); no external
      send, no client contact
