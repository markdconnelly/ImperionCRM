# Stage 03 — publish-gate

**Job:** route the publish as a Social Action through the gauntlet to the cockpit,
escalating a large/new-audience posture to an always-gate blast.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Composition | stage 02 output | all | what's being published + the substantiation refs |
| Post record | `` `okf:social_post` `` | this post | the draft to publish |
| Channel rows | `` `okf:social_post_channel` `` | this post's channels | the per-channel publish targets |

## Process

1. `[script]` Classify the audience posture from the composition's descriptor:
   **routine** (established audience, within frequency cap) vs **blast** (new or
   materially larger audience).
2. `[sonnet]` Emit the publish as a Social Action (`social_dispatch`) → the gauntlet.
   A **routine** post carries the L3 routine-post rung (ADR-0128); a **blast**
   escalates to `always_gate` (ADR-0136 A2 class-2) — staged, never auto.
3. `[script]` Present the **4-part easy-button** (A4): the drafted post + the grounded
   why (substantiation refs) + one-click **Publish** + one-click **unpublish** (the
   reversible inverse), with the reach/audience preview.

## Outputs

`proposed-publish.md` — the per-channel publish actions, the audience posture
(routine | blast), the substantiation summary, and the gauntlet routing decision.

## Audit

- [ ] Audience posture classified (routine | blast); a blast is marked `always_gate`
- [ ] Substantiation summary attached for every claim (no unsourced claim proceeds)
- [ ] The easy-button carries the reversible inverse (unpublish)
- [ ] Money (boost/ad) is NOT in this action — that is procedure 01-B/01-C

## Checkpoint

**Human approves / edits the publish in the cockpit.** In `draft` mode every publish
parks. In `auto` mode, stage 03 may self-approve **only a routine** organic post —
pre-substantiated, on-brand, to an established audience, within frequency caps, with a
clean audit (the L3 routine carve-out). A **blast**, any **unsubstantiated** claim, or
**any audit failure** parks for a human in every mode.
