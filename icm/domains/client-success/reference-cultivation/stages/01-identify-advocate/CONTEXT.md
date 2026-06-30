# Stage 01 — identify-advocate

**Job:** detect a reference-ready account and choose the ask kind (testimonial / reference-case / logo-use).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Trigger | a reference-ready signal (or a Belle 01-E advocacy-candidate routed here to solicit) | full | the candidate account to evaluate |
| Cultivation skill | `./skills/advocacy-cultivation.md` | all | how to detect reference-ready + pick the ask kind |
| Client | silver `account` · `okf:account` | the referenced account | resolve + confirm the client |
| Recipient | silver `contact` · `okf:contact` | the contact to ask | resolve the recipient |
| Health / tenure | silver `strategic_business_review` · `okf:strategic_business_review`; `lead_score` · `okf:lead_score` | this account | reference-readiness signals (health + tenure) |
| Sentiment | silver `interaction` · `okf:interaction` | recent engagement | recent relationship sentiment; label signal vs inference |

## Process

1. `[haiku]` Read the health/tenure/sentiment signals for the account (`strategic_business_review`,
   `lead_score`, recent `interaction`).
2. `[sonnet]` Score **reference-readiness** per `advocacy-cultivation.md`: high health +
   tenure + a clean relationship + no non-interest flag. Cite each signal **with its
   as-of** date, and separate **measured signal** from your **inference** (celeste.md
   guardrail 3). A **thin or negative** signal **parks** — never manufacture an advocate.
3. `[sonnet]` Pick the ask kind — **testimonial / reference-case / logo-use** — that fits
   the account's strength and relationship.
4. `[script]` Resolve the client `account` and the recipient `contact`. A missing
   resolvable client or recipient ends the run with the reason — never fabricate a subject.

## Outputs

`advocate.md` — the resolved client id + recipient contact id, the reference-readiness
score with each cited signal + as-of, the chosen ask kind, and the signal-vs-inference
note (or a park with the reason).

## Audit

- [ ] Reference-readiness scored from cited signals, each with its as-of date
- [ ] Measured signal separated from inference; a thin/negative signal parked (not advanced)
- [ ] Resolved client `account` id and recipient `contact` id stated (not blank)
- [ ] Ask kind chosen (testimonial / reference-case / logo-use)
