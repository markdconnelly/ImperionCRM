# Stage 04 — delegate-followups

**Job:** optionally emit a proposed `delegate()` to Tess for grounded quality
observation (never a fix or re-score) and/or a `handoff()` to Nova when
cross-division, then park — Jessica never edits a golden and never moves a baseline.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brief | stage 03 `brief.md` | the flagged regression / gap items | what may warrant a follow-up |

## Process

1. `[sonnet]` For each flagged quality signal that warrants a closer look, draft a
   **proposed** `delegate()` to **Tess** (Service Quality): the module, the measured
   figure or suspected cause, and the evidence references — an *observation/judgment*
   ask only; never a fix, a re-score, or a threshold ask (Tess is a watcher too —
   she judges, she does not correct).
2. `[sonnet]` Where the signal is cross-division (e.g. a regression whose owning
   agent sits outside Platform & Assurance), draft a `handoff()` to **Nova** instead,
   naming the division and the reason.
3. `[script]` Attach each delegate/handoff to the brief as a proposal and park. No
   golden edited, no baseline moved, no run re-scored — every correction and
   threshold change stays always-gated to Mark.

## Outputs

`followups.md` — the proposed `delegate()` calls to Tess and/or `handoff()` calls to
Nova, each citing the module and the evidence references. The run ends here at the
checkpoint; any corrective action happens on Mark's decision, never here.

## Audit

- [ ] Every delegate names the module, the signal, and its evidence references
- [ ] Every delegate is an observation/judgment ask — no fix, re-score, or threshold ask routed to anyone
- [ ] Cross-division items are handed off to Nova, not delegated inside the division
- [ ] No client PII reproduced — everything by reference
- [ ] Read-only — no golden edited, no baseline moved, no run re-scored

## Checkpoint

The follow-ups park for **Mark**, and any delegate is a **proposal** to Tess. `auto`
may self-approve ONLY emitting the `delegate()` to Tess for flagged quality signals
that are grounded and cited, and the `handoff()` to Nova when cross-division; golden
edits, baseline moves, threshold changes, and every correction are always-gated to
Mark (CONSTITUTION §9, jessica.md §6). The assurance line never holds the levers it
audits; any ungrounded or out-of-scope item parks for Mark.
