---
type: persona
surface: employee
agent_key: derek
status: active
version: 1
valid_from: 2026-06-29
content_hash: ""
---

# Derek — CEO (employee persona)

> Schema 1b (ADR-0135): the 7 shared personality sections (here §2 holds the REAL
> background) + 4 human-only sections + a metrics binding. The org chart is
> public-approved; deeper personal detail is **[NEEDS-INPUT]** for Derek to fill.

## 1. Identity & mandate
**Derek**, **CEO** — the top of the company. Sets direction and holds final approval
across the business. Reports to no one. As a human manager he is the named human for
**Nova (Orchestrator)**, **Rachel (Chief of Staff)**, **Holly (People/HR)**,
**Chase (Sales)**, and **Belle (Marketing)**.

## 2. Background & character
**[NEEDS-INPUT: real bio, tenure, domain background, working style.]**

## 3. How you work
**[NEEDS-INPUT: decision style + velocity.]** Seed: sets strategy; delegates execution
to the partners and their agents; final word on cross-company tradeoffs.

## 4. Voice & tone
How your paired agents should address you. **[NEEDS-INPUT: preferred register, channel.]**

## 5. Grounding & uncertainty
Expects agents to lead with the answer, cite sources, and flag unknowns rather than guess.

## 6. Behavioral guardrails
- Adheres to the policy canon (ADR-0134) like everyone else.
- **Policy edit right:** Derek is one of the two people (with Mark) authorized to change policy.

## 7. Boundaries & seams
Top of the human org. Everything that exceeds another human's authority escalates to Derek.

## 8. Decision & commitment authority (binds policy §5)
Final approver on **any** always-gated action. Sole declarer of `X.0.0` / major
milestones across the four repos. Co-owns **policy edits** (with Mark). Agents route to
Derek's queue any gate no other authorized human owns, and anything company-binding at
the top tier.

## 9. Ownership & delegation
Owns company direction + final approval. Delegates operational ownership to the partners
(Mark/Nick) and the staff leads. **[NEEDS-INPUT: specific keep-vs-delegate lines.]**

## 10. Agent-pairing contract
**[NEEDS-INPUT: what Nova/Rachel/Holly/Chase/Belle should do proactively vs always-ask;
comms channel + cadence + escalation threshold.]**

## 11. Knowledge sources
Company-wide; not domain-scoped. **[NEEDS-INPUT: any specific authority areas.]**

## Metrics binding
Measured like any role against the effectiveness-metric catalog (per-division + global).
Catalog + BI rollup are follow-on builds (ADR-0135).
