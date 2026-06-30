# Stage 03 — review-gate

**Job:** gate the draft on brand-compliance against the read-only brand registry and on
every claim being substantiated, then stamp the compliance note on the asset.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Draft | stage 02 output | the one asset | the content + its substantiation refs |
| Asset record | `` `okf:content_asset` `` | this asset | the draft to gate and stamp |
| Brand rules | `` `okf:brand_asset` `` | the brand registry | read-only on-brand compliance check (D5) |

## Process

1. `[sonnet]` Check the draft against the read-only `brand_asset` registry for on-brand
   compliance (voice, naming, claims policy, prohibited language). **Empty brand registry
   → park** (A5) — an unverifiable draft does not proceed.
2. `[sonnet]` Verify **every** claim is substantiated (the stage-02 refs trace to a real
   source + as-of); any unsourced claim fails the gate.
3. `[script]` Stamp the **brand-compliance note** on the `content_asset` via `content.write`
   (the checks run, the approver, the as-of) — internal, reversible.

## Outputs

`review.md` — the brand-compliance result (pass/fail per check), the per-claim
substantiation summary, and the stamped compliance note. On a fail it names exactly what
parks the run.

## Audit

- [ ] No unsubstantiated claim proceeds (every claim → a real source + as-of)
- [ ] Brand registry is non-empty and the on-brand check ran against it
- [ ] The brand-compliance note is recorded on the asset
- [ ] No money, no customer send is in this action (this is an internal approval)

## Checkpoint

**A human approves `draft → approved`** in the cockpit. A **failed brand or
substantiation check** — or an **empty brand registry** — **parks in every mode** (A5). v1
**never self-approves** a published claim: this is an **internal** approval (not an ADR-0058
send), so even at `auto` the gate stays human-approved. Anything unstated parks.
