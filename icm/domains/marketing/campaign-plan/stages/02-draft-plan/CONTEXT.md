# Stage 02 — draft-plan

**Job:** draft the campaign plan — objective, target segment, channel mix, budget
envelope, and message — with no fabricated claim, price, or timeline.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Basis | stage 01 output | all | goal, performance read, budget read |
| Brand voice | `../../skills/brand-voice.md` | all | tone for the message (domain-tier skill) |
| Campaign record | `` `okf:campaign` `` | the campaign being planned | where the plan is staged |
| Prior performance | `` `okf:social_metric` `` | the basis channels | informs the channel-mix weighting |

## Process

1. `[sonnet]` Draft the **objective** and the **target segment** from the basis —
   one campaign, one objective, a named segment.
2. `[sonnet]` Draft the **channel mix** (which children — posts / sends / journey /
   paid — and their weighting), informed by the prior `social_metric` read.
3. `[sonnet]` Draft the **proposed budget envelope** — a planning figure for the gate,
   **not a spend**; no fabricated price. The envelope frames what paid *could* cost; the
   actual spend is committed only later, in `paid-ads`, behind its own money gate.
4. `[sonnet]` Draft the **message** on-brand. No fabricated stat, testimonial, quote,
   capability, price, or timeline — a claim that cannot be sourced is **cut**, not
   shipped (A5/`brand-voice.md`).
5. `[script]` Stage the plan on the `campaign` record (internal, reversible — L2).

## Outputs

`plan.md` — the objective, the target segment, the channel mix (the children to launch),
the proposed budget envelope (labelled "envelope — not a spend authorization"), the
message, and the substantiation reference for each claim.

## Audit

- [ ] One objective; a named target segment; a channel mix mapping to child procedures
- [ ] Budget envelope is labelled a planning figure, not a spend authorization
- [ ] Every claim has a substantiation reference + as-of, or was cut (no fabrication)
- [ ] No fabricated price or timeline in the plan or message
- [ ] No client identity / confidential data in the message copy
