# Stage 01 — load-score-history

**Job:** load the client's verdict history under the current ratified standard and the
freshest snapshot context behind the newest verdict.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Verdict history | silver `posture_score` · `okf:posture_score` | the client's verdicts under the current ratified version, newest + priors (0256 append-only ledger) | the comparison material |
| Standard binding | silver `security_standard_version` · `okf:security_standard_version` | the ratified version the verdicts bind to | same-version comparison only — a version change is B5, not drift |
| Snapshot evidence | silver `posture_snapshot` · `okf:posture_snapshot` | the snapshot behind the newest verdict | the evidence behind any new criterion failure |
| Tenant posture | silver `tenant_posture` · `okf:tenant_posture` | the client's tenant posture state | tenant-level context for a failure |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the account the verdicts belong to | resolve which client is drifting |
| Scoring method | `domains/platform/skills/posture-scoring-method.md` | the drift-vs-noise definition | what the comparison will need |

## Process

1. `[script]` Read the client's verdicts under the current ratified version, newest first
   (`scored_at` — the 0256 account-history index shape). Only one verdict (no prior under
   this version) → record "no drift baseline — no comparison possible," never an assumed
   trend; the run ends clean at stage 03 with that statement.
2. `[script]` Confirm both comparison verdicts bind to the **same** `standard_version_id`;
   a cross-version pair is excluded (B5's territory, #1472), stated as such.
3. `[script]` Read the snapshot + tenant posture behind the newest verdict and resolve the
   account via `entity_xref` — all by reference (verdict id, snapshot id), never posture
   values.

## Outputs

`history.md` — the client by reference, the newest + prior verdicts (ids, scores, bands,
scored_at) under the same version, the snapshot context by reference, and any
no-baseline / cross-version exclusion notes.

## Audit

- [ ] Verdict history read; newest + prior identified, or no-baseline stated plainly
- [ ] Comparison pair confirmed same standard version (cross-version excluded, noted)
- [ ] Account + evidence resolved by reference; no posture values reproduced
