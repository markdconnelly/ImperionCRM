# Stage 02 — recovery-plan

**Job:** decide the recovery posture, draft the executive recovery touch + save plan, and
assert consent. (💤 dormant until the substrate hydrates — #991 + #1369/#1370, ADR-0123.)

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Incident context | `incident-context.md` (stage 01 output) | full | the rupture facts + relationship signal + exec contact |
| Account + contacts | silver `account` / `contact` · `okf:account` `okf:contact` | the at-risk client | the recovery recipient + relationship context |
| Strategic record | silver `strategic_business_review` · `okf:strategic_business_review` | latest SBR for this account | the strategic re-frame the save plan builds on |
| Consent basis | silver `consent_event` · `okf:consent_event` | latest for the exec contact | gate the send (no consent, no touch) |
| Recovery rubric | `./skills/recovery-rubric.md` | all | recovery-posture + executive-touch/save-plan + NO-COMMITS routing |

## Process

1. `[sonnet]` Decide the **recovery posture** (reassure / recover / escalate-re-seam) per
   the rubric. When in doubt between reassure and recover, treat as **recover**.
2. `[sonnet]` Draft the **executive recovery touch** in Celeste's relationship voice — warm,
   **accountable**, business-framed, in the client's interest. It **acknowledges and asks**,
   it never **promises**: no credit / SLA / price / remediation / roadmap line in the body
   (NO-COMMITS-EVER, dial-proof, guardrail 1).
3. `[sonnet]` Draft the **save plan** — the relationship repair steps (recovery call, open
   questions, watch-items, the strategic re-frame from the SBR). Relationship steps only; it
   carries no binding line. Flag any **non-interest upsell** explicitly; a save is never a
   disguised sell (guardrail 4).
4. `[script]` Route every binding ask out of this workflow per the rubric: **credit →
   Audrey / 08-P** (the only credit path), **SLA → human**, **remediation → Felix / Datto**,
   **price → human**. Out-of-seam needs (expansion → Chase, security → vCISO) are routed
   here, not actioned.
5. `[script]` Assert a current consent basis (`consent.check`) for the exec contact. Basis
   `none` → the run parks with the reason; no send (ADR-0058).

## Outputs

`recovery-plan.md` — the recovery posture, the drafted executive recovery touch
(commitment-free), the save plan (relationship steps only), the asserted consent basis, and
the binding/out-of-seam routings (Audrey/08-P · Felix · human · Chase · vCISO).

## Audit

- [ ] Recovery posture stated with its rubric rationale
- [ ] Executive touch carries NO binding commitment (credit / SLA / price / remediation / roadmap)
- [ ] Save plan is relationship steps only (no binding line)
- [ ] Every binding ask routed to its seam (credit → Audrey/08-P · SLA/price → human · remediation → Felix), not promised
- [ ] Consent basis asserted; basis `none` parks the run (never proceeds to send)
- [ ] Any non-interest upsell flagged; expansion/security routed to seam, not actioned
