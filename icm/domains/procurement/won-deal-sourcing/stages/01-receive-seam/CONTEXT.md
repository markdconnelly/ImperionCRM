# Stage 01 — receive-seam

**Job:** receive the Chase→Vance seam — the won opportunity's sold line-items — verify it
is actionable, and resolve the owning account; empty or ambiguous parks.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Seam payload | the run trigger — the Chase 02-A6 won hand-off (A11 seam, ADR-0096 spine) | this won deal's sold line-items | what was sold and must now be sourced |
| Won opportunity | silver `opportunity` · `okf:opportunity` | the won opportunity | the record the seam cites — verify it is `won` and what its line-items say |
| Owning account | silver `account` · `okf:account` | the deal's account | who the sourcing is for (client — or Imperion-self on an internal win) |
| Sourcing rubric | `./skills/sourcing-rubric.md` | seam-intake + subject rule | what an actionable line-item set looks like; when to park |

## Process

1. `[script]` Receive the seam payload [← Chase 02-A6] and verify it against the
   `opportunity` record: the deal is `won`, and the payload's line-items match the
   opportunity's sold line-items. **Cite the won opportunity + stamp the as-of date**
   (A5) — the sourcing inherits its grounding from the deal, not from memory.
2. `[script]` Extract the sold line-items that require licenses/SKUs and resolve the
   owning `account` (client — or Imperion-self when Imperion "wins" an internal need,
   per `sourcing-rubric.md`). An unresolved owner is a noted gap that parks, not a guess.
3. `[script]` **Empty or ambiguous line-item set → PARK** (A5 empty→park): no line-items,
   items without quantity, or items that cannot be tied to the won deal end the stage
   parked for a human. Never reconstruct what was sold by inference — a guessed
   line-item becomes a real purchase downstream.

## Outputs

`line-items.md` — the won opportunity reference (cited + as-of), the owning account and
subject (client / Imperion-self), and the extracted sold line-items requiring
licenses/SKUs (item, quantity, deal context) — or the parked reason.

## Audit

- [ ] Won opportunity cited + as-of stamped (A5); payload verified against the `opportunity` record
- [ ] Line-item set present and unambiguous, or the run PARKED (never guessed into)
- [ ] Owning account + subject resolved (or parked as a gap)
- [ ] No money actuation emitted from ICM — nothing ordered, provisioned, or billed
