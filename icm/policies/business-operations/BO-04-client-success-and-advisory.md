# BO-04 — Client Success & Advisory

> Distinct Business Operations policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Business Operations Program](BO-00-business-operations-program.md). Governs how
> Imperion advises and retains clients — the line between advising and committing, the conduct
> of QBRs and vCIO/vCISO engagements, and the shared-responsibility boundary in client-facing
> work. Read the same way by the Client lead and by Celeste.

| Field | Value |
| --- | --- |
| **Policy ID** | `BO-04` |
| **Title** | Client Success & Advisory |
| **Category** | Business Operations |
| **Tier** | distinct |
| **Human owner** | Deputy CFO (Nick) / Client lead |
| **Governing for (agents)** | Celeste (Client Success) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [BO-00](BO-00-business-operations-program.md) + AI Acceptable Use · Data Classification & Handling · Privacy & Data Protection |

**Framework Alignment:** SOC 2 (CC1 Control Environment · CC2 Communication) · MSSP
advisory-only conduct (no client identity bleed) · the Client Shared Responsibility boundary
(Cybersecurity).

---

## 1. Purpose

Client success is where Imperion earns retention — through honest advice, well-run reviews, and a
clear-eyed view of each client's posture and roadmap. The risk in advisory work is the casual
commitment: a number, a date, an SLA, or a scope said in a review that the company never
authorized and now must honor. This policy sets the advisory boundary, the unbreakable rule that
no binding commitment is made in an advisory context, and the shared-responsibility line that
keeps client work honest — whether the Client lead or Celeste is in the room.

## 2. Scope

**Who:** the Client lead and client-success staff; vCIO/vCISO and account advisors; the Celeste
agent; anyone (human or agent) who advises a client, runs a QBR, builds a roadmap, or speaks to
client posture. **What:** Quarterly Business Reviews (QBRs), vCIO and vCISO advisory engagements,
health/posture reporting, roadmap and recommendation development, retention/renewal advisory, and
client-facing communication of the shared-responsibility model. Governs the Operating Procedures
in Stream 08 (Engage → Retain). Commercial commitments arising from advisory work route to
BO-02 (sales/pricing) or BO-03 (procurement); MSSP/security engagements are advisory-only and
defer execution boundaries to the Cybersecurity Client Shared Responsibility policy. The policy
binds humans and agents identically except where §5 narrows or gates Celeste's authority.

## 3. Definitions

- **Advisory** — recommending, analyzing, reviewing, and educating; producing guidance the
  client decides on. Advisory **informs** decisions; it does not **make** binding ones for the
  company.
- **Commitment** — any binding statement the client may rely on: a price, discount, SLA, scope,
  deliverable, remediation undertaking, roadmap date, or contractual term. Commitments are made
  only by the authorized human under BO-02/BO-03 — **never** in an advisory context.
- **QBR** — the periodic business review of service, posture, spend, and roadmap with a client.
- **vCIO / vCISO** — virtual CIO / CISO advisory: strategic IT / security guidance to the client.
  Advisory-only — recommends posture and roadmap; does not unilaterally execute or commit.
- **Shared responsibility** — the documented split of which security/operational duties Imperion
  owns versus which the client owns; communicated clearly so neither side assumes the other has
  it covered.

## 4. Policy Statements

1. **Advise, do not commit (the core rule).** In any advisory context — QBR, vCIO/vCISO session,
   roadmap, recommendation — the responsible party advises and recommends but makes **no binding
   commitment** on the company's behalf. Every binding commitment routes to the authorized human
   under BO-02 or BO-03.
2. **No fabricated assurance.** Posture findings, metrics, risk ratings, and roadmap items are
   honest and substantiated; no inflated health scores, invented metrics, or reassurance the data
   doesn't support (top-umbrella §5.1). On a gap or unknown, say so.
3. **MSSP/security work is advisory-only.** vCISO and security-posture engagements recommend and
   guide; they do not silently execute remediations or make security commitments outside the
   documented shared-responsibility split and the relevant Cybersecurity policy.
4. **Shared responsibility is explicit.** Client-facing work states clearly who owns what.
   Imperion never implies it covers a duty that sits on the client's side of the line, nor
   assumes the client covers one on Imperion's side.
5. **Correlate, never bleed.** Insight from one client may inform internal quality/security
   correlation, but no client's data, identity, or configuration is ever disclosed to or in front
   of another client (top-umbrella §5.3).
6. **Retention through honesty.** Renewal and expansion advice is in the client's genuine
   interest; right-sizing down is recommended when warranted. No manufactured urgency to drive a
   renewal (defers commercial terms to BO-02/BO-03).
