# Stage 02 — assess-risk

**Job:** score each snapshot item against the health rubric and mark what is at risk.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Fleet snapshot | stage 01 `snapshot.md` | all rows | the items to score |
| Device detail | silver `device` · `okf:device` | the item(s) being scored | confirm state for the risk call |
| Cloud asset detail | silver `cloud_asset` · `okf:cloud_asset` | the item(s) being scored | confirm state for the risk call |

## Process

1. `[sonnet]` Score each item `healthy` | `degrading` | `at-risk` against the
   health rubric (disk pressure, patch lag, offline/last-seen, backup-adjacent
   health), with one sentence of grounded reasoning per non-healthy item tied to
   its snapshot fields.
2. `[script]` Suppress any item whose risk is already covered by an open ticket
   (the stage-01 coverage flag) — mark it `already-tracked`, not a fresh proposal.
3. `[script]` Record the recommended next step per at-risk item from the rubric
   (e.g. raise disk-cleanup ticket, schedule patch, escalate offline). A
   security-shaped signal is NOT scored or remediated here — it is flagged for the
   alert-triage / Cyrus path, never proposed as a sweep ticket.

## Outputs

`assessment.md` — per item: score, one-line reasoning (for non-healthy),
already-tracked flag, and the recommended next step for each at-risk item.

## Audit

- [ ] Exactly one score per item, grounded in the snapshot for non-healthy items
- [ ] Already-tracked items marked and excluded from fresh proposals
- [ ] Recommended next step stated for every `at-risk` item
- [ ] No security-shaped item was scored as a sweep-remediable risk
