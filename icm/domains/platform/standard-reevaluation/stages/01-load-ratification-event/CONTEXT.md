# Stage 01 — load-ratification-event

**Job:** load the newly-ratified and superseded standard versions and enumerate the fleet to
re-score, with each client's latest snapshot and prior verdict.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| New + superseded versions | silver `security_standard_version` · `okf:security_standard_version` | the highest ratified `version_number` (new) + the version it superseded | the new baseline + the before/after pairing |
| Fleet snapshots | silver `posture_snapshot` · `okf:posture_snapshot` | each client's latest snapshot | what to re-score |
| Tenant posture | silver `tenant_posture` · `okf:tenant_posture` | each client's tenant posture state | tenant-level evidence the criteria read |
| Prior verdicts | silver `posture_score` · `okf:posture_score` | each client's verdict under the superseded version | the "before" side of newly-non-compliant |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the accounts the snapshots belong to | resolve which client each reading concerns |
| Scoring method | `domains/platform/skills/posture-scoring-method.md` | criteria → checks + the newly-non-compliant definition | how the re-score + comparison are made |

## Process

1. `[script]` Read the **newly ratified** version (`status='ratified'`, highest
   `version_number`) and the version it **superseded**. If the two are the same, or nothing is
   ratified, **park** ("no ratification event to re-evaluate") — B5 runs only on a genuine
   version change.
2. `[script]` Enumerate the fleet: each client's latest `posture_snapshot` + `tenant_posture`,
   resolved via `entity_xref`. A client with no snapshot is listed as a **gap** (nothing to
   re-score), never assumed.
3. `[script]` For each client, read its prior verdict under the **superseded** version — the
   "before" for the newly-non-compliant comparison. A client with no prior verdict is noted
   (re-scored, but not classifiable as newly-non-compliant — nothing to compare). Cite
   everything by reference (version ids, snapshot id) — never posture values.

## Outputs

`ratification-event.md` — the new + superseded version ids, the fleet roster (each client by
reference with its latest snapshot ref + prior-verdict ref or a no-prior/no-snapshot gap note).
No posture values reproduced.

## Audit

- [ ] New + superseded versions identified, or the run parked (no genuine version change)
- [ ] Fleet enumerated; no-snapshot clients listed as gaps (never assumed)
- [ ] Prior superseded-version verdicts read by reference; no-prior clients noted
