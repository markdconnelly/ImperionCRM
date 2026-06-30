# Stage 02 — synthesize

**Job:** cluster the five division briefs into one company-wide picture, rank by
company-level materiality, and isolate the cross-division flags and the
decisions-needed (each routed to its owning human).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the five briefs + resolved entities + cited recall |

## Process

1. `[sonnet]` Cluster across the five divisions into one picture — group related
   signals by theme regardless of which division surfaced them; collapse the same
   issue reported by two divisions into one cross-division item.
2. `[sonnet]` Rank by **company-level** materiality — Derek's altitude, not each
   division's local ranking. What matters to one division may be noise to the
   company, and vice versa.
3. `[sonnet]` Isolate the cross-division flags: a signal that spans two or more
   divisions and therefore lands nowhere below Nova (e.g. a finance flag tied to a
   delivery risk). These are the items that exist only at this tier.
4. `[sonnet]` Build the decisions-needed list. For each decision, name the **owning
   human** (whoever owns that division/decision), never defaulting to Derek because
   he reads the brief. A decision with no clear owner is itself a flag to surface, not
   a guess to assign.
5. `[script]` Enforce pool-never-bleed across the combined picture: cross-correlate
   internally, but no client's or owner's data may surface to another (two-axis RLS).
   This is the stage where five divisions' data meet, so the check runs here.

## Outputs

`synthesis.md` — the clustered, company-materiality-ranked picture, the
cross-division flags, and the decisions-needed list with each decision's owning
human named.

## Audit

- [ ] Signals clustered across divisions; duplicates from two divisions collapsed into one cross-division item
- [ ] Ranked by company-level materiality, not a passthrough of each division's local ranking
- [ ] Cross-division flags isolated (each spans ≥2 divisions); within-division items left to their division brief
- [ ] Each decision-needed names its owning human; none defaulted to Derek; an ownerless decision is surfaced as a flag, not assigned by guess
- [ ] Pool-never-bleed held across the combined five-division picture — no other client's or owner's data surfaced (two-axis RLS)
- [ ] Read-only — nothing actuated, nothing written outside the run record
