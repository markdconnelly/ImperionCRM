# Stage 04 — handoff-chase

**Job:** assemble the attributed, classified opportunity into a parked hand-off
proposal for Chase — the checkpoint where a human approves routing the deal to the
close.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Ground record | stage 01 `ground.md` | all | the resolved context |
| Attribution | stage 02 `attribution.md` | all | the partner + contribution |
| Routing | stage 03 `routing.md` | all | deal type + conflict status |
| Opportunity | silver `opportunity` · `okf:opportunity` | the opportunity if opened | the close target Chase owns |

## Process

1. `[script]` Assemble the hand-off packet: partner + attribution + deal type +
   account + opportunity ref (if any) + the channel-conflict status.
2. `[sonnet]` Draft the hand-off note to Chase — the partner-sourced context and
   the attribution to stamp on the opportunity, in two or three sentences. This is
   a *proposal*: Bridget does not open, modify, or close the opportunity, commit
   terms, or move money (the close is Chase's; BO-02 §5).
3. `[script]` Park the packet for human approval. A `channel_conflict = true` from
   stage 03, an `attribution_confidence = needs-human`, or any prior audit failure
   parks unconditionally (never auto-hand-off a contested or ungrounded deal).

## Outputs

`handoff.md` — the hand-off packet + the drafted note to Chase, parked for human
approval (the attribution to be stamped on the opportunity by Chase's workflow,
not here).

## Audit

- [ ] The packet names the partner, deal type, account, and attribution
- [ ] No opportunity write, term commitment, or money movement is proposed here (Chase owns the close)
- [ ] Conflicted / `needs-human` / audit-failed runs are parked, not handed off

## Checkpoint

**Human approves the hand-off to Chase.** When `auto` (admin-flipped), the run may
self-approve ONLY a `clear`, `grounded`, audit-clean hand-off; a channel-conflict
collision, a `needs-human` attribution, any commitment/money, or any audit failure
parks for a human in every mode (Bridget's L3 ceiling; CONSTITUTION §5.4).
