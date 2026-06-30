# Stage 03 — execute-track  ·  CHECKPOINT

**Job:** the human-gated executive recovery send, then track the save to resolution.
(💤 dormant until the substrate hydrates — #991 + #1369/#1370, ADR-0123.)

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Recovery plan | `recovery-plan.md` (stage 02 output) | full | the touch + save plan + consent basis + routings |
| Recipient | silver `contact` · `okf:contact` | the at-risk exec/decision contact | resolve the send target |
| Consent basis | silver `consent_event` · `okf:consent_event` | latest for the contact | re-assert consent at execution |

## Checkpoint

The approval item shows: the executive recovery touch, the incident + at-risk relationship
picture and its signals, the recovery posture, the save plan, the consent basis, and the
binding/out-of-seam routings. Approver may edit the body before approving; edits are kept as
the sent version and recorded.

**`auto` may NOT self-approve the send at ANY rung.** This is acute + executive +
relationship-sensitive, so **every** executive recovery send **parks for a human in every
mode** (unlike 08-D, where a routine save may auto at L3). And every binding commitment
(credit → Audrey/08-P · SLA → human · price → human · remediation → Felix/Datto) parks at
every rung. The NO-COMMITS-EVER and MSSP-advisory ceilings are dial-proof (celeste.md
guardrails 1–2).

## Process

1. Park until a human approves — there is no auto path for this send.
2. Send via the ADR-0058 approval-gated path — consent re-asserted at execution, sender = the
   client-success mailbox (email) or page/channel identity (DM). **No other send route exists
   for this workflow.** The body carries no commitment; a commitment ask never ships — it is
   routed to its seam, not softened into a promise.
3. `[haiku]` Log the touch to the `interaction` timeline: sent body, channel, approver (human
   id), the incident it answered, run id.
4. `[script]` Track to resolution: note the **open save thread** (the watch-items + recovery
   call), and confirm the binding routings are live — **SLA-credit handed to Audrey / 08-P**,
   **remediation tracking handed to Felix**. The relationship thread stays Celeste's; the
   binding work is the seam's.

## Outputs

`recovery-record.md` — the sent version, timestamp, approver, send-path result, the logged
timeline entry id, the open save thread, and the confirmed seam hand-offs (Audrey/08-P ·
Felix). Rejection ends the run with the rejection reason captured. Terminal stage.

## Audit

- [ ] Approver identity recorded (never blank; never `auto` — this send is always human-gated)
- [ ] Consent re-assertion result logged (basis ≠ `none`)
- [ ] Sent body carries NO binding commitment (commitment asks routed to seam, not shipped)
- [ ] SLA-credit handed to Audrey / 08-P and remediation handed to Felix where applicable
- [ ] Timeline entry id present; the open save thread noted
