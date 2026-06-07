# Sales & Marketing reference assets

Source-of-truth business assets that define Imperion's go-to-market motion, the
assessment deliverable, and how the team communicates. Archived here so the CRM is
built against the *real* process, not assumptions. The PDFs are the originals; this
page captures the structured facts the application depends on (so they're
searchable and version-controlled, not locked in PDF — CLAUDE.md §8).

See also: [customer-lifecycle](../../architecture/customer-lifecycle.md),
ADR-0022 (assessment-led GTM & engagement model).

## Assets

| File | What it is | Audience |
| --- | --- | --- |
| [white-paper-the-business-cost-of-standing-still.pdf](./white-paper-the-business-cost-of-standing-still.pdf) | The lead magnet ("The AI Inflection Point" white paper). Reframes cyber risk as a board-level business decision; ends on the six-question self-assessment and the Business Risk Assessment offer. | Owners / executives (prospects) |
| [lead-nurture-campaign-v3-segmented.pdf](./lead-nurture-campaign-v3-segmented.pdf) | Segmented email nurture playbook. Four buyer segments × two tracks; routes leads by role tag. | Marketing & sales |
| [discovery-call-script-ai-inflection-point.pdf](./discovery-call-script-ai-inflection-point.pdf) | Executive discovery & risk conversation script. Defines the eight things to capture and the next-step ask (book the assessment). | Sales |
| [ai-security-readiness-assessment-engagement.pdf](./ai-security-readiness-assessment-engagement.pdf) | The paid assessment engagement overview + the deliverable format (the six-dimension scorecard). | Prospects (and internal) |
| [internal-how-we-show-up-v2.pdf](./internal-how-we-show-up-v2.pdf) | Internal communication philosophy: expertise & outcomes, not fear. How everyone represents Imperion in client interactions. | All staff & vendor partners |

## Key structured facts (the CRM models these)

### The offer — AI Security Readiness Assessment (a.k.a. "Business Risk Assessment", "Readiness Score")
- A **paid engagement**, run **before** proposing fully managed services — "we begin
  every relationship" with it. The fee is **credited toward onboarding** if the client
  proceeds to managed services.
- Methods: **External Risk Scan** + **Internal Risk Assessment** (lightweight endpoint
  agents) + **Phishing / Social-Engineering Simulation**.
- Engagement steps: **Discovery → Safe scanning → Live testing → Scoring → Written
  report → Review call.** Timeline ~1–2 weeks; review call within ~14 days of kickoff.
- The client **keeps the executive summary + remediation roadmap** whether or not they
  become a client.

### The six dimensions (use these exact names everywhere)
1. **Identity Security** — how protected sign-ins/accounts are (is MFA phishing-resistant?)
2. **Endpoint Security** — device hardening, patching, exposed credentials/data
3. **Network Segmentation** — blast radius; how far an attacker moves after one foothold
4. **Email & Collaboration Security** — Microsoft 365 config, sharing, exposure
5. **Backup & Recovery** — isolation from ransomware; tested restore
6. **Incident Readiness** — would you know what to do, and could you prove it

### Scorecard ratings (per dimension)
`At Risk` · `Needs Work` · `Solid` · `Strong` — plus a ranked **top-three priorities**
list and a plain-language remediation step per finding.

### Lead segments (asked at capture, drives nurture routing)
`Owner / CEO / President` · `CFO / Finance / Operations` · `IT Manager / Internal IT` ·
`Compliance / Risk / Quality / Legal`. Default to Owner/CEO if unanswered.

### Nurture mechanics
- **Track A (soft-engagement, A1–A5):** pixel-retargeted engagers who haven't
  downloaded. Reply CTAs lead; the Readiness Score offer appears by A4.
- **Track B (white-paper slow-drip, B1–B9, ~90 days):** triggered when a lead
  **downloads the white paper** (and contact is captured with email/phone). A download
  during Track A **graduates** the lead into Track B, carrying its segment tag.
- Any **reply or booking pauses automation and routes to a human.** Suppress current
  clients and active opportunities.

### Discovery call — eight required captures
Goals · Priorities · Downtime Cost/Day · Fraud Risk Exposure · Insurance + Compliance
Pressure · AI Usage + Shadow AI · Decision Maker + Urgency · Budget Readiness.
**Qualification verdict:** `Fit` / `Not a fit` / `Nurture`. Always **lock the next
step** (book the assessment) and **mandate the SBR cadence**.

### SBR — Strategic Business Review
A recurring (typically **quarterly**) leadership cadence reviewing risk, posture, and
priorities against the client's goals. Part of the managed relationship, not an add-on.

### Tone (How We Show Up)
Expertise and outcomes, **not fear**. Name a risk honestly, then spend ~90% of the
conversation on what it means and what we'd do. Plain language; give value first; no
false urgency. This should inform any client-facing copy or agent responses the app
generates.
