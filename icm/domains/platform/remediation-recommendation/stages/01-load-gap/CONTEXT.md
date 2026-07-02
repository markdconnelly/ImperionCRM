# Stage 01 — load-gap

**Job:** load the client's latest posture verdict, isolate the failing criteria, and read the
golden-baseline targets + the evidence behind each failure.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Latest verdict | silver `posture_score` · `okf:posture_score` | the client's latest verdict under the current ratified version (band + per-criterion results) | the gap to close |
| Standard | silver `security_standard_version` · `okf:security_standard_version` | the ratified version's criteria (the bar each failing criterion is measured against) | the target bar |
| Golden baseline | silver `posture_policy` · `okf:posture_policy` | the defined-good the criteria track | the target the plan aims at |
| Snapshot evidence | silver `posture_snapshot` · `okf:posture_snapshot` | the snapshot behind the verdict | the measured side of each gap |
| Tenant posture | silver `tenant_posture` · `okf:tenant_posture` | the client's tenant posture state | tenant-level evidence behind a failure |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the account the verdict belongs to | resolve which client the plan is for |
| Plan rules | `./skills/remediation-planning.md` | the step shape + severity ordering | what the plan will need |

## Process

1. `[script]` Read the client's **latest** `posture_score` verdict under the current ratified
   version (`scored_at` newest). A `conforming` verdict (no failing criteria) → record "no
   remediation needed — client conforms" and end clean. No verdict at all → **park** ("no
   verdict — B2 scores first"); never invent a gap.
2. `[script]` Isolate the **failing** criteria from the verdict; for each, read the
   criterion's bar (from the ratified version's criteria) and the `posture_policy` golden
   target it tracks. Cite by reference (verdict id, criterion id, policy id) — never posture
   values.
3. `[script]` Read the `posture_snapshot` + `tenant_posture` evidence behind each failure and
   resolve the account via `entity_xref`. A criterion that is `not-assessable` (not a failure)
   is set aside as a **data gap**, not a remediation step.

## Outputs

`gap.md` — the client by reference, the band, the list of failing criteria (each with its bar
+ golden target + the evidence behind it, all by reference), and the not-assessable data-gap
list. No posture values reproduced.

## Audit

- [ ] Latest verdict read; `conforming` ended clean, or no-verdict parked (never invented)
- [ ] Failing criteria isolated with bar + golden target, all cited by reference
- [ ] Not-assessable criteria set aside as data gaps; no posture values reproduced
