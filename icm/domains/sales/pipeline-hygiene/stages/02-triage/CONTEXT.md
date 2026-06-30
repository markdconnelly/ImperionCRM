# Stage 02 — triage

**Job:** classify the scan findings by type and prioritize them, so stage 03
knows what to stamp internally and what to route — without leaking one deal's
detail into another.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Scan | stage 01 `scan.md` | all | the findings being classified |
| Hygiene rules | `./skills/hygiene-rules.md` | all | finding taxonomy · route-vs-stamp rule |

## Process

1. `[script]` Classify each finding into exactly one type: **stale**,
   **no-next-step** (missing next-action or close-date), or **data-quality**
   (a named missing field), per `./skills/hygiene-rules.md`.
2. `[haiku]` Split each finding by the route-vs-stamp rule: an unambiguous
   internal field becomes a **stamp candidate**; anything needing a customer-facing
   touch, or anything ambiguous, becomes a **route candidate** (`hygiene-rules.md`).
3. `[sonnet]` Prioritize within and across types (e.g. past-close-date and
   high-amount stale deals first); summarize any cross-deal pattern in
   **aggregate only — pool, never bleed** (A7), no per-deal detail bled into a
   portfolio note.

## Outputs

`triage.md` — each finding keyed to its opportunity id, with its type
(stale / no-next-step / data-quality), its disposition (stamp candidate vs route
candidate), a priority, and any aggregate cross-deal pattern note.

## Audit

- [ ] Every scan finding classified into exactly one type; none dropped
- [ ] Each finding dispositioned as stamp-candidate or route-candidate (`hygiene-rules.md`)
- [ ] Cross-deal patterns aggregated only — no per-deal detail bled across deals (A7)
- [ ] Priority assigned; ambiguous fixes dispositioned as route, never stamp
