# Stage 03 — send-gate

**Job:** route the send as a ProposedAction through the gauntlet to the cockpit,
escalating a new/materially-larger audience to an always-gate blast.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brief | stage 01 output | all | the built copy + the substantiation refs + audience descriptor |
| Consented list | stage 02 output | all | the filtered, consent-clean recipient basis |
| The send record | `` `okf:campaign_send` `` | this send | the send to propose |

## Process

1. `[script]` Classify the send posture from the stage-01 descriptor + the consented
   counts: **routine** (known/established audience, within frequency cap) vs **blast**
   (new or materially larger audience).
2. `[sonnet]` Emit the send as a ProposedAction → the gauntlet. A **routine** send
   carries the L3 routine-send rung (ADR-0128); a **blast** escalates to
   `publish_blast_new_or_large_audience` = `always_gate` (ADR-0136 A2 class-2) — staged,
   never auto.
3. `[script]` Present the **4-part easy-button** (A4): the drafted send + the grounded
   why (substantiation refs) + one-click **Fire** + the audience/recipient-count preview
   (eligible vs dropped).

## Outputs

`proposed-send.md` — the send action, the audience posture (routine | blast), the
substantiation summary, the recipient-count preview, and the gauntlet routing decision.

## Audit

- [ ] Audience posture classified (routine | blast); a blast is marked `always_gate`
- [ ] Substantiation summary attached for every claim (no unsourced claim proceeds)
- [ ] The recipient basis is the stage-02 consent-clean list (no non-consented recipient)
- [ ] Money (paid boost/ad) is NOT in this action — that is procedure 01-B/01-C

## Checkpoint

**Human approves / edits the send in the cockpit.** In `draft` mode every send parks. In
`auto` mode, stage 03 may self-approve **only a routine** send — consent-clean, to a
known/established audience, within frequency caps, with a clean audit (the L3 routine
carve-out, execute-then-notify). A **blast** (new/materially-larger audience), any
**unsubstantiated** claim, an **opt-out/consent violation**, or **any audit failure**
parks for a human in every mode.
