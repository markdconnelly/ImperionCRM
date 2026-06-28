# BO-01 — Marketing & Communications

> Distinct Business Operations policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Business Operations Program](BO-00-business-operations-program.md). Governs how
> Imperion presents itself to the market — brand voice, the substantiation of every claim,
> conduct on social channels, the consent and anti-spam rules on outbound, and the line between
> contacting a lead and contacting an existing customer. Read the same way by the marketing
> lead and by Belle.

| Field | Value |
| --- | --- |
| **Policy ID** | `BO-01` |
| **Title** | Marketing & Communications |
| **Category** | Business Operations |
| **Tier** | distinct |
| **Human owner** | Marketing lead (CMO function) |
| **Governing for (agents)** | Belle (Marketing) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [BO-00](BO-00-business-operations-program.md) + AI Acceptable Use · Data Classification & Handling · Privacy & Data Protection |

**Framework Alignment:** CAN-SPAM Act (commercial email) · CASL / GDPR-ePrivacy consent
principles (where applicable) · TCPA (SMS, if/when enabled) · SOC 2 (CC1 Control Environment,
CC2 Communication) · FTC truth-in-advertising / endorsement guidance · ADR-0124 (unified Social
plane).

---

## 1. Purpose

Imperion's market presence is a trust asset and a security surface. Everything we publish — a
post, an ad, a campaign email, a case study, a one-line reply — speaks for the company and is
read by prospects, customers, competitors, and attackers alike. This policy ensures every
outbound communication is honest, substantiated, on-brand, consent-respecting, and routed to the
right audience, whether a human marketer or Belle composed it.

## 2. Scope

**Who:** the marketing lead and marketing staff; the Belle agent; anyone (human or agent) who
publishes, sends, schedules, or boosts content under the Imperion brand. **What:** brand voice
and visual identity, public claims and their evidence, organic social conduct across the Social
plane (ADR-0124 — Facebook/Instagram/Messenger/Threads/LinkedIn), paid advertising and ad
content, campaign and newsletter email, and the audience boundary between marketing-eligible
leads and existing customers. Governs the Operating Procedures in Stream 01 (Demand → Lead). The
policy binds humans and agents identically except where §5 narrows or gates Belle's authority.

## 3. Definitions

- **Claim** — any assertion of fact about Imperion or its services (capability, result, metric,
  certification, customer outcome, comparison). A claim is publishable only with substantiation
  on file.
- **Substantiation** — a verifiable source for a claim (a signed reference, a measured metric, a
  held certification, a documented result). "We believe" / aspirational language is not
  substantiation and may not be phrased as fact.
- **Marketing-eligible contact** — a lead or prospect who has not opted out and falls within
  contact-eligibility and frequency rules; the legitimate audience for outbound marketing.
- **Existing customer** — a contact attached to an active account. Existing customers receive
  service/relationship communication through Client Success (BO-04), **not** marketing outreach,
  and never an unsolicited 1:1 sales/marketing DM.
- **Blast** — a one-to-many send or post to a defined audience segment (email campaign, ad
  audience, scheduled social post).
- **New-audience blast** — a blast to an audience never previously sent to, or materially larger
  than the prior baseline — higher-consequence because of reach and consent risk.

## 4. Policy Statements

1. **One voice, one identity.** All published content follows the Imperion brand voice and
   visual identity guide. The responsible party never improvises a competing tone or off-brand
   visual identity for the company.
2. **Every claim is substantiated before it ships.** No claim is published without substantiation
   on file. No fabricated metrics, capabilities, certifications, testimonials, customer names,
   logos, or results — ever (top-umbrella §5.1). On absent evidence, the claim is dropped or
   softened to honest language, never invented.
3. **No false urgency or manufactured scarcity.** "Limited time," countdowns, "only N left,"
   and similar pressure devices are used only when literally true and substantiated.
4. **Consent is absolute (CAN-SPAM and beyond).** Every commercial email carries a working
   unsubscribe, honors it promptly, identifies the sender with a valid physical postal address,
   and uses non-deceptive subject lines and headers. Opt-outs and frequency caps are honored
   across all channels and are never overridden for a "good opportunity."
5. **Right audience, right channel.** Marketing outreach targets marketing-eligible contacts
   only. Existing customers are handled by Client Success (BO-04). No unsolicited 1:1 direct
   message to an existing customer under any circumstances.
6. **Social conduct is professional and bounded (ADR-0124).** Public engagement is courteous and
   on-brand; no disparagement of competitors, no disclosure of client identities or
   confidential data, no engagement that bleeds one client's information toward another
   (top-umbrella §5.3 — *correlate, never bleed*). Inbound DMs are treated as service
   interactions, routed per BO-04, not as a sales-prospecting list.
