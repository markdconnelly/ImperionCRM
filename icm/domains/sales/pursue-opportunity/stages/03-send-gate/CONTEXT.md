# Stage 03 — send-gate  ·  CHECKPOINT

**Job:** get the touch approved (human or, only for the carve-out, auto), then
send it through the ADR-0058 path and capture the send record.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Touch | stage 02 `touch.md` | all | the thing being approved |
| Grounding | stage 01 `ground.md` | opportunity id, as-of | what the approver is deciding on |
| Consent | consent ledger · `okf:consent_event` | this contact's entries | consent re-assertion at send |

## Checkpoint

The approval item shows: touch body, rationale, opportunity id + stage, touch
class, and consent basis. Approver may edit the body before approving; edits are
kept as the sent version and recorded.

**`auto` mode may self-approve ONLY** the B7 transactional-acknowledgement
carve-out (`./skills/pursuit-rules.md`) at **L3** — touch class =
`transactional-ack`, stage-02 audit fully green, consent basis clean. **Every
communicative/committal touch always parks for a human** in every mode, dial-proof
(ADR-0128, BO-02 §5). **Any pricing/discount/term assertion or send-for-signature
always parks** — Chase has no send path for commitments (chase.md §6).

## Process

1. Park until human-approved — or auto-approve **only** if all carve-out gates
   hold (above).
2. `[send.email]` / `[send.dm]` Send via the ADR-0058 approval-gated path —
   consent re-asserted at execution, sender = shared sales mailbox (email) or
   page identity (DM). **No other send route exists for this workflow.**
3. `[haiku]` Capture the sent version, channel, approver (human id or `auto`),
   and send-path result.

## Outputs

`send-record.md` — sent version, timestamp, approver, send-path result. Rejection
ends the run with the rejection reason captured.

## Audit

- [ ] Approver identity recorded (never blank; `auto` only if all carve-out gates held)
- [ ] No committal/pricing touch auto-approved (always-gate enforced)
- [ ] Consent re-assertion result logged
