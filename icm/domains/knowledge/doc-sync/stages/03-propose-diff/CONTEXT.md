# Stage 03 — propose-diff

**Job:** produce the IT Glue diff for each drafted doc and route it for approval.
**Publish to the SoR is gated until trusted.**

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Drafts | stage 02 `draft.md` | all drafted docs | the new content to diff |
| Existing docs | `knowledge.search` over gold (IT Glue) | the current published doc per unit | the old side of the diff |

## Process

1. `[script]` For each drafted unit, build the diff: existing published doc (old) →
   drafted doc (new), unit by unit. A `missing` unit diffs against empty (a new doc).
2. `[haiku]` Summarize each diff in one line (what changed and why — the drift it
   corrects) so a human can approve quickly.
3. `[script]` Mark the run **gated**: the publish to IT Glue (the SoR) awaits human
   approval until the publish action is earned. No publish, no send happens here.

## Outputs

`diff.md` — one routed diff per unit: old → new, the one-line change summary, the CI
id, and the proposed-publish status `awaiting-approval`. All references by id; no
secret, no PII. The run ends gated — Lexicon has proposed; the publish is the
approver's act.

## Audit

- [ ] Every drafted unit has a diff (old → new) and a one-line change summary
- [ ] No secret value, no PII, no client identifier in any diff (reference only)
- [ ] Run is marked gated — no publish, no send executed in this stage

## Checkpoint

A human reviews and **publishes** the diff to IT Glue. Until Lexicon has **earned the
publish action**, `auto` may **never** self-approve the publish — the publish-to-SoR
parks in every mode (ADR-0128 hard ceiling: changing the documentation of record is
gated until trusted). `auto` may produce and surface the diff; only an approved publish
changes the SoR, and there is no other send path.
