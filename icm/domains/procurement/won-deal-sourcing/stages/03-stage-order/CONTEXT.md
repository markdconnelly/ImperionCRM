# Stage 03 — stage-order

**Job:** stage the sourcing plan as an order for the `governed-procurement` money gate
and emit the Pierce delivery seam — procurement prepared, nothing bought.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Sourcing plan | `sourcing-plan.md` (stage 02 output) | full | the plan being staged for the gate |
| Sourcing rubric | `./skills/sourcing-rubric.md` | stage-for-gate handoff shape | the fields the staged order must carry |

## Process

1. `[script]` Assemble the staged order in the **stage-for-gate handoff shape**
   (`sourcing-rubric.md`): catalog SKU + quantity + the exact $ + the owning
   account/subject + the won-deal grounding (the opportunity reference and the why),
   each cited + as-of (A5) — everything `governed-procurement` stage 01 needs to ground
   without re-research. A plan whose stage-02 audit is not green cannot be staged.
2. `[script]` Stage the order for the **`governed-procurement` money gate**
   [→ **SEAM** governed-procurement, 02-B2]. The buy itself is `always_gate` there
   (A2 class-1, ADR-0109, 0184) — staging creates a pending gate item, it authorizes
   nothing and touches no vendor.
3. `[script]` Emit the delivery-procurement seam to **Pierce** [→ Stream 03] so project
   provisioning sees the sourcing in flight (A11 — a governed event, not a send; no
   client-facing action originates here).

## Outputs

`staged-order.md` — the staged order in the handoff shape (SKU, quantity, exact $,
account/subject, won-deal grounding, each cited + as-of), the governed-procurement seam
reference, and the Pierce seam reference. Terminal stage; the run ends **staged for the
money gate**.

## Audit

- [ ] The staged order carries the full handoff shape (SKU · quantity · exact $ · account/subject · won-deal why — each with source + as-of, A5)
- [ ] Both seams emitted: → governed-procurement (02-B2 money gate) and → Pierce (Stream 03)
- [ ] Staged only on a green stage-02 audit — no incomplete or off-catalog item staged
- [ ] No money actuation emitted from ICM — nothing ordered, provisioned, attached, or billed; the buy waits at the gate
