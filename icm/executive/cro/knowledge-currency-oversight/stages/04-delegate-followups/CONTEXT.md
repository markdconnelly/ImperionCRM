# Stage 04 — delegate-followups

**Job:** optionally emit a proposed `delegate()` to Alivia for grounded staleness
verification (never a rewrite ask) and/or a `handoff()` to Nova when the owner sits
outside the division, then park — Jessica never rewrites and never re-vectorizes.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brief | stage 03 `brief.md` | the flagged staleness / gap / break items | what may warrant a follow-up |

## Process

1. `[sonnet]` For each **suspected** finding that warrants confirmation, draft a
   **proposed** `delegate()` to **Alivia** (Knowledge): the knowledge item / concept
   / xref ids and the evidence references — a *verify-and-surface* ask only; never a
   rewrite, edit, or re-vectorize ask (Alivia surfaces what needs the owner's
   rewrite; the correction is the owner's, gated to their human).
2. `[sonnet]` Where the stale knowledge is owned outside Platform & Assurance (e.g.
   a domain agent's operating docs), draft a `handoff()` to **Nova** instead, naming
   the owning division and the reason.
3. `[script]` Attach each delegate/handoff to the brief as a proposal and park.
   Nothing rewritten, nothing re-vectorized — every content correction stays gated
   to Mark or the owning agent's human.

## Outputs

`followups.md` — the proposed `delegate()` calls to Alivia and/or `handoff()` calls
to Nova, each citing the item/entity ids and the evidence references. The run ends
here at the checkpoint; any content correction happens on the owner's side, never
here.

## Audit

- [ ] Every delegate names the item/entity ids and cites its evidence references
- [ ] Every delegate is a verify-and-surface ask — no rewrite, edit, or re-vectorize ask routed to anyone
- [ ] Out-of-division items are handed off to Nova, not delegated inside the division
- [ ] No client PII reproduced — everything by reference
- [ ] Read-only — nothing rewritten, nothing re-vectorized

## Checkpoint

The follow-ups park for **Mark**, and any delegate is a **proposal** to Alivia.
`auto` may self-approve ONLY emitting the `delegate()` to Alivia for flagged
staleness verification that is grounded and cited, and the `handoff()` to Nova when
the owner is outside the division; doc rewrites, concept-file edits, and
re-vectorization are always-gated to Mark or the owning agent's human
(CONSTITUTION §9, jessica.md §6). The assurance line never holds the levers it
audits; any ungrounded or out-of-scope item parks for Mark.
