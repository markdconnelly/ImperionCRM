# BO-09 — Legal & Contract Lifecycle

> Distinct Business Operations policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Business Operations Program](BO-00-business-operations-program.md). Governs how
> Imperion drafts, reviews, approves, executes, and retains contracts and legal documents — read
> the **same way by a human and by the Legal agent**. The anchoring rule: **the Legal agent drafts,
> reviews, and routes; only a human with signing authority executes a contract.**

| Field | Value |
| --- | --- |
| **Policy ID** | `BO-09` |
| **Title** | Legal & Contract Lifecycle |
| **Category** | Business Operations |
| **Tier** | distinct |
| **Human owner** | Chief of Staff (Derek) |
| **Governing for (agents)** | Laurel (Legal) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [BO-00](BO-00-business-operations-program.md) + Data Classification & Handling (Cybersecurity) |

**Framework Alignment:** contract law (offer/acceptance, authority to bind, e-signature validity —
ESIGN/UETA) · employment & commercial law (where applicable) · records-retention obligations ·
AICPA SOC 2 (CC1 Control Environment) · NIST AI RMF (Manage).

---

## 1. Purpose
This policy governs the full lifecycle of contracts and legal documents — intake, drafting, review,
approval authority, e-signature execution, and retention. It exists so Imperion only binds itself
through people who are authorized to bind it, so every contract is reviewed against legal and
commercial standards before signature, and so executed agreements are retained and findable. A
human reads it and knows who may sign what; the Legal agent reads it and knows it may prepare and
route but never execute.

## 2. Scope
**Who:** all employees who originate, negotiate, or sign agreements; the Chief of Staff; and the
Legal agent (Laurel). **What:** client MSAs/SOWs, vendor and procurement contracts, NDAs,
employment and contractor agreements, amendments and renewals, and the Operating Procedures for
contract intake → review → approval → e-sign → retention (Streams 02, 03, and G&A in Stream 10),
including the DocuSign/e-sign touchpoint. Binds humans and the agent identically except where §5
narrows the agent. Contract execution is **external commitment** and is gated per BO-00 §4.

## 3. Definitions
- **Execution:** the act that legally binds Imperion — a signature (wet or electronic) by a person
  with signing authority. Distinct from drafting, review, and routing.
- **Signing authority:** the documented authority of a named role to bind Imperion to a contract of
  a given type and value (the authority matrix is maintained by the Chief of Staff).
- **Contract review:** the legal/commercial check of terms (liability, indemnity, IP, term/
  termination, data protection, pricing) before approval.

## 4. Policy Statements
1. **No commitment without authority.** Imperion is bound only by a person with documented signing
   authority for that contract type and value (placeholder matrix: contracts up to ___________ →
   ___________; above ___________ → ___________; non-standard terms → ___________). No actor signs
   above their authority; no contract is executed without the required prior review.
2. **Review before approval, approval before signature.** Every contract is reviewed against the
   legal/commercial standard (§3) and approved by the authorized human before it is sent for
   signature. Non-standard or high-risk terms escalate to the Chief of Staff / counsel.
3. **Standard templates and clause library.** Where a standard template or approved clause exists,
   it is used; deviations are flagged and justified in review.
4. **E-signature is the execution channel.** Contracts execute through the approved e-sign platform
   (DocuSign); a contract is "executed" only when fully signed. Signature requests are sent by an
   authorized human, not an agent.
5. **Retention.** Executed contracts and their key metadata (parties, effective/term dates, renewal/
   notice dates, value) are retained for the required period (placeholder: _________ years after
   expiry/termination) in the designated store, and surfaced for renewal/notice management.
6. **Confidentiality & privilege.** Contract content and any privileged legal material are
   confidential; not disclosed across client or employee boundaries; handled per Data Classification.
7. **No fabrication of legal fact.** No actor invents terms, clauses, obligations, or legal advice;
   drafts cite the template/source; uncertainty is escalated to a human, never papered over.

## 5. Application to Autonomous Agents
**The dual-audience core.** For contract actions this policy governs:

- **Autonomy ceiling.** **Laurel (Legal) tops at L2** — internal, reversible work: **draft**
  contracts from approved templates, **review** incoming contracts and redline against the standard,
  flag risk/non-standard terms, summarize obligations and key dates, and **route** for human review
  and approval. It performs no external act.
- **`always_gate` actions (dial-proof floor).** **Contract execution** (sending for signature and
  the signature itself), **final approval to bind**, and any **commitment of Imperion to terms** are
  `always_gate` at every dial level — human decisions by the authorized signer (external commitment,
  BO-00 §4). No dial can auto-execute a contract. Laurel never sends a signature request and never
  signs.
- **Human-in-loop & easy-button.** Laurel drives the document to ready: clean draft, redline,
  risk summary, and the routing assembled, then hands the authorized human a **one-click** approve /
  send-for-signature easy-button; the human commits and the backend (via the gauntlet) actuates the
  e-sign send.
- **Escalation & refusal.** Laurel escalates non-standard terms, authority-matrix breaches, and
  anything it cannot ground in a template or source. It does not give binding legal advice as fact
  and does not disclose privileged or cross-boundary contract content.
- **Evidence.** Each agent action writes the tracer: documents read/drafted, risks flagged, the
  routing/approval presented, and the human's decision — tying execution to an accountable,
  authorized signer.

## 6. Roles & Responsibilities
| Actor | Responsibility |
| --- | --- |
| Chief of Staff (Derek) | Own this policy, the authority matrix, templates, and retention; approve/execute within authority; escalation point. |
| Contract originators (human) | Initiate intake; provide deal/commercial context; negotiate within authority. |
| Authorized signers (human) | Approve and execute contracts within their authority; commit the easy-buttons. |
| Laurel (Legal agent) | Draft, review/redline, summarize, route, advise (L2); prepare easy-buttons; never executes or signs. |
| Audit (Grace/Vera) | Verify authority adherence, review-before-signature, and retention. |

## 7. Enforcement & Audit
The execution and approval gates enforce structurally (the agent has no e-sign send path; execution
crosses the gauntlet to an authorized human). Authority-matrix adherence, review-before-signature,
and retention are sampled in the Audit & Compliance sweep and eval goldens. The
[coverage-matrix](../coverage-matrix.md) proves binding. Binding Imperion without authority, or
executing without review, is a serious violation — for humans, discipline up to termination; for
agents, dial reduction or kill-switch.

## 8. Related
**Procedures governed:** contract intake → review → approval → e-sign → retention (Streams 02/03,
G&A in 10); the DocuSign touchpoint. **Related policies:**
[BO-02 Sales, Pricing & Commitment Authority](BO-02-sales-pricing-and-commitment-authority.md) ·
[BO-03 Procurement & Vendor Commitment](BO-03-procurement-and-vendor-commitment.md) ·
[BO-10 Human Resources & People](BO-10-human-resources-and-people.md). **ADRs:** ADR-0128/0109/0058 ·
ADR-NNNN (policy-canon architecture).
