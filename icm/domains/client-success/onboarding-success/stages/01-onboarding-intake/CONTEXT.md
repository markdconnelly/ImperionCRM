# Stage 01 — onboarding-intake

**Job:** receive the Pierce `delivery-complete` handoff, resolve the client, read what
was delivered, and establish the 30/60/90 adoption milestone plan + success criteria.
(💤 dormant until the substrate hydrates — #991 + #1369/#1370, ADR-0123.)

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Pierce handoff | the `delivery-complete` wake event (#991 handoff bus) | this onboarding | what was delivered + the go-live scope to track adoption against |
| Account + contacts | silver `account` / `contact` · `okf:account` `okf:contact` | the newly-onboarded client | resolve the client; who the relationship + check-in is with |
| Relationship + service substrate | silver `interaction` / `ticket` · `okf:interaction` `okf:ticket` | recent history for this account | the go-live baseline (first engagement / first tickets) |
| Adoption rubric | `./skills/adoption-rubric.md` (cites `../../client-360/skills/health-signals.md`) | all | the 30/60/90 milestone model + first-value definition + signal-vs-inference |

## Process

1. `[script]` Read the Pierce `delivery-complete` handoff: the client it names and the
   **delivered scope** (what go-live covered). Resolve the client to `account` + `contact`.
   Stay within THIS client (strict confidential boundary — never read across clients).
2. `[haiku]` Read the go-live baseline from the relationship rooms — the first engagement /
   first tickets that exist at hand-off — as the starting point for the adoption read.
3. `[sonnet]` Establish the **first-30/60/90-day milestone plan** per the rubric, **seeded
   from the delivered scope** (track adoption of *that* scope, not a generic checklist).
   State each milestone's **success criteria as measured signals** so stage 02 is a
   comparison, not a guess.

## Outputs

`onboarding-plan.md` — the resolved client, the delivered scope (from the handoff), and the
30/60/90 adoption milestone plan with per-milestone success criteria (each stated as a
measured signal). The standing baseline for the adoption-track stage.

## Audit

- [ ] Only this client's data was read (no cross-client leakage)
- [ ] A `delivery-complete` handoff was present and the client resolved (else the run parks)
- [ ] The milestone plan is seeded from the delivered scope (not a generic checklist)
- [ ] Each milestone's success criteria are stated as measured signals
- [ ] No outreach drafted or sent here (intake + plan only)
