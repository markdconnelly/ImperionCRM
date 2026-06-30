# Stage 05 — reconcile

**Job:** wire the published asset's attribution to its campaign and close the run.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Handoff result | stage 04 output | the one asset | the published asset + its `publish_ref` |
| Asset record | `` `okf:content_asset` `` | this asset | the run to attribute and close |
| Linked campaign | `` `okf:campaign` `` | the asset's campaign | the attribution target |

## Process

1. `[script]` Link the `content_asset` → its `campaign` via `content.write` so the
   **asset → campaign → lead → won** loop holds (#1316) and the asset's contribution is
   attributable.
2. `[script]` Feed the attribution link to 01-M (marketing analytics / attribution); the
   metric rollup hydrates async — this stage only records the link.
3. `[script]` Close the run.

## Outputs

`reconcile.md` — the recorded asset→campaign attribution link and the run close state.

## Audit

- [ ] Asset linked to its campaign (or explicitly "none — standalone")
- [ ] The attribution link is recorded and fed to 01-M
- [ ] No cross-client/audience data bled into the record (internal/aggregated only, A7)
