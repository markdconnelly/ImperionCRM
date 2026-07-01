# Stage 02 — synthesize

**Job:** turn the gather record into a slip-ranked delivery roll-up with the
project-vs-reactive collisions and the stalled work isolated as flags.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Rank the portfolio by slip risk — planned vs actual dates, stalled
   provisioning, aged in-flight work — what will miss leading, with the date at
   risk stated per project.
2. `[sonnet]` Detect the collisions: accounts and periods where a heavy reactive
   backlog and active project delivery are drawing on the same capacity — the
   places a slip is being manufactured.
3. `[sonnet]` Isolate the flags — slipping projects, stalled provisioning,
   collision zones — each naming the project/account and the exposure (the date at
   risk, the client impact).
4. `[sonnet]` Cross-correlate the flags against prior Projects/Dispatch activity
   internally only — pool, never bleed; nothing here is client-facing.

## Outputs

`synthesis.md` — a slip-ranked delivery roll-up (what will miss leading) and a
separate flag list, each item naming the project and account, the flag class
(slip / stalled provisioning / collision), and the exposure, and noting any prior
Delivery activity already in motion.

## Audit

- [ ] Portfolio is slip-ranked with the date at risk stated per flagged project
- [ ] Collisions name the account and the period where reactive and project work compete
- [ ] Every flag names the project/account, the class, and the exposure
- [ ] Cross-correlation is internal only — no client-facing content produced
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] Read-only — no plan edited, no date committed, no technician committed
- [ ] No send/write/actuation occurred — Dexter delegated or parked
