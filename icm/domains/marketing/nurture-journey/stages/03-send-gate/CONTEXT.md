# Stage 03 — send-gate

**Job:** route a drafted journey send through the consent gate — opt-out and frequency
hard stops at send time — escalating a new/large-audience posture to an always-gate
blast.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Drafted send | stage 02 output | the send awaiting the gate | what's being sent + its A/B variant |
| Send record | `` `okf:campaign_send` `` | this send | the per-send fact to gate and fire (ADR-0058) |
| Recipient consent | `` `okf:consent_event` `` | the recipient | CAN-SPAM / opt-out basis at send time |
| Campaign | `` `okf:campaign` `` | the journey's campaign | attribution + frequency-cap context |

## Process

1. `[script]` **Consent gate, per recipient, at send time** (`consent.check`):
   CAN-SPAM basis, opt-out state, and frequency caps. A non-consented or opted-out
   recipient is **dropped** — a hard filter, not advisory. An over-cap send is held.
2. `[script]` Classify audience posture from the send descriptor: **routine**
   (known audience, within frequency cap) vs **blast** (new or materially larger
   audience).
3. `[sonnet]` Emit the send as a Campaign Send ProposedAction → the gauntlet. A
   **routine** send carries the L3 known-audience rung (ADR-0128); a **blast**
   escalates to `always_gate` (CONSTITUTION §5.4) — staged, never auto. Present the
   **4-part easy-button** (A4): the drafted send + the grounded why + one-click
   **Fire** + the audience/recipient-count preview.

## Outputs

`proposed-send.md` — the consented recipient set (with drops noted), the audience
posture (routine | blast), the per-send action, and the gauntlet routing decision.

## Audit

- [ ] Per-recipient consent checked at send time; opt-out / over-cap recipients dropped
- [ ] Audience posture classified (routine | blast); a blast is marked `always_gate`
- [ ] The easy-button carries the recipient-count / audience preview
- [ ] Send exits only through the ADR-0058 path — no second send path opened

## Checkpoint

**Human approves / edits the send in the cockpit.** In `draft` mode every send parks.
In `auto` mode, stage 03 may self-approve **only a routine** known-audience send —
within frequency caps, consent-clean, with a clean audit (the L3 carve-out). A
**blast** (new or materially larger audience), any **consent/opt-out failure**, or
**any audit failure** parks for a human in every mode.
