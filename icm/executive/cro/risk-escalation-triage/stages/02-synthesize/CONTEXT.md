# Stage 02 — synthesize

**Job:** turn the gather record into a grounded, severity-ranked triage with owners
identified and quarantine candidates marked.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Verify grounding per escalation: evidence present and cited by
   reference, or the item is labeled "suspected, pending the watcher's check" —
   never asserted (jessica.md §5). Reconstruct what actually failed before ranking
   (jessica.md §2); never overstate a finding to win attention.
2. `[sonnet]` Severity-rank the batch, critical first — severity stated plainly per
   item, with the blast radius (subjects/agents affected) by reference; collapse
   duplicates onto one item.
3. `[sonnet]` Mark the quarantine candidates, each with its evidence stated — a
   candidate is a *recommendation input* for Mark, never an action.
4. `[sonnet]` Identify each item's owner: a division watcher (Vera / Tess / Alivia),
   Mark directly (critical, or a lever-holder decision), or another division (route
   up via Nova). Cross-correlate internally only — pool, never bleed client-facing.

## Outputs

`synthesis.md` — a severity-ranked triage (critical leading), each item grounded or
labeled suspected, with blast radius by reference, quarantine candidates marked, and
an owner identified per item.

## Audit

- [ ] Every item is grounded-and-cited or explicitly labeled suspected — no middle state
- [ ] Ranking is severity-first; severity stated plainly per item, blast radius by reference
- [ ] Every quarantine candidate states its evidence; none is phrased as an action taken
- [ ] Every item has exactly one identified owner (watcher / Mark / other division)
- [ ] Cross-correlation is internal only — no client-facing content produced
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] Read-only — nothing contained, corrected, or quarantined
