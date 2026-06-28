# Stage 02 — plan-intervention

**Job:** decide watch vs intervene, draft the save outreach, and assert consent.
(💤 dormant until the substrate hydrates — #1046 + #1369/#1370, ADR-0123.)

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Health verdict | `health.md` (stage 01 output) | full | the at-risk flag + its signals |
| Account + contacts | silver `account` / `contact` · `okf:account` `okf:contact` | the at-risk client | the outreach recipient + relationship context |
| Consent basis | silver `consent_event` · `okf:consent_event` | latest for the contact | gate the send (no consent, no outreach) |
| Intervention rubric | `./skills/intervention-rubric.md` | all | watch-vs-intervene + routine-vs-sensitive + non-interest |

## Process

1. `[sonnet]` Decide **watch vs intervene** per the rubric. Watch → flag + log, no outreach
   this run. Intervene → continue.
2. `[sonnet]` Classify the intervention **routine vs relationship-sensitive** per the rubric
   (major incident, escalated/exec relationship, high stakes → relationship-sensitive). When
   in doubt, treat as relationship-sensitive.
3. `[sonnet]` Draft the save outreach in Celeste's voice — warm, business-framed, in the
   client's interest. It **asks**, it never **promises**: no credit / SLA / price /
   remediation / roadmap commitment in the body (NO-COMMITS-EVER, dial-proof, guardrail 1).
   Flag any **non-interest upsell** explicitly; a save is never a disguised sell (guardrail 4).
4. `[script]` Assert a current consent basis (`consent.check`) for the recipient. Basis `none`
   → the run parks with the reason; no send (ADR-0058). Out-of-seam needs (expansion → Chase,
   security → vCISO, a required commitment → human) are routed here, not actioned.

## Outputs

`intervention.md` — the disposition (watch / intervene), the routine-vs-sensitive
classification, the drafted save outreach (commitment-free), the asserted consent basis, and
any out-of-seam routings (Chase / vCISO / human queue). Watch → run ends.

## Audit

- [ ] Disposition (watch / intervene) stated with its rubric rationale
- [ ] Intervention classified routine vs relationship-sensitive
- [ ] Draft carries NO binding commitment (credit / SLA / price / remediation / roadmap)
- [ ] Consent basis asserted; basis `none` parks the run (never proceeds to send)
- [ ] Any non-interest upsell flagged; expansion/security routed to seam, not actioned