7. **Ad spend is controlled money.** Any paid placement, boost, or budget change is a spend
   decision (BO-00 §4) and is approved by an authorized human before it goes live.
8. **Disclosure and accuracy.** Sponsored/paid content is disclosed where required; endorsements
   and reviews are genuine and disclosed per FTC guidance.

## 5. Application to Autonomous Agents

For the actions this policy governs (compose, schedule, post, reply, build audiences, draft ads
and campaigns), Belle operates as follows.

- **Autonomy ceiling — L1–L3.** Belle may draft and propose (L1), perform internal reversible
  acts such as preparing a campaign or assembling an audience in draft (L2), and — when dialed —
  perform routine, low-consequence external acts (L3) such as posting an approved, on-brand,
  pre-substantiated organic item to an established audience within frequency limits. Belle is
  **capped below the level** that would let it commit spend or broadcast to new/large audiences
  unaided.
- **`always_gate` actions (dial-proof floor).**
  - **Ad spend** — any paid placement, boost, or budget change requires a human decision at
    every dial level. Belle assembles the full creative, targeting, and budget, then presents a
    one-click approve.
  - **Large or new-audience blasts** — any campaign send or post to a new or materially larger
    audience is gated; Belle stages the segment, content, and timing and the human commits the
    send.
- **Refusal-class (stronger than a gate).** Belle **refuses** to send a 1:1 direct message to an
  existing customer — there is no dial level, and no human-approval path through Belle, that
  permits it. Belle routes the relationship to Client Success (BO-04) instead. Consent is
  likewise **absolute**: Belle never composes or sends to a contact who has opted out or is
  outside contact-eligibility, regardless of instruction.
- **No fabrication.** Belle never generates a claim, metric, testimonial, or scarcity statement
  without substantiation in hand; on empty evidence it says so and drops the claim rather than
  inventing one (top-umbrella §5.1).
- **Human-in-loop & easy-button (P3).** As the dial climbs, routine organic posting recedes from
  human review, but the spend and new-audience-blast gates remain. At every gate Belle prepares
  the complete artifact (creative, audience, budget, schedule, substantiation references) and
  hands the human a single approve/deny — never "park and wait."
- **Escalation.** Anything Belle cannot substantiate, any ambiguous consent state, any request
  that targets an existing customer, and any claim with legal/compliance exposure escalates to
  the marketing lead.
- **Evidence.** Belle writes a tracer record for every send/post/spend proposal: the audience
  basis, the consent/eligibility check, the substantiation references for each claim, and the
  human approver at each gate, into the `agent_run`/`agent_message` ledger.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| Marketing lead (human) | Owns brand voice and claims library; approves ad spend and new-audience blasts; final authority on disputed claims and consent edge cases. |
| Marketing staff (human) | Author and substantiate content; maintain suppression/opt-out lists; honor frequency caps. |
| Belle (agent) | Drafts and (when dialed) posts on-brand, substantiated, consent-clean content within L1–L3; gates spend and large/new blasts; refuses 1:1 DM to existing customers; logs tracer evidence. |
| Client Success / Celeste (BO-04) | Owns all existing-customer relationship communication; receives inbound customer DMs routed from marketing. |

## 7. Enforcement & Audit

Consent and audience boundaries enforce structurally — suppression lists, contact-eligibility
checks, and the existing-customer refusal-class block disallowed sends before they happen. The
spend and new-audience gates route through the gauntlet (ADR-0058). Audit (Grace/Vera) sweeps
published content for substantiation-on-file and consent compliance; QA (Tess) eval goldens
cover the refusal-class and fabrication cases. The [coverage-matrix](../coverage-matrix.md)
proves Stream 01 procedures bind to this policy. A violation parks the work and escalates;
repeated consent or fabrication violations lower Belle's dial or trip the kill-switch.

## 8. Related

**Procedures governed:** Operating Procedures in Stream 01 (Demand → Lead) — campaign, social,
and outbound entries. **Related policies:** [BO-00](BO-00-business-operations-program.md) ·
[BO-02](BO-02-sales-pricing-and-commitment-authority.md) (hand-off lead → sale) ·
[BO-04](BO-04-client-success-and-advisory.md) (existing-customer communication) · AI Acceptable
Use · Privacy & Data Protection · Data Classification & Handling. **ADRs:** ADR-0124 (Social
plane) · ADR-0128 (autonomy ladder) · ADR-0109 (dial + ceilings) · ADR-0058 (gauntlet) ·
ADR-NNNN (policy-canon architecture).
