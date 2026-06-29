# Stage 01 — inventory-assets

**Job:** enumerate the in-scope asset estate as auditable units, each attached to its
owning account.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Trigger | the periodic documentation-coverage audit | the audit scope (whole estate or per-account) | what to inventory |
| Owning account | silver `account` · `okf:account` | the account(s) in scope | the client each asset belongs to |
| Asset estate | silver `device` / `cloud_asset` · `okf:device` `okf:cloud_asset` | the devices / cloud resources in scope | the assets that should each have a doc |

## Process

1. `[script]` Resolve the audit scope: the whole estate, or the `account`(s) named by
   the trigger.
2. `[script]` Enumerate the in-scope `device` and `cloud_asset` records; attach each to
   its owning `account` by id. Each asset is one auditable unit.
3. `[script]` Assemble the inventory: one row per asset with its CI id, asset kind
   (`device` / `cloud_asset`), and account id. No interpretation — a deterministic read.

## Outputs

`inventory.md` — one row per asset: CI id, asset kind, account (by reference). This is
the estate the next stage tests for documentation coverage. References by id only — no
PII, no secret.

## Audit

- [ ] Every in-scope `device` / `cloud_asset` is listed exactly once with a CI id and account id
- [ ] No verbatim PII / secret in the output (reference by id)
- [ ] Scope matches the trigger (no asset outside the audit scope is listed)
