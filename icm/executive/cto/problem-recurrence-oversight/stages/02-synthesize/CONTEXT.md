# Stage 02 — synthesize

**Job:** turn the gather record into a burn-ranked recurrence roll-up with the flags —
un-opened problems, stale investigations, known errors overdue for a fix — isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Cluster the repeat-ticket signals by CI, symptom class, and account;
   collapse duplicates so each cluster is one line with its ticket ids.
2. `[sonnet]` Match each cluster against the open problems and the known-error
   register: clustered recurrence with NO problem record = an un-opened problem; an
   open problem with no recent investigation progress = stale; a known error whose
   workaround keeps generating tickets = overdue for a permanent fix.
3. `[sonnet]` Rank by burn — the ticket volume, hours, and client pain each cluster
   keeps consuming — highest burn leading; isolate the flags, each with its class
   (un-opened / stale / overdue-fix) and the burn stated.
4. `[sonnet]` Cross-correlate the flags against prior Problem/NOC activity
   internally only — pool, never bleed; nothing here is client-facing.

## Outputs

`synthesis.md` — a burn-ranked recurrence roll-up (highest burn leading) and a
separate flag list, each item naming the cluster (CI/symptom/account), its class
(un-opened problem / stale investigation / known error overdue for fix), and the
burn, and noting any prior Problem/NOC activity already in motion.

## Audit

- [ ] Recurrence is clustered by CI / symptom / account with ticket ids attached
- [ ] Every cluster is matched against problems and known errors; the class is stated
- [ ] Roll-up is burn-ranked, highest recurring cost leading
- [ ] Every flag names the cluster, the class, and the burn
- [ ] Cross-correlation is internal only — no client-facing content produced
- [ ] No item restates the gather list verbatim (it must be synthesized)
- [ ] Read-only — no problem opened, advanced, or closed; no monitor touched
- [ ] No send/write/actuation occurred — Dexter delegated or parked
