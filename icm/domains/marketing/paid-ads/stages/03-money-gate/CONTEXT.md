# Stage 03 — money-gate

**Job:** emit the paid action as a money-class Social Action through the gauntlet to the
cockpit, where a human commits the spend — `always_gate`, dial-proof, at every level.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Paid action | stage 02 output | all | the drafted action + the consequence preview |
| Ad-spend rules | `./skills/ad-spend-rules.md` | all | the money-class gate + the easy-button floor |
| Ad record | `` `okf:ad` `` | this ad | the draft/delta to commit |

## Process

1. `[script]` Classify the action as **money-class** (`ad_deploy` for a boost, or
   `ad_pause` / `ad_rebudget` for a change) — every one carries `always_gate` (A2
   class-1; ADR-0109 no clean undo). A *pause* is reversible in isolation but is a
   money-lifecycle commit, so it gates with the rest.
2. `[sonnet]` Emit the action as a money-class Social Action (`social_dispatch`) → the
   gauntlet → the cockpit. **Never auto** at any dial, in any mode — the spend always
   parks for a human.
3. `[script]` Present the **4-part easy-button** (A4): the drafted action + the grounded
   why (the performance-vs-target rationale) + one-click **Commit** + the **consequence
   preview** (the exact $ budget / delta and the irreversibility flag — settled money).
   Meta ad-account peer-approval is the platform twin of this gate.

## Outputs

`proposed-spend.md` — the money-class action (`ad_deploy` | `ad_pause` | `ad_rebudget`),
the exact $ budget / delta, the grounded rationale, the consequence preview, and the
gauntlet routing decision.

## Audit

- [ ] Action classed money (`ad_deploy`/`ad_pause`/`ad_rebudget`) and marked `always_gate`
- [ ] Exact $ budget / delta + irreversibility flag attached to the easy-button
- [ ] Grounded why (performance-vs-target) attached, cited
- [ ] No auto-approval path present — the spend parks for a human in every mode

## Checkpoint

**A human commits the spend in the cockpit** via the 4-part easy-button. This is
`always_gate`, **dial-proof**: in `draft` mode and in `auto` mode alike, every spend —
any boost, ad deploy, pause, or budget change — parks for a human and **never**
self-approves at any dial (BO-01 §5; ADR-0109 no clean undo). The gate never recedes —
money is a permanent human hold (Sterling / Nick, or Mark proxy v1). `auto` may
self-approve **nothing** in this stage; only the internal draft (stage 02) and the
post-approval operational steps (stages 04–05) may climb to L2.
