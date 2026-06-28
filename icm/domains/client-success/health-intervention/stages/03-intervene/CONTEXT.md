# Stage 03 — intervene  ·  CHECKPOINT

**Job:** the consent-gated save-outreach send — routine may auto at the earned rung,
relationship-sensitive parks — then log it. (💤 dormant until the substrate hydrates —
#1046 + #1369/#1370, ADR-0123.)

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Intervention | `intervention.md` (stage 02 output) | full | the draft + classification + consent basis |
| Recipient | silver `contact` · `okf:contact` | the at-risk client contact | resolve the send target |
| Consent basis | silver `consent_event` · `okf:consent_event` | latest for the contact | re-assert consent at execution |

## Checkpoint

The approval item shows: the save-outreach draft, the at-risk picture + its signals, the
routine-vs-sensitive classification, and the consent basis. Approver may edit the body before
approving; edits are kept as the sent version and recorded.

**`auto` (L3) may self-approve ONLY when ALL hold:** classification = **routine** · channel =
email or DM · stage-02 audit fully green · consent basis ≠ `none` · the draft carries no
commitment. **Everything else parks for a human in every mode** — every
relationship-sensitive intervention, and every binding commitment (credit / SLA / pricing /
spend / security-remediation), at every rung. The NO-COMMITS-EVER and MSSP-advisory ceilings
are dial-proof (celeste.md guardrails 1–2).

## Process

1. Park until approved (or auto-approve per the checkpoint gate above).
2. Send via the ADR-0058 approval-gated path — consent re-asserted at execution, sender = the
   client-success mailbox (email) or page/channel identity (DM). **No other send route exists
   for this workflow.** The body carries no commitment; a commitment ask never ships — it
   parks for a human.
3. `[haiku]` Log the touch to the `interaction` timeline: sent body, channel, approver (human
   id or `auto`), the at-risk flag it answered, run id.

## Outputs

`intervention-record.md` — the sent version, timestamp, approver, send-path result, and the
logged timeline entry id. Rejection ends the run with the rejection reason captured.

## Audit

- [ ] Approver identity recorded (never blank; `auto` only if ALL checkpoint gates held)
- [ ] Consent re-assertion result logged (basis ≠ `none`)
- [ ] Sent body carries NO binding commitment (commitment asks parked, not shipped)
- [ ] Relationship-sensitive intervention was human-approved (never auto)
- [ ] Timeline entry id present
