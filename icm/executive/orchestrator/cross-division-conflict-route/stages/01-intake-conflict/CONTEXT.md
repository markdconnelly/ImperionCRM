# Stage 01 — intake-conflict

**Job:** turn the conflict flagged by `intake-route` into one grounded conflict
record — the request, the candidate owners, the resolved entities, the recalled
precedent, the asking human's authority, and one line on *why* it is a conflict.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The conflict | the `intake-route` stage 02 conflict flag | the verbatim ask + who is asking + the candidate owners/divisions it named | what to arbitrate, and the two-plus divisions in play |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | entities named in the ask | resolve the real subjects across systems |
| Accounts | silver `account` · `okf:account` | accounts named/implied | who the request is about |
| Contacts | silver `contact` · `okf:contact` | people named/implied | who the request is about |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | this thread's history + any prior ownership precedent | recall, always cited |

## Process

1. `[script]` Carry across the conflict from `intake-route`: the verbatim ask, the
   asking human, and the candidate owners/divisions it flagged. Read-only.
2. `[script]` Resolve named/implied entities via `entity_xref` → attach `account`/
   `contact` id + name only. Read-only.
3. `[haiku]` Recall the thread and any prior ownership precedent (has a like request
   been arbitrated before?) via the retrieval tier; attach each item with its source
   reference. A miss is recorded as "no recall," never filled with a guess.
4. `[script]` Record the asking human and their authority scope (used by stage 02 for
   the most-restrictive bar).
5. `[sonnet]` State in one line *why* this is a conflict — which divisions each look to
   own it, and on what basis — so stage 02 arbitrates against an explicit framing.

## Outputs

`conflict.md` — the verbatim ask, the candidate owners/divisions, the resolved entity
ids in scope, the cited recall/precedent (or an explicit "no recall"), the asking human
+ their authority, and the one-line statement of why it is a conflict.

## Audit

- [ ] The candidate owners/divisions from intake-route are carried across (≥2)
- [ ] Every entity reference states its id; none invented
- [ ] Every recall/precedent item carries a source reference; a miss is recorded as "no recall," not a guess
- [ ] The asking human and their authority scope are recorded
- [ ] The one-line reason it is a conflict is stated explicitly
- [ ] Read-only — nothing actuated, nothing written outside the run record
