# Stage 03 — park-log  ·  CHECKPOINT

**Job:** get the next-step proposal approved, park it on the `opportunity` (an
internal, reversible write), and log the call's outcome — idempotently — closing
the run. No customer-facing action.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Extract | stage 02 `extract.md` | all | the outcome + next-step being approved/parked |
| Grounding | stage 01 `ground.md` | interaction id, opportunity id, as-of | what the approver is deciding on |
| Opportunity | silver `opportunity` · `okf:opportunity` | this deal | current stage for the next-step park |

## Checkpoint

The approval item shows: the call outcome, the proposed next-step, the opportunity
id + stage, and the cited interaction basis. Approver may edit the next-step before
approving; edits are kept as the parked version and recorded.

**`auto` mode may self-execute ONLY** the **internal, reversible next-step park** on
the opportunity (`opportunity.write`) at **L2** (A10 row 1, ADR-0128) — `extract.md`
audit fully green and traced to the interaction. The interaction itself is the
conv-intel substrate's to write, not this stage's (no `interaction.write` here).
**No customer-facing action happens in this stage at any rung** — any actual
follow-up touch routes to `pursue-opportunity` (02-A3), where it re-inherits that
workflow's always_gate (BO-02 §5; Chase has no commitment send path).

## Process

1. Park until human-approved — or auto-approve **only** the internal next-step park
   if all L2-internal gates hold (above).
2. `[opportunity.write]` Park the approved next-step on the `opportunity` —
   internal, reversible, no customer-facing effect — **idempotency-keyed**
   (opportunity + interaction) so a replay is a no-op + audit note (A9b). Never
   write the `interaction` here; never trigger an outbound touch.
3. `[script]` Log the call outcome + the parked next-step + approver (human id or
   `auto`) + run id to the run record, idempotently (A9b).

## Outputs

`park-log.md` — the parked next-step (with the opportunity write id/result), the
logged outcome, approver, timestamp. Rejection ends the run with the rejection
reason captured. One terminal state.

## Audit

- [ ] Approver identity recorded (never blank; `auto` only if all L2-internal gates held)
- [ ] Only the internal next-step parked — no `interaction` write, no customer-facing send (boundary enforced)
- [ ] Opportunity write + log idempotency-keyed — a replay is a no-op, not a duplicate (A9b)
- [ ] Run closed with exactly one terminal state (parked / rejected)
