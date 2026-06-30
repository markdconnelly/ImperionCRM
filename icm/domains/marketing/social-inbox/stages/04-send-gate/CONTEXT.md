# Stage 04 — send-gate

**Job:** route the brand reply as a Social Action through the gauntlet to the
cockpit, with the consent/window check applied before it can send.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Draft reply | stage 03 output | each brand reply | what's being sent + its class + substantiation |
| Recipient consent | `` `okf:consent_event` `` | the reply's recipient | per-recipient consent basis at send time |
| Routing decision | stage 02 output | each item | confirm it's brand-keep, not a refused/routed item |

## Process

1. `[script]` **Consent + window check** (`consent.check`): confirm a valid basis to
   reply in-channel and that any reply-window constraint is met — a hard filter, not
   advisory (BO-01 §5). Non-eligible → drop, never send.
2. `[sonnet]` Emit the reply as a Social Action (`send.dm` via the gauntlet,
   ADR-0058). A **templated non-committal** reply to a **lead** carries the L3
   carve-out; a **free-text** reply stays gated; a reply to an **existing customer**
   never reaches this stage (refused at stage 02).
3. `[script]` Present the **4-part easy-button** (A4): the drafted reply + the
   grounded why (substantiation refs) + one-click **Send** + one-click **retract**
   (the reversible inverse), with the recipient/consent basis shown.

## Outputs

`proposed-reply.md` — the per-item reply actions, the reply class
(templated-ack | free-text), the consent basis, and the gauntlet routing decision.

## Audit

- [ ] Consent + window checked per recipient; non-eligible dropped, not sent
- [ ] Substantiation ref attached for every claim (no unsourced reply proceeds)
- [ ] The easy-button carries the reversible inverse (retract)
- [ ] Money (boost/ad) is NOT in this action — that is procedure 01-B/01-C

## Checkpoint

**Human approves / edits the reply in the cockpit.** In `draft` mode every reply
parks. In `auto` mode, stage 04 may self-approve **only a templated, non-committal
reply to a LEAD** — execute-then-notify at L3 (the B7 carve-out). A **free-text**
reply stays gated; a reply to an **existing customer** never sends (refused
upstream); **any audit failure** parks for a human in every mode.

### The a/b/c outcome contract

The checkpoint is a **three-way** outcome (the SOP exemplar, `../../sop.md` step 04;
ADR-0136 B7). The human's decision lands at the backend approval choke point
(`src/functions/agent/approve.ts`, `agent_pending_action` / migration 0158):

- **a — approved** → dispatch via the `meta-organic` adapter
  (`src/shared/meta-organic.ts`), **test-stage gated** behind `META_SOCIAL_*_TEST_STAGE`
  (fail-closed; dormant → honest no-op) → stage 05. Writes `approval.decided`.
- **b — approved with feedback** → record `feedback.recorded` **and** re-enter stage 03
  with the feedback as input → produce **v2** → **re-park this stage** for a one-tap final
  approve (bounded revise-cap). v2 **still parks** — never auto-sends. Depends on the
  backend **`revise`** outcome (markdconnelly/ImperionCRM_Backend#498; `approve.ts` carries
  `approve | reject | edit | feedback` today).
- **c — denied** → record `feedback.recorded` → **drop the draft** → if the thread still
  owes a reply, **route it to the operator queue** (no silent drop). Depends on the backend
  **deny-route** (markdconnelly/ImperionCRM_Backend#499).

The a/b/c events (`approval.decided` / `feedback.recorded`) are the **learning signal** →
eval-harvest (#1037) → earned-autonomy raises the dial (ADR-0109). v1 = human-approves-all.
