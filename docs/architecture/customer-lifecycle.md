# Imperion CRM — Customer Lifecycle (assessment-led GTM)

- **Status:** Accepted (2026-06-07)
- **Related:** ADR-0010 (dual-axis stages), ADR-0019 (proposals), ADR-0020
  (delivery projects), ADR-0022 (assessment-led GTM & engagement model),
  [sales & marketing reference assets](../reference/sales-marketing/README.md),
  [data-model](../database/data-model.md)

This is the canonical description of how Imperion acquires, qualifies, converts, and
grows a managed-services customer. The CRM models this motion; the dashboard and the
per-module pages are views over it. The defining trait is that it is
**assessment-led**: a *paid* AI Security Readiness Assessment is the wedge that earns
the legal access and the evidence needed to win a long-term managed-services contract.
"We begin every relationship with an AI Security Readiness Assessment."

## The funnel

```mermaid
flowchart TD
    A["Audience<br/>(Facebook ads / organic video)"] -->|drives download| WP["White-paper download<br/>(lead magnet) — capture role/segment"]
    WP --> L["Lead"]
    L -->|segmented nurture<br/>Track A soft / Track B slow-drip| NUR["Nurture (routes to human on reply/booking)"]
    NUR -->|books| DISC["Discovery call<br/>(capture 8 fields, verdict, lock next step)"]
    DISC -->|Fit| ASMT["AI Security Readiness Assessment<br/>(PAID — fee credited to onboarding)"]
    DISC -->|Nurture| NUR
    ASMT -->|external scan + internal agents + phishing sim| SCORE["Six-dimension scorecard<br/>+ remediation roadmap"]
    SCORE -->|recommend managed services (± SOC)| MSO["Managed Services opportunity<br/>(2–5 yr contract, MRR)"]
    MSO -->|signed| ONB["Onboard as-is<br/>take over day-to-day support"]
    ONB --> REM["Execute remediation roadmap<br/>(current → secure ideal state)"]
    REM --> ACTIVE["Managed-active customer<br/>(quarterly SBRs)"]
    ACTIVE -->|vendor Qs, change requests, refresh, compliance| EXP["Expansion opportunities"]
    EXP -.->|new motion on existing account| MSO
```

## Stages, in words

1. **Audience → Lead.** Facebook/social ads and organic video drive prospects to
   **download a white paper** (the lead magnet, "The AI Inflection Point"). At capture
   the lead picks a **role/segment** (Owner/CEO, CFO/Finance, IT Manager,
   Compliance/Risk) which tags them. Facebook profile data is partial — lead ingestion
   must tolerate partial attribution.
2. **Nurture.** One segmented email campaign, four voices. **Track A** (soft, A1–A5)
   for engagers who haven't downloaded; **Track B** (white-paper slow-drip, B1–B9,
   ~90 days) triggers on **download with captured email/phone**. A download graduates
   A→B. Any reply or booking **pauses automation and routes to a human**; current
   clients and active opportunities are suppressed.
3. **Discovery call.** Executive discovery & risk conversation. Capture **eight
   things** — Goals, Priorities, Downtime Cost/Day, Fraud Risk Exposure, Insurance +
   Compliance Pressure, AI Usage + Shadow AI, Decision Maker + Urgency, Budget
   Readiness — reach a **verdict** (Fit / Not a fit / Nurture), **lock the next step**
   (book the assessment), and **mandate the SBR cadence**.
4. **AI Security Readiness Assessment — paid engagement.** Run *before* proposing
   managed services. Methods: external risk scan + internal lightweight agents +
   phishing/social-engineering simulation. Steps: **Discovery → Safe scanning → Live
   testing → Scoring → Written report → Review call** (~1–2 weeks; review within ~14
   days of kickoff). The **fee is credited toward onboarding** if the client converts.
5. **Scorecard + remediation roadmap (deliverable).** Scores **six dimensions** (below)
   each **At Risk / Needs Work / Solid / Strong**, with a ranked top-three priorities
   and a plain-language remediation step per finding. The client **keeps the executive
   summary + roadmap** whether or not they sign. Generally concludes they need managed
   services (± SOC monitoring).
6. **Managed Services contract.** Convert on a **2–5 year** contract (recurring **MRR**,
   distinct from the one-time assessment fee).
7. **Onboarding + remediation.** Onboard **as-is**, take over day-to-day support, then
   execute the remediation roadmap as the implementation project (ADR-0020).
8. **Expansion + SBRs.** Ongoing opportunities with existing clients (vendor technical
   questions, change requests, compliance shifts, hardware refresh) are first-class.
   The relationship is governed by recurring **Strategic Business Reviews (SBRs)**,
   typically quarterly.

## The six assessment dimensions

Use these exact names everywhere (CRM, copy, agent output):

1. **Identity Security** — sign-in/account protection; is MFA phishing-resistant?
2. **Endpoint Security** — device hardening, patching, exposed credentials/data
3. **Network Segmentation** — blast radius after a single foothold
4. **Email & Collaboration Security** — Microsoft 365 config, sharing, exposure
5. **Backup & Recovery** — ransomware isolation; tested restore
6. **Incident Readiness** — would you know what to do, and could you prove it

Rating scale: `At Risk` · `Needs Work` · `Solid` · `Strong`.

## How the lifecycle maps to the schema

| Lifecycle step | Where it lives |
| --- | --- |
| Audience | Out of system / `campaign` + `contact.attribution` (ADR-0012) |
| White-paper download, segment tag | `contact` (+ attribution); segment drives nurture |
| Lead, Qualified | `opportunity.sales_stage` = `lead` / `qualified`; `account.lifecycle_stage` = `prospect` |
| Nurture (Track A/B) | Communications/workflow service (ADR-0014) — external (ADR-0018) |
| Discovery call (8 captures + verdict) | `interaction` / `task` + qualification fields on the lead/opportunity |
| **AI Security Readiness Assessment (paid)** | **`assessment`** entity — six rated dimensions, one-time fee credited to onboarding, gates managed services (ADR-0022) |
| Scorecard + remediation roadmap | `assessment` ratings + report URL + recommendation; roadmap → `project` milestones (ADR-0020) |
| Managed Services contract | `opportunity` (recurring `amount_mrr`), `sales_stage` → `won` |
| Onboarding + remediation | `project` (type `onboarding`/`implementation`) + milestones (ADR-0020) |
| Managed-active + SBRs | `account.lifecycle_stage` = `managed_active`; SBR = recurring review/interaction |
| Expansion | new `opportunity` on an active account |

**Two money types, kept separate:** the **one-time assessment fee** (credited to
onboarding) vs the recurring **managed-services MRR** (`opportunity.amount_mrr`).
Reporting must not conflate them.

**Remediation is not its own structure:** it is realized as the delivery `project`'s
milestone roadmap (ADR-0020), not a parallel table.

**Tone:** all client-facing copy and any agent-generated responses follow *How We Show
Up* — expertise and outcomes, **not fear**
([internal-how-we-show-up-v2.pdf](../reference/sales-marketing/internal-how-we-show-up-v2.pdf)).
