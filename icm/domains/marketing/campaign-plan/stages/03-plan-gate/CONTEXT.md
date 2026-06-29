# Stage 03 — plan-gate

**Job:** route the plan + budget envelope to the cockpit for human approval, making
plain that approving the envelope is not approving a spend.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Plan | stage 02 output | all | objective, segment, channel mix, envelope, message |
| Campaign record | `` `okf:campaign` `` | this campaign | the plan to approve |

## Process

1. `[script]` Assemble the gate package: the plan, the channel mix (which children
   will launch), the proposed budget **envelope**, and the per-claim substantiation.
2. `[sonnet]` Present the **4-part easy-button** (A4): the drafted plan + the grounded
   why (cited basis + substantiation refs) + one-click **Approve plan + envelope** +
   one-click **revise/reject** (the reversible inverse — the plan is internal, nothing
   has actuated). Mark the envelope explicitly as **"a planning figure, not a spend
   authorization."**

## Outputs

`proposed-plan.md` — the plan package, the labelled budget envelope, the substantiation
summary, and the approval routing decision.

## Audit

- [ ] The budget envelope is labelled "not a spend authorization" in the gate package
- [ ] Substantiation summary attached for every claim (no unsourced claim proceeds)
- [ ] The easy-button carries the reversible inverse (revise/reject)
- [ ] No child has actuated — this gate approves the PLAN only, not any send/post/ad

## Checkpoint

**Human approves / edits the plan + budget envelope in the cockpit.** In `draft` mode
every plan parks. In `auto` mode, the **internal plan/draft** may have self-approved at
L2 (it is reversible-internal, ADR-0128 row 1), but **approving the plan + budget
envelope is a human gate** here.

**The actual ad spend stays `always_gate` — approving an envelope is NOT approving a
spend.** The envelope is a planning figure; not one dollar of spend is authorized by
this gate. The real spend is committed only later, inside `paid-ads` (01-B/01-C), behind
its own dial-proof money gate (A2 class-1, money has no clean undo). This gate never
waives it. Any unsubstantiated claim or any audit failure parks for a human in every mode.
