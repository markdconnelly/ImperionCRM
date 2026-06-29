# Stage 02 — match-docs

**Job:** match each inventoried asset to its existing doc and classify coverage as
covered / stale / missing.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Inventory | stage 01 `inventory.md` | every inventoried asset | the assets to test for coverage |
| Asset detail | silver `device` / `cloud_asset` · `okf:device` `okf:cloud_asset` | the asset each match describes | ground truth to test a found doc against (covered vs stale) |
| Existing docs | `knowledge.search` over gold (IT Glue) | the current runbooks for these assets | the docs to match each asset to |
| Prior coverage notes | `memory.recall` | any prior audit note for the asset | context on a known gap (cite; never fabricate) |

## Process

1. `[haiku]` For each asset, search the existing docs via `knowledge.search`. No doc
   returned → `missing`.
2. `[sonnet]` For an asset with a doc, classify against the real asset record:
   `covered` (the doc maps to and matches the current asset) or `stale` (a doc exists
   but has drifted from the asset). One sentence of grounded evidence per
   classification; flag low confidence. Never invent a doc — record the search result.
3. `[script]` Record the coverage per asset with the CI id, account id, classification,
   and the doc reference (or `none` for `missing`).

## Outputs

`coverage.md` — one row per asset: CI id, account (by reference), doc reference (or
`none`), classification (`covered` / `stale` / `missing`), evidence. `covered` units
end the run for that unit (no gap). References by id only — no PII, no secret.

## Audit

- [ ] Every inventoried asset has exactly one classification + a CI id
- [ ] Each `stale` / `missing` row states grounded evidence (the specific gap); a `missing` row records that the search returned no doc
- [ ] No invented doc reference — a `missing` asset carries `none`, never a fabricated path
- [ ] No verbatim PII / secret in the output (reference by id)
