# Stage 01 — load-standard-and-posture

**Job:** load the current ratified standard, the client's posture snapshot, and the prior
verdict context for the (account, version, snapshot) being scored.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Current standard | silver `security_standard_version` · `okf:security_standard_version` | the highest ratified `version_number` + criteria (0256 contract) | the bar to score against |
| Client snapshot | silver `posture_snapshot` · `okf:posture_snapshot` | the client's snapshot being scored (freshest, or the triggering one) | the evidence |
| Tenant posture | silver `tenant_posture` · `okf:tenant_posture` | the client's tenant posture state | tenant-level evidence the criteria read |
| Prior verdicts | silver `posture_score` · `okf:posture_score` | the client's latest verdicts under this version | context + the idempotency check |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the account the snapshot belongs to | resolve which client is being scored |
| Scoring method | `domains/platform/skills/posture-scoring-method.md` | criteria → checks → verdict | how the score is made |

## Process

1. `[script]` Read the current ratified standard (`status='ratified'`, highest
   `version_number`). None ratified → **park the run** ("no current standard — B1 owns the
   draft"); never score against a draft.
2. `[script]` Read the client's `posture_snapshot` + `tenant_posture`, resolving the account
   via `entity_xref`. Cite by reference (snapshot id) — never posture values. An absent
   snapshot → park (nothing to score).
3. `[script]` Read the client's prior verdicts under this version. An existing verdict for
   this exact (account, version, snapshot) triple is noted — the 0256 UNIQUE makes the
   backend persist idempotent; the evaluation still runs and converges, it never
   double-files.

## Outputs

`scoring-input.md` — the standard (version number, criteria summary), the snapshot + tenant
posture by reference, the account by reference, and the prior-verdict context (including any
already-scored note). No posture values reproduced.

## Audit

- [ ] Ratified standard loaded — or the run parked (never a draft, never assumed)
- [ ] Snapshot + tenant posture + account resolved and cited by reference
- [ ] Prior verdicts read; an already-scored triple noted for idempotency
