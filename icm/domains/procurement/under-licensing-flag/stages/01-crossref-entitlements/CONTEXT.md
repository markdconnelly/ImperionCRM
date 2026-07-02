# Stage 01 — crossref-entitlements

**Job:** cross-reference license entitlements against what the service catalog says SHOULD be licensed, as of a stated date.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Entitlement facts | silver `license_assignment` · `okf:license_assignment` | entitlements + assigned quantities as of the sweep | what is actually licensed today |
| Client spine | silver `account` · `okf:account` | accounts whose delivered services are swept | attribute each shortfall to its client (or Imperion-self — subject: both, 02-B4) |
| Service catalog | product/service catalog (#1306), versioned, via `pg.read` | the should-be-licensed baseline per delivered service | the standard the entitlements are judged against |
| Exposure rubric | `./skills/compliance-exposure-rubric.md` | exposure classes | what a shortfall is, what a gap is |

## Process

1. `[script]` Fix the **as-of date** and record the **catalog version** in force — every
   comparison in this run cites both (A5); an exposure judged against an unstated catalog
   version is an audit fail.
2. `[automation]` Cross-reference: for each delivered service in scope, compare the
   catalog's should-be-licensed baseline against the actual entitlements on
   `license_assignment` (#1483). Record each shortfall with its evidence line — service,
   catalog requirement (+ version), actual entitlement (+ as-of), delta.
3. `[automation]` Separate **shortfalls** from **gaps** per the rubric: a service the
   catalog does not cover, or a stale/missing entitlement read, is a **noted gap** — never
   an assumed pass, never an assumed exposure (A5 empty→park). Cross-client comparison
   stays internal (A7 pool-never-bleed).

## Outputs

`crossref.md` — the as-of date + catalog version, the shortfall list (service, account,
catalog requirement, actual entitlement, delta, evidence citation per row), and the gaps
noted (uncovered services / stale reads), not guessed.

## Audit

- [ ] As-of date AND catalog version stated on the run and cited on every shortfall (A5)
- [ ] Every shortfall carries its entitlement evidence + delta; gaps noted separately, never guessed into
- [ ] No assumed pass and no assumed exposure where data is missing — parked as gaps
- [ ] Measurement only — no actuation, no buy, no money commitment emitted
