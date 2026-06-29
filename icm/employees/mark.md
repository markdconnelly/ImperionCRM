---
type: persona
surface: employee
agent_key: mark
status: active
version: 1
valid_from: 2026-06-29
content_hash: ""
---

# Mark — CISO (employee persona)

> Schema 1b (ADR-0135). Mark's RICH personal operating profile lives in his personal
> brain (ImperionBrainMark `_me/profile.md`) — a SEPARATE branch, out of scope here.
> This is the company-side employee persona; deeper personal detail is **[NEEDS-INPUT]**.

## 1. Identity & mandate
**Mark**, **CISO** — partner; owns security, risk, and data governance. Reports to Derek.
Human manager for **Roman (Deputy CISO)**, **Jessica (CRO)**, **Cyrus (SOC)**,
**Grace (GRC)**, **Osiris (Identity)**, **Laurel (Legal)**, **Vera (Platform)**,
**Tess (Service Quality)**, and **Alivia (Knowledge)**.

## 2. Background & character
**[NEEDS-INPUT: company bio.]** (Operating-style reference: see ImperionBrainMark `_me/profile.md`.)

## 3. How you work
Seed (from operating profile): terse, one strong recommendation over an options buffet,
challenge-then-execute, signal confidence explicitly, no re-litigation. **[NEEDS-INPUT: confirm for company surface.]**

## 4. Voice & tone
Agents address Mark in his internal register: lead with the answer, dense, dry edge, no
preamble. **[NEEDS-INPUT: confirm.]**

## 5. Grounding & uncertainty
Expects cite-or-say-don't-know; no fabrication; hard truths over comfortable hedges.

## 6. Behavioral guardrails
- Adheres to the policy canon (ADR-0134).
- **Policy edit right:** Mark is one of the two people (with Derek) authorized to change policy.

## 7. Boundaries & seams
Reports to Derek. Owns the security/assurance/legal escalation line; a real incident comes
to Mark immediately (Roman's fast seam).

## 8. Decision & commitment authority (binds policy §5)
Approves/clears all **security · identity · risk · data-governance** always-gates
(CS-02/05/07/08/10/14/17, CS-IR). **Break-glass** authority. Co-owns **policy edits**
(with Derek). Also the named human for Legal (Laurel) and the assurance division (Jessica/
Vera/Tess/Alivia) escalations.

## 9. Ownership & delegation
Owns security posture + governance. Delegates detection/posture/identity execution to
Roman's division; assurance to Jessica's. **[NEEDS-INPUT: keep-vs-delegate specifics.]**

## 10. Agent-pairing contract
**[NEEDS-INPUT: proactive vs always-ask for each paired agent; channel/cadence/escalation.]**
Seed: incidents → immediate; routine posture → daily brief.

## 11. Knowledge sources
Security/risk/compliance authority. **[NEEDS-INPUT.]**

## Metrics binding
Measured against the effectiveness-metric catalog (per-division + global); catalog + BI
rollup are follow-on builds (ADR-0135).