7. **Confidentiality.** Client-confidential data is handled per the Cybersecurity and Privacy
   policies and never disclosed across a boundary.

## 5. Application to Autonomous Agents

For the actions this policy governs (prepare QBRs, draft roadmaps and recommendations, report
posture, advise on retention), Celeste operates as follows.

- **Autonomy ceiling — L3–L4.** Celeste may perform routine external advisory acts (L3) and
  reversible-with-undo acts (L4) — assembling QBR decks, drafting roadmaps and recommendations,
  producing posture reports, and conducting advisory communication — within the no-commit
  boundary. Its higher ceiling reflects that advisory output is reversible and non-binding; it is
  **not** authority to commit.
- **NO-COMMITS-EVER (the dial-proof floor).** Celeste makes **no binding commitment** on the
  company's behalf at **any** dial level — no price, discount, SLA, scope, deliverable date,
  remediation undertaking, or contractual term. Every such commitment is routed to the authorized
  human (BO-02 sales/pricing, BO-03 procurement). There is no dial level that turns advisory
  output into a binding promise.
- **MSSP advisory-only.** For security/posture work Celeste recommends and reports; it does not
  execute remediations or make security commitments. Execution and commitment cross to the human
  and the Cybersecurity Client Shared Responsibility boundary.
- **No fabrication.** Celeste never inflates a health score, invents a metric, or offers
  assurance the data doesn't support; on a gap it states the gap (top-umbrella §5.1).
- **Correlate, never bleed.** Celeste never surfaces one client's data, identity, or
  configuration in another client's context; RLS/`data_class` enforce it and Celeste respects it
  absolutely.
- **Human-in-loop & easy-button (P3).** Celeste prepares the complete advisory artifact (QBR
  deck, roadmap, posture report) for the client; the moment any part would become a binding
  commitment, it stages the decision and hands the authorized human a one-click commit under
  BO-02/BO-03 — never committing through its own advisory channel.
- **Escalation.** Any client request for a price, term, SLA, date, or remediation undertaking;
  any cross-client data question; any finding with contractual or compliance exposure escalates
  to the Client lead / authorized human.
- **Evidence.** Celeste logs a tracer for every advisory artifact and client communication: the
  substantiation behind each finding/metric, the no-commit routing of any commitment-class
  request, and the human owner, into the `agent_run`/`agent_message` ledger.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| Client lead / Deputy CFO (Nick, human) | Owns the client relationship and retention strategy; the sole authority for any commitment arising from advisory work (via BO-02/BO-03). |
| Client-success staff (human) | Run QBRs and advisory engagements; advise honestly; route commitments to the authorized human. |
| Celeste (agent) | Prepares QBRs, roadmaps, posture reports, and advisory communication within L3–L4; makes no binding commitment ever; keeps MSSP work advisory-only; never bleeds client data; logs tracer evidence. |
| Cybersecurity / Cyrus | Owns the Client Shared Responsibility boundary and security execution/commitment. |

## 7. Enforcement & Audit

The no-commit boundary enforces structurally — Celeste has no commitment-class authority, and any
binding action routes through the BO-02/BO-03 gauntlet (ADR-0058) to an authorized human;
cross-client bleed is blocked by RLS/`data_class`. Audit (Grace/Vera) reviews advisory artifacts
for substantiation and confirms no commitment was made outside authority; QA (Tess) eval goldens
cover the no-commits-ever and no-bleed cases. The [coverage-matrix](../coverage-matrix.md) proves
Stream 08 procedures bind here. A violation parks the work and escalates; any binding commitment
made in advisory context, or any client-data bleed, lowers Celeste's dial or trips the
kill-switch.

## 8. Related

**Procedures governed:** Operating Procedures in Stream 08 (Engage → Retain) — QBR, vCIO/vCISO,
posture, and retention entries. **Related policies:**
[BO-00](BO-00-business-operations-program.md) ·
[BO-02](BO-02-sales-pricing-and-commitment-authority.md) (where commitments route) ·
[BO-03](BO-03-procurement-and-vendor-commitment.md) (client-driven procurement) ·
[BO-01](BO-01-marketing-and-communications.md) (existing-customer communication ownership) ·
Cybersecurity Client Shared Responsibility · Privacy & Data Protection. **ADRs:** ADR-0128
(autonomy ladder) · ADR-0109 (dial + ceilings) · ADR-0058 (gauntlet) · ADR-0134 (policy-canon
architecture).
