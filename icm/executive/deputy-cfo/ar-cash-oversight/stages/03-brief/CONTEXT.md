# Stage 03 — brief

**Job:** produce Nick's AR/cash brief plus the flag list, then park.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Synthesis | stage 02 `synthesis.md` | all | the aging-bucketed, exposure-ranked roll-up |

## Process

1. `[sonnet]` Write the brief: a short read leading with the aged and at-risk
   receivables and the cash exposure, then the rest of the AR roll-up by account.
2. `[sonnet]` Render the flag list as the brief's action surface — each item the
   account, the overdue/at-risk amount, and the decision it implies for Nick
   (including which overdue items are candidates to delegate to Audrey for dunning).
3. `[script]` Park the brief for Nick. No send, no write. Finance stays read-only.

## Outputs

`brief.md` — Nick's AR/cash brief + the flag list. The run holds here at the
checkpoint; nothing is actuated and no dunning is delegated yet.

## Audit

- [ ] Brief leads with aged / at-risk receivables and cash exposure, not a gross booked-revenue number
- [ ] Flag list present; each item states the account, the overdue/at-risk amount, and the implied decision
- [ ] Overdue dunning candidates are marked but not yet delegated (that is stage 04)
- [ ] Read-only — no financial record written, no money moved
- [ ] No send/write/actuation occurred — Sterling delegated or parked

## Checkpoint

The brief parks for **Nick**. `auto` may self-approve ONLY publishing the scheduled
AR/cash brief when every figure is grounded and cited; any flag with no grounding,
any gap, or any recall miss parks for Nick (CONSTITUTION §8). No actuation exists at
this tier — Sterling advises, sub-agents act; finance never leaves read-only. The
delegate to Audrey is the next stage, never folded into the brief.
