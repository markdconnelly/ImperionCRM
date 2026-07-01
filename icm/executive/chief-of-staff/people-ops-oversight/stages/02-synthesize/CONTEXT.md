# Stage 02 — synthesize

**Job:** turn the gather record into a staleness-ranked people-ops picture with
the flags isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Cluster the signals by lifecycle theme (onboarding / offboarding /
   records / requests); collapse duplicates.
2. `[sonnet]` Rank by staleness and exposure — the longest-parked items and the
   ones blocking an employee's start, exit, or request lead.
3. `[sonnet]` Isolate the flags — stalled lifecycle items and anything waiting on
   a human call — each stating the item reference, the age, and what it blocks.

## Outputs

`synthesis.md` — a staleness-ranked people-ops picture (longest-parked leading)
and a separate flag list, each item naming the reference, the age, and what it
blocks — never a comp or personal value.

## Audit

- [ ] Picture is staleness-ranked, longest-parked / highest-exposure leading
- [ ] Every flag names an item reference, its age, and what it blocks
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] No comp, salary, or personal-data VALUE appears anywhere
- [ ] No send/write/actuation occurred — Rachel delegated or parked
