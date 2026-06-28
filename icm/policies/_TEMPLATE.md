# _TEMPLATE — Imperion policy (dual-audience)

> **Not a policy.** This is the authoring template + conventions for every policy in the
> Imperion policy canon. Copy it, fill every section, delete these guide notes. A policy is
> read the **same way by a human employee and by an AI agent** — write plain language, then
> make the agent obligations explicit in the *Application to autonomous agents* section.
> Numbering: `CS-NN` (Cybersecurity) · `IT-NN` (Information Technology) · `BO-NN` (Business
> Operations); `NN-00` is the category umbrella. The root `00-imperion-operating-policy-and-
> code-of-conduct.md` is the top umbrella every policy inherits from. Governance framework
> terms (autonomy ladder, dial, gauntlet, `always_gate`, easy-button, pool principle) are
> defined ONCE in the top umbrella; policies localize them, never redefine them.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-NN` / `IT-NN` / `BO-NN` |
| **Title** | <Verb-noun or noun-phrase> |
| **Category** | Cybersecurity \| Information Technology \| Business Operations |
| **Tier** | umbrella \| distinct \| procedure-specific |
| **Human owner** | <role — e.g. CISO, CTO, Deputy CFO> |
| **Governing for (agents)** | <the agent(s) this policy primarily governs — e.g. Cyrus, Ozzie; or "all agents"> |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | the top umbrella + [category umbrella] + <cross-cutting policies> |

**Framework Alignment:** <NIST CSF 2.0 · SOC 2 TSC · NIST AI RMF — where applicable>

---

## 1. Purpose
What this policy governs and why it exists, in one short paragraph a new hire (or a newly
onboarded agent) understands.

## 2. Scope
**Who:** which humans (roles) AND which agents are bound. **What:** the activities, systems,
data classes, and the **Operating Procedures / Procedure Steps** this policy governs (link the
catalog entries). State explicitly that the policy binds humans and agents identically except
where the *Application to autonomous agents* section narrows or gates an agent's authority.

## 3. Definitions
Only terms unique to this policy. Defer canonical terms to CONTEXT.md; defer governance terms
to the top umbrella.

## 4. Policy Statements
The binding rules, plain language, numbered. Written actor-neutral ("the responsible party…")
so a human and an agent read the same obligation. Each statement is testable.

## 5. Application to Autonomous Agents
**The dual-audience core.** For the actions this policy governs, state for the agent:
- **Autonomy ceiling** — the highest ladder level (L0–L5, ADR-0128) an agent may reach for
  these actions, and which agent(s).
- **`always_gate` actions** — the steps that require a human decision at *every* dial level
  (the dial-proof floor): what they are and who approves (the easy-button presentation).
- **Human-in-loop & easy-button** — how human involvement recedes as the dial climbs, and the
  one-click resolution the agent prepares at each gate (top-umbrella P3).
- **Escalation & refusal** — what the agent must escalate vs may decide; any refusal-class
  action (stronger than a gate).
- **Evidence** — what the agent must log (the tracer write / audit record) for these actions.

## 6. Roles & Responsibilities
A short table: the human role(s) and the agent(s), each with their responsibility under this
policy. Humans and agents appear in the same table — one workforce.

## 7. Enforcement & Audit
How adherence is verified (the gauntlet, the eval goldens, the conformance/audit sweep, the
coverage-matrix entry), and the consequence of a violation.

## 8. Related
**Procedures governed:** <catalog links>. **Related policies:** <CS/IT/BO links>. **ADRs:**
<the decisions behind the agent-governance clauses, e.g. ADR-0128/0109/0058>.
