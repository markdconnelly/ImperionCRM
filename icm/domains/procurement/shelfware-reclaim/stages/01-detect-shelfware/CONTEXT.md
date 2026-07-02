# Stage 01 — detect-shelfware

**Job:** sweep entitlements vs assignments and identify every paid-for-but-unassigned/unused license as of a stated date.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Entitlement + assignment facts | silver `license_assignment` · `okf:license_assignment` | entitlements + assignment state as of the sweep | what is paid for vs what is actually assigned |
| Client spine | silver `account` · `okf:account` | accounts owning the swept entitlements | attribute each entitlement to its client (or Imperion-self — subject: both, 02-B3) |
| Pax8 subscription state | bronze `pax8_*` (read-only) | active subscriptions + quantities | the SoR mirror of what is actually being paid for (room.md) |
| Shelfware rubric | `./skills/shelfware-rubric.md` | shelfware definition + unused-vs-unassigned | what counts as shelfware, what does not |

## Process

1. `[script]` Fix the **as-of date** for the sweep (the snapshot date). An undated sweep is
   an audit fail — shelfware is a snapshot claim (A5).
2. `[automation]` Sweep entitlements vs assignments: for each paid-for entitlement on
   `license_assignment` + the Pax8 bronze mirror, compare the paid quantity against the
   assigned/active quantity, **citing each unassigned or unused entitlement + its as-of
   date** (A5). Missing or stale assignment data is **a noted gap, not a candidate** — a
   guessed candidate risks reclaiming something someone needs (park per A5 empty→park).
3. `[automation]` Classify each candidate **unassigned vs unused** per
   `shelfware-rubric.md`, keeping the evidence line (source + as-of) on every row.
   Cross-client patterns stay internal (A7 pool-never-bleed).

## Outputs

`shelfware.md` — the as-of date, the candidate list (entitlement, owning account, paid vs
assigned/active quantity, unassigned-vs-unused class, evidence citation + as-of per row),
and any data gaps noted (not guessed).

## Audit

- [ ] As-of date stated (not blank)
- [ ] Every candidate cites its entitlement source + as-of date (A5); gaps noted, never guessed into
- [ ] Unassigned vs unused classified per the rubric on every candidate
- [ ] Measurement only — no actuation, no cancel/downgrade, no money commitment emitted
