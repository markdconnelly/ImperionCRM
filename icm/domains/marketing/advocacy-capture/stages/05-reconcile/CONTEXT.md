# Stage 05 — reconcile

**Job:** link the reference to its account/opportunity and record provenance so
advocacy is attributable.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Captured reference | stage 02 output | this reference | the proof to link + attribute |
| Spawned asset | stage 04 output | the asset (if any) | the backed case-study to carry in provenance |
| Account | `` `okf:account` `` | this reference's account | the account (and its opportunity) the reference links to |

## Process

1. `[script]` Link the `reference` → its `account` (and its opportunity, if one
   applies) for analytics attribution.
2. `[script]` Record **provenance**: who captured the reference, the backing
   `consent_event`, and the spawned `content_asset` (if any) — the tracer.

## Outputs

`reconciliation.md` — the recorded links (reference → account / opportunity) +
provenance (captured-by, backing consent_event, spawned asset id if any).
Reference data by id, no PII.

## Audit

- [ ] The reference is linked to its account (and opportunity where one applies)
- [ ] Provenance is recorded: who captured, the backing consent_event, the spawned
      asset if any
- [ ] All links are by id (no PII recorded)
