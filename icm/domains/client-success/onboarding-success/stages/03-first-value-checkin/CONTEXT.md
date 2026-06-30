# Stage 03 — first-value-checkin  ·  CHECKPOINT

**Job:** draft the consent-gated first-value check-in, recommend the first QBR (08-C),
and seed the Account Success Plan (08-B) — the check-in send parks for a human (routine
templated may auto at L3). (💤 dormant until the substrate hydrates — #991 + #1369/#1370,
ADR-0123.)

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Adoption status | `adoption-status.md` (stage 02 output) | full | the milestone read + disposition + churn-risk routing |
| Recipient | silver `contact` · `okf:contact` | the client contact | resolve the check-in target + relationship context |
| Consent basis | silver `consent_event` · `okf:consent_event` | latest for the contact | gate the send (no consent, no outreach) |
| Adoption rubric | `./skills/adoption-rubric.md` | all | check-in framing + NO-COMMITS + non-interest + in-seam discipline |

## Checkpoint

The approval item shows: the first-value check-in draft, the adoption / first-value
picture + its signals, the QBR recommendation, the Account Success Plan seed, and the
consent basis. Approver may edit the body before approving; edits are kept as the sent
version and recorded.

**`auto` (L3) may self-approve ONLY when ALL hold:** the check-in is a **routine,
templated** welcome / first-value touch · channel = email or DM · stage-02 audit fully
green · consent basis ≠ `none` · the draft carries no commitment. **Everything else parks
for a human in every mode** — the client-facing send at the manifest default (L2), every
**relationship-sensitive** touch, and every binding commitment (SLA / credit / pricing /
spend / security-remediation), at every rung. The NO-COMMITS-EVER and MSSP-advisory
ceilings are dial-proof (celeste.md guardrails 1–2).

## Process

1. `[sonnet]` Draft the warm first-value check-in in Celeste's voice — acknowledge the
   onboarding, offer help / a check-in, open a conversation. It **asks**, it never
   **promises**: no SLA / credit / price / roadmap commitment in the body (NO-COMMITS-EVER,
   dial-proof, guardrail 1). Flag any **non-interest upsell** explicitly; expansion value
   mints an opportunity → **Chase**, never folded into the check-in (guardrail 4).
2. `[script]` Assert a current consent basis (`consent.check`) for the recipient. Basis
   `none` → the send parks with the reason; no outreach (ADR-0058).
3. `[sonnet]` Recommend **scheduling the first QBR** (`qbr-prep`, 08-C) and **seed the
   Account Success Plan** (`account-success-plan`, 08-B) from the onboarding read — the
   durable downstream of this motion.
4. Park the client-facing send until approved (or auto-approve per the checkpoint gate
   above), then send via the ADR-0058 approval-gated path — consent re-asserted at
   execution, sender = the client-success mailbox (email) or page/channel identity (DM).
   **No other send route exists for this workflow.** A commitment ask never ships — it
   parks for a human.
5. `[haiku]` Log the touch to the `interaction` timeline: sent body, channel, approver
   (human id or `auto`), the milestone read it answered, run id.

## Outputs

`first-value-record.md` — the sent version, timestamp, approver, send-path result, the
logged timeline entry id, the QBR recommendation, and the Account Success Plan seed.
Rejection ends the run with the rejection reason captured. Terminal stage.

## Audit

- [ ] Approver identity recorded (never blank; `auto` only if ALL checkpoint gates held)
- [ ] Consent re-assertion result logged (basis ≠ `none`); basis `none` parked the send
- [ ] Sent body carries NO binding commitment (commitment asks parked, not shipped)
- [ ] Relationship-sensitive / non-routine check-in was human-approved (never auto)
- [ ] Any non-interest upsell flagged; expansion routed to Chase, not folded in
- [ ] QBR recommendation made and Account Success Plan seeded
- [ ] Timeline entry id present
