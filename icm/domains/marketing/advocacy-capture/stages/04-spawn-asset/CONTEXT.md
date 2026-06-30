# Stage 04 — spawn-asset

**Job (OPTIONAL):** spawn a case-study `content_asset` backed by this reference,
or skip.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Captured reference | stage 02 output | this reference | the proof the case-study is backed by |
| Approved rights use | stage 03 output | this reference | the human-approved name/logo/quote use the asset may rely on |
| Asset record | `` `okf:content_asset` `` | the spawned asset | the typed case-study record to create + back-link |

## Process

1. `[script]` If a case-study is **elected**, create a
   `content_asset(type=case_study)` and set its **backing link** to this
   reference; hand it to the **content-studio** workflow (01-N) for authoring.
2. `[script]` If **not elected**, skip — produce no asset.

## Outputs

`spawned-asset.md` — the spawned `content_asset` reference (id, `type=case_study`,
the backing reference id, the content-studio hand-over), or **none** if not
elected. Reference data by id, no PII.

## Audit

- [ ] If elected: a `content_asset(type=case_study)` exists with its backing link
      set to this reference, handed to content-studio (01-N)
- [ ] If not elected: no asset was created
- [ ] The asset relies only on the stage-03 human-approved rights use
