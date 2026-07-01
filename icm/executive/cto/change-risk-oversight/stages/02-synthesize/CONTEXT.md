# Stage 02 — synthesize

**Job:** turn the gather record into a risk-ranked change roll-up with the defects —
freeze overlaps, rollback gaps, off-catalog standard changes — isolated as flags.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Rank the in-flight changes by risk — emergency first, then blast
   radius (the CIs and clients behind the change) and window proximity — the
   dangerous change this week leading.
2. `[sonnet]` Detect the defects: a change scheduled into an active or upcoming
   freeze window (a hard always_gate block at Marshall's tier); a normal/emergency
   change whose rollback plan is missing or not signed off; a change typed
   "standard" with no matching catalog entry.
3. `[sonnet]` Isolate the flags — one per defect — each naming the change, the
   defect class, and the exposure (what breaks if it proceeds as scheduled).
4. `[sonnet]` Cross-correlate the flags against prior Change activity internally
   only — pool, never bleed; nothing here is client-facing.

## Outputs

`synthesis.md` — a risk-ranked change roll-up (dangerous change leading) and a
separate flag list, each item naming the change id, the defect class (freeze
overlap / rollback gap / off-catalog), and the exposure, and noting any prior
Change activity already in motion.

## Audit

- [ ] Changes are risk-ranked, emergency and high-blast-radius leading
- [ ] Every freeze overlap, rollback gap, and off-catalog standard change in the gather is flagged
- [ ] Every flag names the change id, the defect class, and the exposure
- [ ] Cross-correlation is internal only — no client-facing content produced
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] Read-only — no change approved, scheduled, or modified
- [ ] No send/write/actuation occurred — Dexter delegated or parked
