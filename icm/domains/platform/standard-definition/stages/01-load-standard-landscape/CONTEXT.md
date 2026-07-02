# Stage 01 — load-standard-landscape

**Job:** load the current ratified standard version and the fleet posture landscape the next
draft must describe.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Current standard | silver `security_standard_version` · `okf:security_standard_version` | the highest ratified `version_number` + its criteria (0256 contract) | the baseline the draft diffs against |
| Fleet posture | silver `posture_snapshot` · `okf:posture_snapshot` | each client's latest snapshot | what the fleet actually looks like |
| Tenant posture | silver `tenant_posture` · `okf:tenant_posture` | per-tenant posture state | the tenant-level landscape the criteria must fit |
| Golden baselines | silver `posture_policy` · `okf:posture_policy` | the golden posture baselines | the defined-good the standard should track |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the accounts the snapshots belong to | resolve which client each posture reading concerns |
| Authoring rules | `./skills/standard-authoring.md` | criteria shape + versioning discipline | what the draft may contain |

## Process

1. `[script]` Read the current ratified standard (`status='ratified'`, highest
   `version_number`) + its criteria jsonb. No ratified version yet (first run) → stated
   plainly as "no current standard — authoring v1," never assumed.
2. `[script]` Read the fleet landscape: each client's latest `posture_snapshot` +
   `tenant_posture`, and the `posture_policy` golden baselines; resolve accounts via
   `entity_xref`. Cite everything **by reference** (snapshot id, policy id) — never posture
   values.
3. `[haiku]` Summarize where the fleet sits against the current criteria — which pillars the
   fleet broadly meets, where the golden baselines and the standard disagree, and which
   criteria are chronically not-assessable (snapshot data gaps, listed as gaps).

## Outputs

`landscape.md` — the current version (number, criteria summary) or its absence, the fleet
landscape summary with every reading cited by reference, and the data-gap list. No posture
values reproduced.

## Audit

- [ ] Current ratified version read, or its absence stated plainly (never assumed)
- [ ] Fleet landscape loaded (snapshots + tenant posture + golden baselines, by reference)
- [ ] Chronic not-assessable criteria listed as data gaps — nothing estimated into a gap
