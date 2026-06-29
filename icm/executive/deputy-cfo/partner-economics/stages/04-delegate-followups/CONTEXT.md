# Stage 04 — delegate-followups

**Job:** OPTIONAL — for a grounded, cited flag, emit a proposed delegate to Bridget
and/or a handoff to Nova, then park. Never actuate.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Oversight + flags | stage 03 `brief.md` | flagged items only | what a follow-up would address |
| Partnerships run ledger | `agent_run` (run ledger, via pg.read) | Bridget's current load | confirm the owner + avoid duplicate routing |

## Process

1. `[sonnet]` For each flag, confirm it is grounded and cited; an ungrounded flag
   parks for Nick (no delegate). A recall miss is "I don't know," not a guess
   (CONSTITUTION §8).
2. `[sonnet]` For a grounded MDF/referral flag, draft a **proposed** `delegate()` to
   **Bridget** (Partnerships) — the owning sub-agent; state the flag, the exposure,
   and the ask. The MDF spend and the referral payout are money actions that
   **re-gate (always-gated) inside Bridget's gauntlet** — Sterling proposes the
   follow-up, never the money move.
3. `[sonnet]` When the matter spans divisions, draft a `handoff()` to **Nova**
   instead of (or alongside) the delegate.
4. `[script]` Park the proposed delegate/handoff for the checkpoint. No send, no
   write, no money moved. Finance stays read-only.

## Outputs

`followups.md` — the proposed `delegate()` to Bridget and/or `handoff()` to Nova
for each grounded flag, each naming the flag, the exposure, and the owner. The run
ends here at the checkpoint; nothing is actuated.

## Audit

- [ ] Every delegate/handoff traces to a grounded, cited flag; ungrounded flags parked
- [ ] Delegate targets Bridget (MDF/referral); cross-division matters handed off to Nova
- [ ] The money effect (MDF spend, payout) is left always-gated inside Bridget — not actuated here
- [ ] Read-only — no financial record written, no money moved
- [ ] No send/write/actuation occurred — Sterling delegated or parked

## Checkpoint

The proposed delegate/handoff parks for **Nick**. `auto` may self-approve ONLY
delegating a grounded, cited MDF/referral follow-up to Bridget (and/or handing off
to Nova when cross-division); the money effect stays always-gated inside Bridget's
gauntlet. Sterling never actuates; finance never leaves read-only. Any ungrounded
flag or gap parks for Nick (CONSTITUTION §8/§9).
