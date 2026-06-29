# Stage 03 — emit-relationship

**Job:** emit the relationship hand-off to Celeste → Stream 08 (terminal).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Close stamp | `close.md` (stage 01 output) | full | the closed-won opportunity ref + attribution |
| Account | silver `account` · `` `okf:account` `` | the won deal's account | the relationship subject Celeste takes over |
| Primary contact | silver `contact` · `` `okf:contact` `` | the linked contact | next-touch context for the relationship hand-off |

## Process

1. `[script]` Guard: proceed only if stage 01 stamped closed-won (fail-closed).
2. `[sonnet]` Assemble the relationship-hand-off context: the account, the closed-won
   relationship state (now an active customer, transaction closed), and the next-touch
   context (primary contact, what was sold, the onboarding-adjacent hand-off note). No
   fabricated commitment, timeline, or price (Chase's guardrail); ground or omit.
3. `[script]` **SEAM → emit the relationship hand-off to Celeste / Stream 08.** A
   **deterministic governed event, NOT a send and NOT a new tool** — Celeste owns the
   active-customer relationship; Chase owned only the transaction within it (the pinned
   Chase↔Celeste seam). Reference Stream 08 as the terminal step; do not duplicate Celeste's
   relationship work here.

## Outputs

`relationship-handoff.md` — the emitted hand-off: account, relationship state, next-touch
context, and the Stream 08 routing. Terminal stage; the run ends with the deal handed to
delivery (stage 02) and the relationship owner (here). #991 (hand-off bus) dormant →
propose-only (A5c).

## Audit

- [ ] Stage 01 stamped closed-won (else parked)
- [ ] Hand-off emitted to Celeste / Stream 08 as the explicit seam (deterministic, not a send)
- [ ] Next-touch context grounded — no fabricated commitment / timeline / price
- [ ] No customer-facing effect; Celeste's relationship work not duplicated here
- [ ] Run closed terminal (delivery + relationship seams both emitted)
