# Stage 03 — attribute

**Job:** stamp the multi-touch attribution touch for this lead — the first link in
touch → opportunity → won.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Capture | stage 01 output | all | source · UTM · campaign touch to attribute |
| Owner | stage 02 output | all | the resolved contact the touch attaches to |
| Linked campaign | `` `okf:campaign` `` | the resolved campaign touch | attribute the touch to the right campaign |

## Process

1. `[script]` Assemble the attribution touch: the resolved `contact`, the `campaign`
   id (or "none — standalone"), the source, and the UTM, keyed to the inbound timestamp.
2. `[script]` Stamp the touch for multi-touch ROI (#1316 → 01-M) — an internal,
   reversible write (L2). A retry on the same hook is a no-op (idempotent on the
   hook id, A9b).

## Outputs

`attribution.md` — the stamped touch (contact · campaign · source · UTM · as-of) and
its attribution reference for the analytics rollup (01-M).

## Audit

- [ ] Touch attributed to the resolved contact + the campaign (or "none — standalone")
- [ ] Touch cited to the source hook + as-of (A5)
- [ ] Stamp is idempotent on the hook id (a replay is a no-op, A9b)
