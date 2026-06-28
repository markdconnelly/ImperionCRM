# Stream 10 — Run the Company

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-NNNN](../../decision-records/ADR-NNNN-operating-procedure-catalog.md). Terms
> **Operating Procedure** / **Procedure Step** are defined in [`CONTEXT.md`](../../../CONTEXT.md).
>
> **D9 global principles apply to every procedure below** (encoded in each Human-in-loop field,
> not restated per entry): **P1** Nova-native human co-working (every flow co-works with a human
> through Nova) · **P2** each sub-agent's reasoning is ascribed back to the paired human, up the
> chain · **P3** an "easy button" at every human gate (prep to the goal, hand the human a one-click
> resolution) · **P4** urgent → dedicated chat, else → tag the team member in the shared Teams chat.

**The BIGGEST stream — running the agentic OS is running the company (D7.1).** It spans internal
G&A (Rachel CoS · Holly HR · Laurel Legal), platform/assurance governance (Tess QA · Vera
Governance · Jessica Risk · Lexicon Doc-Hygiene), **and the agentic OS operating ITSELF** — agent
lifecycle, eval + feedback, conformance, memory/retrieval curation, autonomy-dial governance,
connector/credential ops, OKF maintenance, deploy-verify, Nova intake wiring. The OS-self
procedures are FIRST-CLASS, not an appendix (D7.1).

**Organized one `## <Owner>` subsection per owner**, mirroring the source grouping. Because the
stream spans many owners, per-procedure bodies are tighter than other streams but keep every field.

**Conventions (per D6/D7):** **subject** = `imperion` (OS-self-ops + internal G&A run on
Imperion-itself) or `both` (also serves managed clients; D7.2 dogfood is a PARAMETER, not a
duplicate) · **[automation]** agent-actuated · **[gui-step]** human in-app · **[hybrid]** both ·
**Realization** = ICM Workspace path when ≥1 [automation]/[hybrid] step, else `procedure-only` ·
SEAMs split cross-agent flows at each owner (hand-offs are explicit steps); OVERLAPs flagged inline.

**Driving policy (every procedure):** `TBD (mark-blocker: company-policy-collection)` (D4, #1586);
where a procedure's driver is technical/architectural canon (an ADR), the ADR is named alongside.

**Dormancy flags:** **#389** Voyage embeddings (gates real worker retrieval/recall) · **#991** event
bus (reactive triggers + handoff intake) · **#119** trigger-sync (new backend endpoints going live) ·
**#1537** worker retrieval tier · **#1538** per-agent goldens.

**Live schema-gap deps cited below:** **#1577** problem/known_error · **#1578** monitoring bronze ·
**#1579** change_freeze/rollback/standard-change · **#1580** AR/invoice silver.

---

## Rachel (Chief of Staff / G&A) — Epic #1546

Ceiling **L2 delegate-only** (synthesize/advise/orchestrate; NEVER bypasses a sub-agent's gauntlet;
any world-changing act inherits the executing sub-agent's ceiling). Serves Derek.

### 10-A1 · Compose daily G&A chief-of-staff brief
- **Owner / Stream:** Rachel / 10.
- **Trigger:** schedule (daily, AM) — the C-suite synthesis-brief archetype (tracer `daily-brief`).
- **Terminal outcome:** Derek receives a cross-division status / priorities / blockers brief with a
  decisions-needed list; persisted for audit.
- **Procedure Steps:**
  1. `[automation]` Delegate-read each division's roll-up (Dexter delivery-pulse, Sterling
     financial-pulse, Roman/Jessica posture+risk, G&A items) via `pg.read` + `memory.recall`. **L0.**
  2. `[automation]` Synthesize blockers + priorities + decisions-needed into one brief; cite
     sources, never fabricate on empty. **L2.**
  3. `[automation]` Write the brief to Derek's surface (Teams card / cockpit) + agent diary.
  4. `[gui-step]` Derek reviews, marks decisions, optionally re-tasks (any company-committing
     decision routes to the relevant sub-agent's gated path).
- **Driving policy:** TBD (#1586) — risk/G&A reporting policy.
- **Realization:** `icm/executive/chief-of-staff/daily-brief/` (live SoR; D5 brief archetype).
- **Autonomy ceiling:** L2 (read+recall+synthesize+deliver; no actuation). `always_gate`: none of
  its own — it delegates; every downstream commitment stays gated at its owner.
- **Human-in-loop:** Derek. L1 = Rachel drafts, Derek co-shapes; L2 = auto-compose+deliver.
- **Substrate deps:** #389 (recall), #991 (cross-division intake), #1537. **subject:** imperion.

### 10-A2 · Orchestrate G&A request intake / routing
- **Owner / Stream:** Rachel / 10.
- **Trigger:** a G&A-class request lands (HR / legal / internal-ops ask via Nova handoff or Teams).
- **Terminal outcome:** request routed to the owning G&A agent (Holly / Laurel) or escalated to
  Derek; tracked to closure.
- **Procedure Steps:**
  1. `[automation]` Classify request (HR · legal · per-employee-brain · dogfood · other). **L2.**
  2. `[automation]` Delegate to Holly / Laurel via `delegate`/`handoff` cap; OR escalate to Derek
     if cross-cutting.
  3. `[automation]` Track to closure; surface stalls on the next daily brief.
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/executive/chief-of-staff/request-routing/` (graduates once delegate cap wired).
- **Autonomy ceiling:** L2 delegate-only.
- **Human-in-loop:** Derek on escalations; recedes as routing accuracy earns trust. Floor:
  cross-cutting / policy-setting asks always surface to Derek.
- **Substrate deps:** #991, delegate/handoff cap (#1536). **subject:** imperion.

### 10-A3 · Steward the per-employee-brain program (rollout governance)
- **Owner / Stream:** Rachel (co-owner with Holly) / 10 — Epic #1543.
- **Trigger:** new hire approved OR program cadence (quarterly brain-coverage review).
- **Terminal outcome:** every employee has a provisioned, owner-private personal brain; coverage
  gaps tracked.
- **Procedure Steps:**
  1. `[automation]` Inventory which employees have a brain (6 day-one: Mark/Derek/Nick/Luke/Brandon/
     Anna) vs gaps. **L2.**
  2. `[hybrid]` For a gap, hand the spin-up to Holly's onboarding (10-H3) — generalizes
     ImperionBrainMark #1379 from N=1 → all.
  3. `[gui-step]` Confirm owner-private RLS contract holds (Derek invisible to Nick) — verify against
     the personal-axis RLS (ADR-0105).
- **Driving policy:** ADR-0105 (personal-axis RLS) + TBD (#1586) people-program policy.
- **Realization:** procedure-only (program governance; the spin-up MECHANISM is 10-H3).
- **Autonomy ceiling:** L2.
- **Human-in-loop:** Derek/Rachel-human; floor: provisioning identities + blob containers + curator
  role = infra Mark-gated.
- **Substrate deps:** personal store (#1152), curator role (provisioned), #389 (to actually recall).
  **subject:** imperion.

### 10-A4 · Steward the dogfood program
- **Owner / Stream:** Rachel / 10 — Epic #1544.
- **Trigger:** cadence review OR a new agent/capability ships that should run on Imperion-itself.
- **Terminal outcome:** Imperion's own ops (internal tickets, IT, finance) run on the system,
  supported by the same agents like any client; Imperion-as-client mapping kept current.
- **Procedure Steps:**
  1. `[automation]` Verify Imperion-itself exists as a managed `account` (client-zero) with the
     connector/Client-Mapping rows a real client has. **L2.**
  2. `[automation]` Confirm internal tickets/IT/posture flow through Felix/Ozzie/Cyrus/Osiris like
     any client (the dogfood loop = continuous real-world QA).
  3. `[hybrid]` Surface dogfood findings (where the OS failed on its own ops) as tuning candidates →
     Vera / eval-feedback (10-O5).
- **Driving policy:** TBD (#1586) + the credential-registry "company = Imperion-as-first-client" rule.
- **Realization:** procedure-only (program); actual ops realize in their own streams `subject:both`.
- **Autonomy ceiling:** L2.
- **Human-in-loop:** Derek/Mark; floor: standing.
- **Substrate deps:** Imperion client-zero account + connections; cross-stream. **subject:** imperion.

---

## Holly (HR / People) — Epic #1558

Ceiling **L2–L3** (onboarding orchestration auto; employment/comp/PII always-gate; salary
non-disclosure absolute). Reports to Rachel. INTERNAL employee JML — distinct from Osiris's
client-tenant IAM (Stream 04). **SEAM:** Holly owns the PEOPLE event; Osiris owns the IDENTITY
actuation (the joiner-mover-leaver technical grants).

### 10-H1 · Onboard a new employee (hire → onboarded)
- **Owner / Stream:** Holly / 10 (tracer `employee-onboarding`).
- **Trigger:** offer accepted (HR event).
- **Terminal outcome:** new employee fully onboarded — identity provisioned, brain spun up, IT setup
  tracked complete, classification + pay-rate recorded.
- **Procedure Steps:**
  1. `[automation]` Create the internal `app_user`/Employee record; set Employee Classification (v1:
     1099) + effective-dated Pay Rate. (**`always_gate`:** comp fields — payroll-role-gated; salary
     non-disclosure absolute.) **L2.**
  2. `[hybrid]` HAND OFF identity provisioning to **Osiris** (joiner branch, Stream 04
     `joiner-mover-leaver`) — propose least-priv grants (gated). SEAM.
  3. `[automation]` HAND OFF per-employee-brain spin-up (10-H3) — the 10x mechanism (#1543).
  4. `[hybrid]` Orchestrate IT setup (device, M365 license via Vance/Pierce) — track tasks to done.
  5. `[gui-step]` Manager/Derek confirms onboarding complete; employment terms always-gate.
- **Driving policy:** TBD (#1586) onboarding/people policy + ADR-0016 (Entra identity).
- **Realization:** `icm/domains/people/employee-onboarding/` (live SoR).
- **Autonomy ceiling:** L3 (orchestrate auto); `always_gate`: employment terms, comp, PII writes.
- **Human-in-loop:** Holly-human/Derek. L1 = Holly drafts plan, human approves each step; L3 =
  orchestration auto, human approves only the employment/comp/grant gates. Floor: comp + identity
  grants always gated.
- **Substrate deps:** Osiris (Stream 04 seam), personal store (#1152), #991. **subject:** imperion.

### 10-H2 · Offboard an employee (leaver → deprovisioned)
- **Owner / Stream:** Holly / 10.
- **Trigger:** termination/resignation (HR event).
- **Terminal outcome:** employee offboarded — access revoked, brain archived/sealed, final-pay
  obligations flagged, equipment return tracked.
- **Procedure Steps:**
  1. `[automation]` Emit the leaver people-event → HAND OFF to **Osiris** leaver branch
     (auto-deprovision under JML runbook, L3; break-glass always-gate). SEAM. **L2.**
  2. `[hybrid]` Seal/archive the personal brain (owner-private; retention per policy) — coordinate
     with personal-store god-view/curator.
  3. `[automation]` Flag final pay / expense / equipment-return obligations to finance (Audrey
     read-only) + IT.
  4. `[gui-step]` Derek/HR confirms offboarding complete.
- **Driving policy:** TBD (#1586) + ADR-0105 (personal-tier retention).
- **Realization:** `icm/domains/people/employee-offboarding/` (graduates; deeper playbook under #1558).
- **Autonomy ceiling:** L3; `always_gate`: break-glass deprovision, comp finalization.
- **Human-in-loop:** Holly-human/Derek. Floor: irreversible deprovision + final-pay gated.
- **Substrate deps:** Osiris seam, personal-store retention, #991. **subject:** imperion.

### 10-H3 · Spin up a per-employee brain
- **Owner / Stream:** Holly / 10 (sub-mechanism of #1543, invoked by 10-H1).
- **Trigger:** onboarding reaches the brain step (from 10-H1) OR a backfill for a brain-less employee.
- **Terminal outcome:** employee has a provisioned Personal Knowledge Store (Synthesis Store +
  Curated Vault) + persona + access to departmental operator agents, owner-private.
- **Procedure Steps:**
  1. `[hybrid]` Provision the per-owner Curated Vault blob container (`vault-<owner>`) + per-owner
     `Storage Blob Data Contributor` RBAC. (**`always_gate`:** infra provisioning — Mark-gated.)
  2. `[automation]` Seed the personal-axis RLS owner scope + create the per-employee repo instance
     (`ImperionBrain<Name>`, generalizing ImperionBrainMark). **L2.**
  3. `[automation]` Seed a baseline persona (`_me/profile.md`) + wing/room structure.
  4. `[gui-step]` Confirm the owner-private contract (invisible to peers) via the RLS matrix.
- **Driving policy:** ADR-0105 / ADR-0114 (personal store) + TBD (#1586).
- **Realization:** `icm/domains/people/brain-spin-up/` (graduates once the infra script is
  agent-invokable; today partly manual).
- **Autonomy ceiling:** L2–L3; `always_gate`: Azure infra provisioning + pg-role creation.
- **Human-in-loop:** Mark (infra) + Holly. Floor: identity/role/RBAC creation Mark-gated.
- **Substrate deps:** personal store (#1152), curator role (provisioned), GitHub-App (#1541), #389.
  **subject:** imperion.

### 10-H4 · Run an employee performance review cycle
- **Owner / Stream:** Holly / 10. ⛔ **UNFILED leaf — recommend sub-issue under #1558.**
- **Trigger:** review cadence (quarterly/annual) OR manager-initiated.
- **Terminal outcome:** review packet assembled + cycle tracked to completion; outcomes (rating,
  comp-change proposal) recorded gated.
- **Procedure Steps:**
  1. `[automation]` Assemble a per-employee review packet (delivery/quality signals from Tess,
     time/utilization from Audrey read-only) — labeled signal vs inference. **L2.**
  2. `[hybrid]` Route to the manager to author the review.
  3. `[gui-step]` Manager finalizes; any comp change is **`always_gate`** (payroll-role + Mark/Derek).
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only (graduates).
- **Autonomy ceiling:** L2; `always_gate`: comp changes, performance verdicts.
- **Human-in-loop:** Manager/Derek; floor: comp + ratings always human.
- **Substrate deps:** Tess (quality signals), Audrey read-only, #389. **subject:** imperion.

### 10-H5 · PTO / leave administration
- **Owner / Stream:** Holly / 10. ⛔ **UNFILED leaf + DORMANT** (pto/holiday categories out of v1
  per the CONTEXT Time Entry note).
- **Trigger:** employee leave request.
- **Terminal outcome:** leave recorded + approved/denied; tracked.
- **Procedure Steps:**
  1. `[gui-step]` Employee submits request.
  2. `[automation]` Holly checks balance/policy, drafts a recommendation. **L2.**
  3. `[gui-step]` Manager approves.
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only.
- **Autonomy ceiling:** L2.
- **Human-in-loop:** Manager. Floor: approval human.
- **Substrate deps:** DORMANT until the W2/PTO v1 deferral lifts. **subject:** imperion.

---

## Laurel (Legal / Contracts-lifecycle) — Epic #1559

Ceiling **L2** (draft/redline/flag auto; execution/binding always-gate; not licensed counsel —
routes genuine legal calls to a human). Reports to Rachel. **SEAM:** contracts arrive from Chase
(sales MSA/SOW) and Vance (vendor agreements); execution/esign is always-gate.

### 10-L1 · Review an inbound contract (MSA / SOW / NDA)
- **Owner / Stream:** Laurel / 10 (tracer `contract-review`).
- **Trigger:** a contract document arrives (Chase won-deal MSA/SOW, Vance vendor agreement, inbound NDA).
- **Terminal outcome:** contract redlined + risk clauses flagged + summarized; execution parked for a human.
- **Procedure Steps:**
  1. `[automation]` Ingest the document; classify type (MSA/SOW/NDA/vendor/renewal). **L2.**
  2. `[automation]` Redline against the standard playbook; flag risk clauses (liability, indemnity,
     auto-renew, termination, data-handling).
  3. `[automation]` Summarize risks + recommendation; cite the clause (audit-by-reference, no fabrication).
  4. `[hybrid]` HAND OFF to the human (or counsel) for genuine legal calls; PARK execution.
     (**`always_gate`:** signing / binding the company.)
- **Driving policy:** TBD (#1586) contract-standards policy.
- **Realization:** `icm/domains/legal/contract-review/` (live SoR).
- **Autonomy ceiling:** L2; `always_gate`: execution / binding / esign.
- **Human-in-loop:** Mark/Derek (+ external counsel for real legal calls). L1 = Laurel drafts
  redline, human reviews all; L2 = auto-redline+flag, human approves execution only. Floor: signing
  always human.
- **Substrate deps:** #389 (clause recall), DocuSign esign path (always-gate). **subject:** both
  (client MSAs serve clients; internal/vendor contracts = imperion).

### 10-L2 · Track contract lifecycle + renewals (legal side)
- **Owner / Stream:** Laurel / 10 (deeper playbook under #1559).
- **Trigger:** contract executed (lifecycle start) OR renewal/expiry window approaching.
- **Terminal outcome:** contract obligations + key dates tracked; renewal-legal review triggered
  ahead of expiry; no surprise auto-renew (legal twin of Vance's Deadline Sentinel).
- **Procedure Steps:**
  1. `[automation]` Record the executed contract + key dates (term, renewal, notice window). **L2.**
  2. `[automation]` Watch the renewal/expiry window; on approach, draft a renewal-legal review +
     flag changed terms. SEAM with Vance (vendor procurement) + Chase (client renewal as a sales
     motion / `contract_renewal`).
  3. `[hybrid]` Route the renewal recommendation to a human; execution always-gate.
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only (graduates with the watcher).
- **Autonomy ceiling:** L2; `always_gate`: renewal commitment.
- **Human-in-loop:** Mark/Derek; floor: binding renewal/cancellation human.
- **Substrate deps:** #991 (date-trigger), overlaps Vance Deadline Sentinel. **subject:** both ·
  **OVERLAP:** client-renewal commercial motion is Chase's (`contract_renewal`); vendor auto-renew
  is Vance's Deadline Sentinel. Laurel owns the LEGAL-terms review only — split at the seam.

### 10-L3 · Compliance / policy review (legal)
- **Owner / Stream:** Laurel / 10 (deeper playbook under #1559).
- **Trigger:** a new regulatory/contractual compliance obligation surfaces OR cadence review.
- **Terminal outcome:** obligation assessed + recommendation drafted; routed to a human; tracked.
- **Procedure Steps:**
  1. `[automation]` Identify the obligation + affected contracts/processes. **L2.**
  2. `[automation]` Draft a compliance recommendation (gap + action). SEAM with Grace (GRC controls,
     Stream 07) — Laurel = legal/contractual obligations, Grace = security-control evidence.
  3. `[hybrid]` Route to a human; binding compliance commitments always-gate.
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only.
- **Autonomy ceiling:** L2; `always_gate`: compliance commitments.
- **Human-in-loop:** Mark; floor: legal/compliance commitment human.
- **Substrate deps:** Grace seam. **subject:** both · **SEAM with Grace (GRC):**
  legal-obligation vs security-control-evidence; flag if both claim it.

---

## Tess (Service-Quality / QA) — Epic #1560

Ceiling **L2** (audit/score/flag/recommend auto; NO actuation — watcher, like Vera). Reports to
Jessica. Sits OUTSIDE Service so it audits delivery, not itself.

### 10-T1 · Audit ticket quality on close
- **Owner / Stream:** Tess / 10 (tracer `ticket-quality-audit`).
- **Trigger:** ticket closed OR sampled on a cadence.
- **Terminal outcome:** ticket scored on quality / CSAT-risk / SLA-adherence; systemic issues
  flagged + recommended to Dexter/Jessica; no actuation.
- **Procedure Steps:**
  1. `[automation]` Load the closed/sampled ticket (read-only); score documentation quality,
     resolution quality, time-to-resolve vs SLA. **L2.**
  2. `[automation]` Detect CSAT-risk signals (reopen risk, tone, premature close — Felix's
     "quick-fix masking root cause" flag).
  3. `[automation]` Aggregate into systemic patterns (per technician / per category).
  4. `[hybrid]` Flag + recommend to Dexter (delivery owner) / Jessica (risk); PARK — recommend-only.
- **Driving policy:** TBD (#1586) service-quality/SLA policy.
- **Realization:** `icm/domains/service-quality/ticket-quality-audit/` (live SoR).
- **Autonomy ceiling:** L2 (audit/score/flag); NO actuation (every output is a flag/recommendation).
- **Human-in-loop:** Dexter/Jessica/Mark. L1 = Tess proposes scores, human reviews; L2 =
  auto-score+flag. Floor: corrections are always the delivery owner's (Tess never re-works tickets).
- **Substrate deps:** #389 (pattern recall), #991 (close-event trigger), #119. **subject:** both
  (client-ticket quality + dogfood internal tickets).

### 10-T2 · CSAT survey + sentiment program
- **Owner / Stream:** Tess / 10 (deeper playbook under #1560). ⛔ **UNFILED leaf.**
- **Trigger:** ticket/project close (survey-eligible) OR cadence.
- **Terminal outcome:** CSAT captured + scored + trended; low-CSAT accounts flagged to Celeste
  (relationship) + Jessica.
- **Procedure Steps:**
  1. `[hybrid]` Trigger a CSAT survey (send is a customer-facing action — gauntlet path).
  2. `[automation]` Capture + normalize responses; trend per account/technician. **L2.**
  3. `[automation]` HAND OFF low-CSAT signals to **Celeste** (client-360 / churn-risk, Stream 08) +
     flag to Jessica. SEAM.
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only (graduates; survey-send is gated).
- **Autonomy ceiling:** L2; `always_gate`: outbound survey send is customer-facing (gauntlet).
- **Human-in-loop:** Jessica/Celeste-human; floor: customer-facing send gated.
- **Substrate deps:** Celeste handoff (#991), consent-gating for sends. **subject:** both.

### 10-T3 · SLA-conformance monitoring
- **Owner / Stream:** Tess / 10 (deeper playbook under #1560). ⛔ **UNFILED leaf.**
- **Trigger:** continuous / cadence over open + closed tickets.
- **Terminal outcome:** SLA breaches + at-risk tickets surfaced; systemic SLA gaps recommended to
  Dexter/Jessica.
- **Procedure Steps:**
  1. `[automation]` Evaluate ticket timers vs SLA targets (read-only). **L2.**
  2. `[automation]` Flag breached + at-risk; aggregate systemic gaps.
  3. `[hybrid]` Recommend to Dexter/Jessica; PARK.
- **Driving policy:** TBD (#1586) SLA policy.
- **Realization:** procedure-only.
- **Autonomy ceiling:** L2; recommend-only.
- **Human-in-loop:** Dexter/Jessica; floor: standing watcher.
- **Substrate deps:** ticket data. **subject:** both · **OVERLAP:** real-time SLA escalation/dispatch
  is the Service stream's (Felix/Scout/Ozzie); Tess audits CONFORMANCE after the fact, not live
  escalation — split at the seam.

---

## Vera (Platform / Governance) — Epic #1397 (20 playbooks #1458–1478)

Ceiling **L2** (observe / propose / auto-run audits + reversible auto-quarantine). EVERY correction,
governance-config change, and security-standard ratification is **`always_gate` to Mark**.
Audit-and-recommend, never silent-action; audit-by-reference (never reproduces PII). The
earned-autonomy state machine is framework-owned (ADR-0121) — Vera OBSERVES the ledger, never
executes it. THREE missions: conformance fact-checker · client-security-standard owner · auditor.
**Per the D8 ruling, connection-health monitoring is Vera's (platform function, OS-self-op) — 10-O11.**

### 10-V1 · Conformance-detect → quarantine → route → verify (the Defined Way loop) — #1459/#1467
- **Owner / Stream:** Vera / 10.
- **Trigger:** an agent run completes (event) OR cadence sweep.
- **Terminal outcome:** any divergence from the domain's Defined Way is detected, reversibly
  quarantined, routed to the owning agent/human, and verified closed.
- **Procedure Steps:**
  1. `[automation]` Load the run + the domain's machine-checkable Defined Way ruleset (Conformance
     Engine, #1459). **L0.**
  2. `[automation]` Detect divergence (the Deviation).
  3. `[automation]` **Quarantine** = reversible protective hold (L2 auto, reversible).
  4. `[hybrid]` **Route** the correction to the owning agent/human — Vera never re-runs the work.
     (**`always_gate`:** the actual correction is the OWNER's.)
  5. `[automation]` **Verify** closure; track until resolved (#1467).
- **Driving policy:** the per-domain **Defined Way** — TBD (#1586) for the business-policy half; ADR
  for the engine.
- **Realization:** `icm/domains/platform/conformance/` (live SoR).
- **Autonomy ceiling:** L2; quarantine reversible-auto; correction `always_gate` (owner's).
- **Human-in-loop:** Mark + owning agent's human. L1 = Vera flags, human routes; L2 =
  auto-detect+quarantine+route. Floor: governance-config + corrections always gated to Mark/owner.
- **Substrate deps:** Conformance Engine + rule store (BE-owed), #991 (run-complete event), #983.
  **subject:** imperion · **note:** per-domain conformance #1460–1466 (Chase/Belle/Pierce/Audrey/
  Celeste/Vance/Felix) are PARAMETERIZED instances of this one loop, not 7 distinct procedures (10-V2
  authors the rulebooks).

### 10-V2 · Author per-domain conformance rulebook — #1460–1466
- **Owner / Stream:** Vera / 10.
- **Trigger:** a domain's Defined Way is established/changed (new ADR, new SOP).
- **Terminal outcome:** that domain's Defined Way is encoded as a machine-checkable ruleset 10-V1 can run.
- **Procedure Steps:**
  1. `[hybrid]` Read the domain's SOP + guardrails (from the owning agent's persona/ADRs).
  2. `[automation]` Encode as a ruleset (the Conformance Engine ruleset format). **L2.**
  3. `[gui-step]` Mark ratifies the ruleset. (**`always_gate`:** governance-config change.)
- **Driving policy:** the domain's Defined Way + TBD (#1586).
- **Realization:** `icm/domains/platform/conformance/` rulebooks (one per domain).
- **Autonomy ceiling:** L2; ruleset activation `always_gate` (Mark).
- **Human-in-loop:** Mark; floor: ruleset = governance config, always gated.
- **Substrate deps:** Conformance Engine. **subject:** imperion.

### 10-V3 · Define + version the Client Security Standard — #1468
- **Owner / Stream:** Vera / 10 (the standard-owner mission).
- **Trigger:** threat-landscape change / cadence / a gap discovered → a new standard version needed.
- **Terminal outcome:** a new versioned Client Security Standard drafted, ratified by Mark, all
  clients re-scored against it.
- **Procedure Steps:**
  1. `[automation]` Draft/propose the new standard version (what "secure" means now). **L2.**
  2. `[gui-step]` ⛔ **Mark ratifies — `always_gate`** (Vera drafts/proposes, Mark ratifies).
  3. `[automation]` On ratify, trigger re-score of all clients (10-V4) against the new standard.
- **Driving policy:** the Client Security Standard itself (Vera-owned, versioned) — distinct from
  `unified-security-standard.md`. (Schema dep: standard-version store, **#1579**.)
- **Realization:** `icm/domains/platform/client-security-standard/` + standard store (BE-owed).
- **Autonomy ceiling:** L2; standard ratification `always_gate` (Mark, the hard floor).
- **Human-in-loop:** Mark (CISO). Floor: ratification NEVER auto — earned autonomy can't cross it.
- **Substrate deps:** standard-version store (#1579), posture data, #389. **subject:** both.

### 10-V4 · Evaluate client posture vs current standard — #1469
- **Owner / Stream:** Vera / 10.
- **Trigger:** posture snapshot taken / standard re-version / cadence.
- **Terminal outcome:** each client's posture measured against the current standard; an advisory
  get-back-in-shape evaluation produced.
- **Procedure Steps:**
  1. `[automation]` Load the client's `posture_snapshot` + current standard. **L0.**
  2. `[automation]` Measure conformance; compute the gap.
  3. `[hybrid]` Produce the evaluation; HAND to **Celeste** to present (Vera measures, Celeste
     presents, human/Datto remediates). SEAM.
- **Driving policy:** Client Security Standard (TBD #1586 policy half).
- **Realization:** `icm/domains/platform/posture-evaluation/`.
- **Autonomy ceiling:** L2; advisory only.
- **Human-in-loop:** via Celeste → human/Datto remediation. Floor: remediation never Vera's.
- **Substrate deps:** posture gold, Celeste handoff (#991). **subject:** both · **SEAM:** Vera
  measures / Celeste presents / human-Datto remediates.

### 10-V5 · Detect security drift — #1470
- **Owner / Stream:** Vera / 10.
- **Trigger:** new posture data / cadence.
- **Terminal outcome:** drift from the standard (or from each client's prior conformant state)
  detected + flagged.
- **Procedure Steps:**
  1. `[automation]` Compare current posture to standard + prior snapshot. **L2.**
  2. `[automation]` Classify drift.
  3. `[hybrid]` Flag → Celeste/human.
- **Driving policy:** Client Security Standard (TBD #1586).
- **Realization:** `icm/domains/platform/security-drift/`.
- **Autonomy ceiling:** L2; flag-only.
- **Human-in-loop:** via Celeste; floor: remediation human.
- **Substrate deps:** posture gold. **subject:** both · **OVERLAP with Cyrus (SOC, Stream 07):**
  Vera = standard-conformance drift (slow/posture), Cyrus = active-threat drift (fast/alert). Split.

### 10-V6 · Draft remediation / get-back-in-shape plan — #1471
- **Owner / Stream:** Vera / 10.
- **Trigger:** a drift/gap is detected (from 10-V4/V5).
- **Terminal outcome:** a remediation recommendation (advisory) produced + routed.
- **Procedure Steps:**
  1. `[automation]` Map gaps → recommended actions. **L2.**
  2. `[hybrid]` HAND to Celeste/human; PARK (advisory). (**`always_gate`:** actuation is human/Datto.)
- **Driving policy:** Client Security Standard (TBD #1586).
- **Realization:** `icm/domains/platform/remediation-plan/`.
- **Autonomy ceiling:** L2; recommend-only.
- **Human-in-loop:** human/Datto; floor: remediation never auto.
- **Substrate deps:** posture gold, Celeste. **subject:** both.

### 10-V7 · Re-evaluate on standard evolution — #1472
- **Owner / Stream:** Vera / 10.
- **Trigger:** a new standard version is ratified (from 10-V3).
- **Terminal outcome:** all clients re-scored against the new standard; deltas surfaced.
- **Procedure Steps:**
  1. `[automation]` On ratify, fan-out re-evaluation across all clients (the all-client autonomous
     reach — contained by rate/fan-out caps #991-1A). **L2.**
  2. `[automation]` Surface deltas → Celeste/human.
- **Driving policy:** Client Security Standard (TBD #1586).
- **Realization:** `icm/domains/platform/standard-evolution/`.
- **Autonomy ceiling:** L2.
- **Human-in-loop:** human; floor: remediation human.
- **Substrate deps:** fan-out containment (#991-1A), posture gold. **subject:** both.

### 10-V8 · Nightly autonomy + agent-run audit — #1473
- **Owner / Stream:** Vera / 10 (the auditor mission).
- **Trigger:** schedule (nightly).
- **Terminal outcome:** anomalous autonomy decisions + agent_run outcomes surfaced; findings
  reported by reference.
- **Procedure Steps:**
  1. `[automation]` Sweep the `agent_run` ledger (what happened) + autonomy decisions
     (dial/ceiling/routing). **L2.**
  2. `[automation]` Detect anomalies (over-reach, parked-that-should-have-run) — read the
     framework's earned-autonomy ledger, never execute it (ADR-0121).
  3. `[hybrid]` Report findings by reference (never reproduce PII) → Jessica/Mark.
- **Driving policy:** ADR-0121 (earned autonomy) + ADR-0128 (ladder) + TBD (#1586).
- **Realization:** `icm/domains/platform/autonomy-audit/`.
- **Autonomy ceiling:** L2; audit-by-reference, report-only.
- **Human-in-loop:** Jessica/Mark; floor: Vera observes the promotion ledger, never executes it.
- **Substrate deps:** `agent_run` (0056), autonomy policy tables, #991. **subject:** imperion.

### 10-V9 · Eval-regression detection — #1474
- **Owner / Stream:** Vera / 10.
- **Trigger:** eval run completes (or nightly).
- **Terminal outcome:** eval-score regressions vs baseline surfaced; tuning candidates flagged.
- **Procedure Steps:**
  1. `[automation]` Compare `agent_eval_run` results to `eval/baselines.json`. **L2.**
  2. `[automation]` Flag regressions.
  3. `[hybrid]` Open tuning candidates (Mark-gated) → feedback loop (10-O5). SEAM.
- **Driving policy:** ADR-0106 (eval plane) + TBD (#1586).
- **Realization:** `icm/domains/platform/eval-regression/`.
- **Autonomy ceiling:** L2; flag-only.
- **Human-in-loop:** Mark; floor: tuning changes Mark-gated.
- **Substrate deps:** eval plane (#983), #389 (retrieval evals). **subject:** imperion · **OVERLAP
  with 10-O5:** Vera DETECTS the regression, the feedback-loop ACTS on it. Split.

### 10-V10 · Governance-setting recommendation — #1475
- **Owner / Stream:** Vera / 10.
- **Trigger:** audit finds a mis-set governance config (grant too broad, dial too high for track record).
- **Terminal outcome:** a governance-config change recommendation drafted + routed to Mark.
- **Procedure Steps:**
  1. `[automation]` Detect the mis-config. **L2.**
  2. `[hybrid]` Draft the recommendation; PARK. (**`always_gate`:** governance-config change = Mark.)
- **Driving policy:** ADR-0121 / ADR-0107 (dial + grants) + TBD (#1586).
- **Realization:** `icm/domains/platform/governance-recommendation/`.
- **Autonomy ceiling:** L2; recommend-only.
- **Human-in-loop:** Mark; floor: config change always gated.
- **Substrate deps:** grant/dial tables. **subject:** imperion · **OVERLAP with 10-O3:** Vera
  RECOMMENDS, the dial-governance procedure APPLIES the change. Split.

### 10-V11 · Grounding-conflict audit + domain-owner escalation — #1476
- **Owner / Stream:** Vera / 10.
- **Trigger:** cadence OR a grounding conflict is logged (personal vs silver vs OKF canon disagree).
- **Terminal outcome:** open grounding conflicts surfaced + escalated to the domain business-owner
  to resolve.
- **Procedure Steps:**
  1. `[automation]` Detect disagreements across canon/silver/personal (the grounding-conflict
     workflow, ADR-0119). **L2.**
  2. `[hybrid]` Escalate to the domain-owner registry's owner; track resolution. (**`always_gate`:**
     resolution is the owner's.)
- **Driving policy:** ADR-0119 (grounding conflict → owner-resolution) + TBD (#1586).
- **Realization:** `icm/domains/platform/grounding-conflict-audit/`.
- **Autonomy ceiling:** L2; escalate-only.
- **Human-in-loop:** domain business-owner; floor: resolution human.
- **Substrate deps:** grounding-conflict workflow, domain-owner registry (owed), #389. **subject:**
  imperion · **SEAM with the Personal Curator (10-O7):** Curator = WITHIN one owner's personal store;
  Vera = ACROSS canon/silver/personal at company tier. Split.

### 10-V12 · PII / data_class compliance audit — #1477
- **Owner / Stream:** Vera / 10.
- **Trigger:** cadence (nightly) OR a flagged run.
- **Terminal outcome:** PII leaks + data_class boundary violations surfaced by reference; findings routed.
- **Procedure Steps:**
  1. `[automation]` Sweep runs/outputs for out-of-class data exposure (the always-gate data_classes
     — financial/security_credentials/client_pii). **L2.**
  2. `[automation]` Report by reference ("PII leak in run X, field Y") — NEVER reproduces the value
     (audit-by-reference, the Audrey-salary-gag peer).
  3. `[hybrid]` Route to Jessica/Roman/Mark.
- **Driving policy:** ADR-0118 (data_class) + ADR-0105 (RLS) + `unified-security-standard.md` + TBD (#1586).
- **Realization:** `icm/domains/platform/pii-audit/`.
- **Autonomy ceiling:** L2; report-by-reference only.
- **Human-in-loop:** Jessica/Roman/Mark; floor: standing.
- **Substrate deps:** data_class RLS (#967/#990), `agent_run`. **subject:** imperion.

### 10-V13 · Data-integrity / contradiction audit (company tier) — #1478
- **Owner / Stream:** Vera / 10.
- **Trigger:** cadence OR ingestion/merge run completes.
- **Terminal outcome:** company-tier data contradictions / integrity gaps surfaced + routed to the
  owning data plane.
- **Procedure Steps:**
  1. `[automation]` Reconcile silver/gold facts; detect contradictions + integrity gaps (the legacy
     "contradiction agent" folded into Vera). **L2.**
  2. `[hybrid]` Route to the owning data plane (Pipeline/LocalPipeline/data-owner); track closure.
- **Driving policy:** ADR-0086 (OKF authority) + medallion contracts + TBD (#1586).
- **Realization:** `icm/domains/platform/data-integrity-audit/`.
- **Autonomy ceiling:** L2; surface + route only.
- **Human-in-loop:** data-owner; floor: corrections route to the owner, never silent.
- **Substrate deps:** silver/gold, OKF. **subject:** imperion.

### 10-V14 · Connection-health + KV-hygiene sweep (platform function, D8) — OS-self
- **Owner / Stream:** Vera / 10 (per the **D8 ruling**: connection-health monitoring → Vera,
  platform function / OS-self-op).
- **Trigger:** cadence OR an inferred-health amber/red on a connection.
- **Terminal outcome:** stale/error connections surfaced; KV hygiene (orphaned/expired secrets,
  non-canonical names) flagged for cleanup.
- **Procedure Steps:**
  1. `[automation]` Sweep `connection` rows: has-credential + status + `last_sync_at` freshness vs
     cadence → green/amber/red. **L2.**
  2. `[automation]` Flag non-canonical KV refs (`kv://imperion/conn/*` legacy, provider-not-3rd) +
     orphaned secrets.
  3. `[hybrid]` Route to Mark/IT for re-custody (10-O10) or cleanup; PARK destructive deletes.
- **Driving policy:** ADR-0122 + CLAUDE.md §5 + TBD (#1586).
- **Realization:** `icm/domains/platform/connection-health/` (graduates; `connection-health.ts` lib
  exists).
- **Autonomy ceiling:** L2; flag-only; deletes `always_gate`.
- **Human-in-loop:** Mark/IT. Floor: secret deletes Mark-gated.
- **Substrate deps:** connection-health lib (built), KV introspection. **subject:** imperion ·
  **NOTE: D8 resolves the prior Ozzie-vs-Vera ownership gap — connection-health is Vera's platform
  function. Ozzie/NOC live-host telemetry stays in Stream 06.**

---

## Jessica (Chief Risk Officer) — Epic #1550

Ceiling **L2 delegate-only** (synthesize/advise/orchestrate; inherits sub-agent ceilings). Serves
Mark (risk reports to Mark). Owns Platform & Assurance GOVERNANCE here. **NOTE:** her
`risk-assurance-sweep` SYNTHESIS BRIEF is Stream 11 — not duplicated; below are the
assurance-GOVERNANCE procedures she owns at this tier.

### 10-J1 · Govern the assurance program (Vera/Tess/Lexicon orchestration)
- **Owner / Stream:** Jessica / 10.
- **Trigger:** cadence OR a division-level assurance escalation from Vera/Tess/Lexicon.
- **Terminal outcome:** assurance work (conformance, quality, doc-hygiene) coordinated; cross-cutting
  risks routed to Mark.
- **Procedure Steps:**
  1. `[automation]` Receive escalations/flags from Vera (conformance/posture), Tess (quality),
     Lexicon (knowledge freshness). **L2.**
  2. `[automation]` Triage + dedupe; identify cross-cutting risk themes.
  3. `[hybrid]` Route to Mark / the owning agent; track. (Delegate-only — never bypasses a
     sub-agent gauntlet.)
- **Driving policy:** TBD (#1586) risk-governance policy.
- **Realization:** `icm/executive/cro/assurance-governance/` (graduates with delegate cap).
- **Autonomy ceiling:** L2 delegate-only.
- **Human-in-loop:** Mark. L1 = Jessica drafts routing, Mark decides; L2 = auto-triage+route. Floor:
  risk acceptance always Mark's.
- **Substrate deps:** delegate/handoff cap (#1536), #991. **subject:** imperion · **SEAM:** the
  SWEEP/brief itself = Stream 11; this is the governance-routing procedure.

### 10-J2 · Govern eval-quality acceptance (quality-gate stewardship)
- **Owner / Stream:** Jessica / 10.
- **Trigger:** eval-gate result / agent-quality-eval cadence / a regression flagged by Vera (10-V9).
- **Terminal outcome:** quality-gate status owned at the risk tier; a failing gate becomes a
  risk-accepted-or-blocked decision routed to Mark.
- **Procedure Steps:**
  1. `[automation]` Consume the eval-gate + Vera's regression findings. **L2.**
  2. `[hybrid]` Frame as a risk decision (accept / block-release / open tuning).
  3. `[gui-step]` Mark decides; **`always_gate`** (release risk acceptance + go-live gating).
- **Driving policy:** ADR-0106 + ADR-0057 (Agent-Quality Eval acceptance) + TBD (#1586).
- **Realization:** procedure-only (graduates).
- **Autonomy ceiling:** L2.
- **Human-in-loop:** Mark; floor: release/risk acceptance always human.
- **Substrate deps:** eval plane (#983), Vera 10-V9 seam. **subject:** imperion · **OVERLAP with
  10-V9 (detect) + 10-O5 (act):** Jessica makes the RISK CALL; Vera detects; O5 tunes. Three roles.

### 10-J3 · Own the risk register (platform/assurance risks)
- **Owner / Stream:** Jessica / 10.
- **Trigger:** a new platform/assurance risk surfaces (audit finding, drift, incident) OR cadence.
- **Terminal outcome:** platform/assurance risk register kept current; each risk has an owner +
  status; top risks roll into the Stream-11 brief.
- **Procedure Steps:**
  1. `[automation]` Capture risks from Vera/Tess/Lexicon/Cyrus/Grace feeds; label signal vs
     inference. **L2.**
  2. `[automation]` Score + assign an owner; track mitigation.
  3. `[hybrid]` Surface top risks to Mark; risk acceptance always-gate.
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only (graduates; register store owed).
- **Autonomy ceiling:** L2.
- **Human-in-loop:** Mark; floor: risk acceptance human.
- **Substrate deps:** register store (owed), #991. **subject:** imperion · **NOTE: DISTINCT from
  Celeste's client-facing Client Risk Register (Stream 08) — Jessica's is internal platform/OS risk.**

---

## Lexicon (Doc-Hygiene / Knowledge) — Epic #1561

Ceiling **L3** (poll/draft/update + stale-flag auto; publish-to-SoT gated until trusted). Reports to
Jessica. IT Glue = the SoT. **This catalog's human-facing runbooks are Lexicon's long-term output**
(D5: a runbook = generated projection of the ICM Workspace; Lexicon syncs workspace→runbook→IT Glue).

### 10-K1 · Doc-sync poll → IT Glue SoT
- **Owner / Stream:** Lexicon / 10 (tracer `doc-sync`).
- **Trigger:** scheduled poll OR a change event across sources.
- **Terminal outcome:** stale/contradictory/missing docs detected; updated/drafted into IT Glue (the
  SoT); a diff proposed for review.
- **Procedure Steps:**
  1. `[automation]` Poll ALL doc sources (IT Glue, repo docs, ICM workspaces, runbooks, vendor docs). **L0.**
  2. `[automation]` Detect stale / contradictory / missing docs.
  3. `[automation]` Draft/update the doc into IT Glue; produce a diff. **L3.**
  4. `[hybrid]` PARK publish-to-SoT until trusted (L3 publish gated early; auto once earned).
     (**`always_gate` early:** SoT writes.)
- **Driving policy:** TBD (#1586) documentation standard (also CLAUDE.md §8 internal).
- **Realization:** `icm/domains/knowledge/doc-sync/` (live SoR).
- **Autonomy ceiling:** L3; SoT publish gated until trust earned (no secrets/PII in docs).
- **Human-in-loop:** Lexicon-human/Derek. L1 = drafts diffs, human publishes; L3 = auto-publish
  low-risk, human reviews SoT-critical. Floor: secrets/PII never in docs; high-stakes SoT writes gated.
- **Substrate deps:** IT Glue connector, #389 (contradiction detection), #991. **subject:** both
  (client runbooks in IT Glue + internal docs/dogfood).

### 10-K2 · Author human-facing runbooks from agent procedures
- **Owner / Stream:** Lexicon / 10 (deeper playbook; the catalog's long-term home, D5). ⛔ **UNFILED
  leaf under #1561.**
- **Trigger:** an ICM Workspace (Operating Procedure) is created/changed OR Sage closes a problem fix.
- **Terminal outcome:** a human-readable runbook (the generated PROJECTION of the workspace) authored
  + synced to IT Glue.
- **Procedure Steps:**
  1. `[automation]` Read the canonical ICM Workspace (the live SoR per D5). **L0.**
  2. `[automation]` Generate the human-facing runbook projection (`docs/runbooks/<stream>/<proc>.md`). **L3.**
  3. `[automation]` Sync runbook → IT Glue.
  4. `[hybrid]` PARK publish until trusted.
- **Driving policy:** CLAUDE.md §8 doc standard + TBD (#1586).
- **Realization:** `icm/domains/knowledge/runbook-authoring/`.
- **Autonomy ceiling:** L3; publish gated until trusted.
- **Human-in-loop:** Lexicon-human; floor: SoT publish gated early.
- **Substrate deps:** ICM workspace files, IT Glue, Sage seam (Stream 05). **subject:** both ·
  **NOTE: this is the procedure that MATERIALIZES this whole catalog as runbooks long-term.**

### 10-K3 · Knowledge freshness / contradiction surfacing
- **Owner / Stream:** Lexicon / 10 (deeper playbook under #1561).
- **Trigger:** cadence OR a source change that may invalidate existing docs.
- **Terminal outcome:** stale/contradictory knowledge flagged with a freshness verdict; routed to
  the owning author.
- **Procedure Steps:**
  1. `[automation]` Compute freshness (last-changed vs source change; "freshness = correctness"). **L3.**
  2. `[automation]` Detect contradictions across docs.
  3. `[hybrid]` Flag → owning author; PARK.
- **Driving policy:** CLAUDE.md §8 + ADR-0104 (OKF freshness-as-correctness) + TBD (#1586).
- **Realization:** `icm/domains/knowledge/freshness-audit/`.
- **Autonomy ceiling:** L3; flag-only.
- **Human-in-loop:** author/Derek; floor: standing.
- **Substrate deps:** doc sources, #389. **subject:** both · **OVERLAP with 10-O8:** O8 = the machine
  OKF concept files; K3 = human-facing IT-Glue docs. Split at the seam (docs vs semantic layer).

---

## OS-self-operation (the agentic OS operating itself)

Per **D7.1** in scope — running the agentic OS IS running the company. Owner assigned per fit
(Rachel/Vera/Jessica/Lexicon/Nova). These run the OS as software-operating-software. Mostly
`subject:imperion`.

### 10-O1 · Onboard a new agent into the org
- **Owner / Stream:** Rachel (program) + Mark (gate) / 10 (OS-self).
- **Trigger:** a new agent is approved for the roster (org-recast adds one).
- **Terminal outcome:** a new agent exists with full ICM anatomy, wired into `org.yaml`,
  conformance-green, dial conservative, goldens shipped.
- **Procedure Steps:**
  1. `[hybrid]` Author `icm/domains/<agent>/` anatomy (room.md + room.yaml ⊆ Constitution + persona +
     ≥1 workflow). (**`always_gate`:** Constitution widening + tool grants = Mark, via PR review.)
  2. `[automation]` Wire `reports_to` into `org.yaml`; conformance check (reports_to + subset invariant). **L2.**
  3. `[automation]` Author per-agent eval goldens (#1538) asserting correct retrieval + park/route.
  4. `[gui-step]` Set the starting autonomy dial conservative (L1); Mark ratifies activation.
- **Driving policy:** ADR-0128 (ladder) + the build-standard (org-recast) + `icm/CONSTITUTION` + TBD (#1586).
- **Realization:** `icm/` authoring + CI (runs through the PR/CI pipeline, not an ICM workspace itself).
- **Autonomy ceiling:** L2 (program); `always_gate`: Constitution/grant changes + activation = Mark.
- **Human-in-loop:** Mark + codex review (CLAUDE.md §3/§10.4). Floor: every grant + activation gated.
- **Substrate deps:** scaffold (#1536), goldens (#1538), retrieval tier (#1537). **subject:** imperion.

### 10-O2 · Refresh an agent persona / lifecycle
- **Owner / Stream:** Rachel + Vera (conformance) / 10 (OS-self).
- **Trigger:** an ADR supersedes what a persona/guardrail teaches OR cadence persona review.
- **Terminal outcome:** the agent's persona + guardrails updated, conformance-green, in the same PR
  as the ADR (docs-gate).
- **Procedure Steps:**
  1. `[automation]` Diff the ADR/decision against the persona's guardrails (guardrails = gauntlet
     config SoT). **L2.**
  2. `[hybrid]` Update persona.md + room.yaml; re-run conformance.
  3. `[gui-step]` Mark/reviewer approves the PR. (**`always_gate`:** guardrail/ceiling changes.)
- **Driving policy:** CLAUDE.md §3 (issue→PR) + the agent's ADR + TBD (#1586).
- **Realization:** PR pipeline; persona files.
- **Autonomy ceiling:** L2; `always_gate`: guardrail/ceiling change.
- **Human-in-loop:** Mark; floor: ceiling/guardrail changes gated.
- **Substrate deps:** conformance CI. **subject:** imperion · **NOTE: mirrors Mark's personal
  `persona-refresh` skill but for AGENT personas — distinct from 10-O7 personal-knowledge curation.**

### 10-O3 · Govern the autonomy dial (draft → auto promotion)
- **Owner / Stream:** Vera (recommends) + Mark (applies) / 10 (OS-self).
- **Trigger:** Vera recommends a dial change (10-V10) OR the earned-autonomy ledger crosses a
  threshold OR a miss triggers demote.
- **Terminal outcome:** a workflow/agent's autonomy dial is set (draft→auto or up/down a level),
  audited + reversible, with the hard ceiling preserved.
- **Procedure Steps:**
  1. `[automation]` Read the earned-autonomy ledger + eval/approval track record (framework-owned,
     ADR-0121 — Vera observes, never executes). **L2.**
  2. `[hybrid]` Surface a dial-change recommendation. (**`always_gate`:** the dial-proof ceiling —
     money/customer-facing/credentials/prod-migration/X.0.0 can NEVER auto-cross.)
  3. `[gui-step]` Mark applies the dial change (admin-only, audited, reversible). Instant demote on a miss.
- **Driving policy:** ADR-0107/0109/0128 (dial + ladder) + ADR-0121 (earned autonomy) +
  standing-authorizations + TBD (#1586).
- **Realization:** `agent_autopilot_policy` admin surface + #1408 governance admin UI (v1-blocking
  for Vera).
- **Autonomy ceiling:** L2 (Vera recommends); the APPLY is Mark's `always_gate`.
- **Human-in-loop:** Mark. Floor: ceiling classes never auto-cross; dial apply Mark-gated.
- **Substrate deps:** dial tables (0123), earned-autonomy state machine (ADR-0121), governance UI
  (#1408). **subject:** imperion · **OVERLAP: 10-V10 RECOMMENDS, this APPLIES. Split.**

### 10-O4 · Author + run eval goldens
- **Owner / Stream:** Vera (regression) + the agent owner (authoring) / 10 (OS-self) — #1538 / #983.
- **Trigger:** a new agent ships (goldens are a standard artifact) OR eval cadence OR a CI
  eval-gate run.
- **Terminal outcome:** each agent has PII-free goldens; eval runs persist results; regressions feed
  the feedback loop.
- **Procedure Steps:**
  1. `[hybrid]` Author `agent_eval_case` goldens (PII-free synthetic OR redacted-from-real traces)
     asserting correct retrieval + park/route.
  2. `[automation]` Run the eval suite (`runEvalSuite` → `agent_eval_run`/`agent_eval_result`);
     deterministic assertions + cheap-tier LLM-judge. **L2.**
  3. `[automation]` Compare to baselines; on regression → 10-V9/O5.
- **Driving policy:** ADR-0106 (eval plane) + ADR-0077 (backend runner) + TBD (#1586).
- **Realization:** eval plane (`/agents/evals` dashboard + CI gate).
- **Autonomy ceiling:** L2; golden activation/baseline change gated.
- **Human-in-loop:** Mark/Jessica; floor: baseline + gate-blocking decisions human.
- **Substrate deps:** eval plane (#983, 0154/0155), #389 (retrieval evals), CI gate activation (open).
  **subject:** imperion.

### 10-O5 · Eval → improvement feedback loop
- **Owner / Stream:** Vera (opens candidates) + Mark (approves) / 10 (OS-self) — extends #983.
- **Trigger:** failed evals + low-scored `agent_run` rows (from 10-O4/V9).
- **Terminal outcome:** tuning candidates (prompt/grant/skill changes) opened, PII-safe, Mark-gated;
  goldens harvested from redacted real traces.
- **Procedure Steps:**
  1. `[automation]` Collect failed evals + low-scored runs. **L2.**
  2. `[automation]` PII-redact/synthesize traces before they enter the eval corpus (the §8 caveat).
  3. `[automation]` Open tuning candidates (prompt/grant/skill diffs).
  4. `[gui-step]` Mark approves the tuning change. (**`always_gate`:** any grant/guardrail/prompt
     change to a live agent.)
- **Driving policy:** ADR-0106 + agentic-OS design contract decision 6 (feedback loop) + TBD (#1586).
- **Realization:** procedure-only (graduates; harvest pipeline owed).
- **Autonomy ceiling:** L2; tuning apply Mark-gated.
- **Human-in-loop:** Mark; floor: live-agent changes gated.
- **Substrate deps:** eval plane, redaction step (owed), #389. **subject:** imperion · **OVERLAP:
  10-V9 detects, 10-J2 makes the risk call, this ACTS (opens candidates). Three split roles.**

### 10-O6 · Retrieval-tier / memory curation (gold ranker + tier hydration)
- **Owner / Stream:** Vera (integrity) + LocalPipeline (mechanism) / 10 (OS-self).
- **Trigger:** gold composes new `knowledge_object`s OR vectorization cadence OR a ranker-quality concern.
- **Terminal outcome:** the gold knowledge tier is hydrated (embeddings present) and the hybrid
  ranker returns useful results; recall is live.
- **Procedure Steps:**
  1. `[automation]` Compose gold `knowledge_object` summaries from silver/bronze (the medallion gold
     step). **L2.**
  2. `[automation]` Vectorize into `knowledge_embedding` (Voyage voyage-3-large @1024d) —
     `Invoke-ImperionKnowledgeSync -Vectorize` on the LP host. ⛔ **DORMANT: blocked on Voyage seed
     #389 (the critical path) + LP #176/#300/#101.** **L3.**
  3. `[automation]` Verify the hybrid ranker (semantic+keyword+metadata+temporal) returns non-empty
     (ADR-0115).
  4. `[hybrid]` Vera audits ranker quality / contradictions (10-V13); tuning Mark-gated.
- **Driving policy:** ADR-0041 (vector contract) + ADR-0113/0115 (memory tier + ranker) + TBD (#1586).
- **Realization:** LP vectorizer + gold ranker SQL (FE read).
- **Autonomy ceiling:** L3 (LP mechanism) / L2 (Vera audit); `always_gate`: AI-key custody.
- **Human-in-loop:** Mark (un-table #389) + LP operator. Floor: AI-key + embedding-provider custody.
- **Substrate deps:** **#389 Voyage seed (CRITICAL PATH — gates this and ALL worker recall)**, LP
  #176/#300/#101, #119, knowledge_object (1547 composed, embedding=0). **subject:** imperion (also
  serves clients via grounded answers → `both` in effect).

### 10-O7 · Personal-knowledge curation (Personal Curator + contradiction surfacing)
- **Owner / Stream:** Personal Curator runtime (owner-scoped) — program owner Rachel / 10 (OS-self) — BE #302.
- **Trigger:** synthesis-store change OR human vault edit OR cadence (per owner).
- **Terminal outcome:** a personal store's two substrates (Synthesis Store ↔ Curated Vault) kept in
  sync; Knowledge Contradictions surfaced for the owner to approve.
- **Procedure Steps:**
  1. `[automation]` Project Synthesis-Store changes → Curated Vault (markdown); process
     blob-first/human-edited markdown back. Runs on the `imperion-personal-curator` role
     (non-BYPASSRLS god-view, ledgered). **L2.**
  2. `[automation]` Distill Captures → resolution levels (literal/summary/meaning + Knowledge Facts
     w/ Validity Windows).
  3. `[automation]` Hunt Knowledge Contradictions (Synthesis vs Vault, or new-fact vs existing).
  4. `[gui-step]` Owner approves the correction. (**`always_gate`:** never auto-resolves a
     contradiction; never crosses the personal→company wall.)
- **Driving policy:** ADR-0114 (personal store) + ADR-0105 §3c (the wall) + TBD (#1586).
- **Realization:** `icm/` curator runtime (BE #302) — owner-scoped, intra-owner.
- **Autonomy ceiling:** owner-scoped curation; `always_gate`: contradiction resolution + cross-wall
  promotion.
- **Human-in-loop:** the store OWNER (each employee). Floor: owner approves corrections; the
  cross-wall promoter (§3c) is a SEPARATE human-approved path.
- **Substrate deps:** personal store (#1152 built, prod-applied), curator role (provisioned), **#389
  to make recall work**, BE #302 runtime (built, deploy-dormant). **subject:** imperion · **SEAM:
  Curator = WITHIN one owner; Vera grounding-audit (10-V11) = ACROSS company tier. Distinct from
  10-O2 agent-persona-refresh.**

### 10-O8 · OKF semantic-layer maintenance
- **Owner / Stream:** Lexicon (knowledge) + the schema author / 10 (OS-self).
- **Trigger:** a silver entity's shape / source-of-record / join paths change (any repo) OR a new
  silver entity OR a precedence flip.
- **Terminal outcome:** the matching OKF concept file + `coverage-matrix.md` row updated in the same
  change set (or via an immediately-filed ImperionCRM issue from a sibling); the bundle stays the
  honest meaning layer.
- **Procedure Steps:**
  1. `[automation]` Detect the silver change (the `semantic-layer` docs-gate CI catches a DDL touch;
     the cross-repo `okf-sync` gate catches a no-DDL precedence flip). **L3.**
  2. `[hybrid]` Update the concept file (definition/authority/joins) + matrix row; PII-free, no
     secrets, no code knowledge (ADR-0086 boundaries).
  3. `[automation]` LP #175 reconciliation backstop later (the "agent later" half).
- **Driving policy:** ADR-0086 (OKF) + ADR-0104 (grounding-cortex freshness) + system CLAUDE.md §11 +
  TBD (#1586).
- **Realization:** `docs/database/semantic-layer/` bundle + CI gates (runs through PR/CI).
- **Autonomy ceiling:** L3 (Lexicon poll/draft) / human authors at merge today; gate-blocking is CI.
- **Human-in-loop:** the schema author + Mark on merge. Floor: PII/secrets/code-knowledge boundaries
  are hard refusals.
- **Substrate deps:** OKF bundle (~95 files, ~complete), CI gates (live), LP #175/#176. **subject:**
  imperion · **OVERLAP with 10-K3 (Lexicon freshness):** O8 = the machine OKF concept files; K3 =
  human IT-Glue docs. Split.

### 10-O9 · Connector / connection setup
- **Owner / Stream:** Vance/IT (operator) + Mark (custody) / 10 (OS-self) — #1256.
- **Trigger:** a new data source must be connected OR a Planned connector is built out.
- **Terminal outcome:** a live `connection` (company or client scope) with a Key-Vault-custodied
  credential under the canonical name, health green, ingesting.
- **Procedure Steps:**
  1. `[gui-step]` On `/settings/connections`, enter the credential on the card (company scope) or on
     a client-mapping row (client scope). (**`always_gate`:** credential custody = human, on the GUI.)
  2. `[automation]` Backend custody → KV under `conn-<scope>-<provider>[-<disc>]` (provider 3rd) +
     upsert the `connection` row. **L2.**
  3. `[hybrid]` Run **Test Connection** live probe where wired (DocuSign first); else inferred health.
  4. `[automation]` Resolve Client Mapping for per-client connectors.
- **Driving policy:** ADR-0103/0122 (connections rework) + the KV naming grammar + TBD (#1586).
- **Realization:** `/settings/connections` + backend custody endpoints.
- **Autonomy ceiling:** human-entered credentials; `always_gate`: secret custody.
- **Human-in-loop:** Mark/admin. Floor: secret entry always human; never read/print/commit secrets.
- **Substrate deps:** connections surface (built), backend custody (built), #119 for new endpoints.
  **subject:** imperion (Imperion's own connectors; client M365/UniFi creds = `both`).

### 10-O10 · Credential rotation
- **Owner / Stream:** Mark (custody) + IT / 10 (OS-self).
- **Trigger:** rotation cadence OR a credential expiry/compromise OR a vendor key change.
- **Terminal outcome:** a credential rotated under the same canonical KV name, connection health
  restored, no downtime, no secret ever in repo/issue/log.
- **Procedure Steps:**
  1. `[gui-step]` Re-enter/re-custody the credential (re-save writes the canonical name).
  2. `[automation]` Backend re-custody to KV; old secret orphaned (harmless) or Mark-gated delete. **L2.**
  3. `[hybrid]` Verify health green (inferred + Test Connection).
- **Driving policy:** CLAUDE.md §5 (secret rotation) + ADR-0122 + TBD (#1586).
- **Realization:** `/settings/connections` re-save.
- **Autonomy ceiling:** human; `always_gate`: secret material.
- **Human-in-loop:** Mark. Floor: rotation + secret handling always human.
- **Substrate deps:** connections surface, KV. **subject:** imperion · **OVERLAP with 10-O9:**
  rotation is the re-custody variant; kept distinct (different trigger + terminal).

### 10-O11 · Backend deploy + trigger-sync verification
- **Owner / Stream:** Marshall (Change/Release, Stream 06) + Dexter / 10 (OS-self) — SEAM with Stream 06.
- **Trigger:** a backend deploy lands (new/changed Azure Function).
- **Terminal outcome:** new endpoints are trigger-synced and reachable; "deployed" is verified, not
  assumed.
- **Procedure Steps:**
  1. `[automation]` Deploy lands code (CI/CD).
  2. `[hybrid]` For NEW endpoints, run/confirm `syncfunctiontriggers` (#119) — code lands but
     triggers stay dormant until synced (the standing gotcha). **L2.**
  3. `[automation]` Verify reachability (authenticated allowlisted caller).
- **Driving policy:** backend ADR-0035 + the #119 trigger-sync contract + TBD (#1586).
- **Realization:** CI/CD pipeline + ops verification.
- **Autonomy ceiling:** L2 (verify); deploy/promote is Marshall's gated change.
- **Human-in-loop:** Mark/Derek on prod deploys. Floor: prod deploys gated.
- **Substrate deps:** #119, deploy workflow (now auto-runs syncfunctiontriggers for new deploys).
  **subject:** imperion · **SEAM: the Change/Release governance is Marshall's (Stream 06, change_freeze/
  rollback/standard-change #1579); this is the OS-self verification half.**

### 10-O12 · Nova intake-route (orchestrator front-door)
- **Owner / Stream:** Nova (orchestrator) / 10 (OS-self) — tracer `intake-route`.
- **Trigger:** a user request hits the single orchestrator (the one agent experience).
- **Terminal outcome:** the request is routed to the right C-suite/sub-agent, context+memory managed,
  permissions enforced, one response returned.
- **Procedure Steps:**
  1. `[automation]` Interpret the request; ground via OKF + `search_knowledge` (orchestrator-only
     retrieval) + recall (dormant #389). **L2.**
  2. `[automation]` Route THROUGH the C-suite/division lead (not a flat 26-peer summon) → the owning
     sub-agent.
  3. `[automation]` Enforce permissions (RLS claims flow) + the gauntlet on any action.
  4. `[hybrid]` Return one response; park anything above ceiling to the cockpit.
- **Driving policy:** ADR-0004 (single orchestrator) + ADR-0110 (OS framing) + TBD (#1586).
- **Realization:** `icm/executive/orchestrator/intake-route/` (live SoR).
- **Autonomy ceiling:** L2 delegate-only (Nova never bypasses a sub-agent's gauntlet; world-changing
  acts inherit the sub-agent ceiling).
- **Human-in-loop:** every user. Floor: above-ceiling actions park to the human cockpit.
- **Substrate deps:** orchestrator runtime, #389 (recall), #991 (events), gauntlet. **subject:**
  imperion · **NOTE: Nova's full org-orchestration is Stream 11; THIS is the per-request intake
  operating procedure (the front-door). Flag the seam with Stream 11.**

### 10-O13 · Monitoring-bronze ingestion + health-signal wiring (OS-self observability)
- **Owner / Stream:** Vera (governance) + Ozzie/NOC (live telemetry, Stream 06) / 10 (OS-self).
- **Trigger:** monitoring cadence OR a health-signal source comes online (new connector / endpoint /
  agent run stream).
- **Terminal outcome:** OS-self health signals (connection freshness, agent_run health, endpoint
  reachability, deploy state) land in the monitoring bronze tier and feed the governance sweeps.
- **Procedure Steps:**
  1. `[automation]` Ingest health/telemetry signals into the **monitoring bronze (#1578)** tier
     (connection status, agent_run outcomes, deploy/trigger-sync state). **L2.**
  2. `[automation]` Normalize into health metrics the governance sweeps (10-V8/V14) consume.
  3. `[hybrid]` Route degraded signals to Vera (governance) / Ozzie (live ops); PARK actuation.
- **Driving policy:** TBD (#1586) + ADR-0035 (backend boundary).
- **Realization:** `icm/domains/platform/monitoring-bronze/` (graduates; bronze schema #1578 owed).
- **Autonomy ceiling:** L2; ingest + route only; no actuation.
- **Human-in-loop:** Vera/Ozzie/Mark; floor: corrective actuation routes to the owning plane.
- **Substrate deps:** **#1578 monitoring bronze**, `agent_run` (0056), connection-health lib, #991.
  **subject:** imperion · **SEAM: live-host telemetry/NOC is Ozzie's (Stream 06); the governance
  consumption is Vera's (10-V8/V14).**

---

## Provable-coverage note

Every owner epic is represented: Rachel #1546 · Holly #1558 · Laurel #1559 · Tess #1560 · Vera #1397
(20 leaves #1458–1478 all mapped; #1460–1466 fold into 10-V1+V2 as one parameterized loop + rulebook
author) · Jessica #1550 · Lexicon #1561. Cross-cutting #1543/#1544/#1537/#1538 mapped; Osiris #1562
referenced as the Stream-04 JML seam (not owned here). **D8 resolved** the prior connection-health
ownership gap → Vera (10-V14, platform function). UNFILED leaves flagged inline (Holly 10-H4/H5,
Tess 10-T2/T3, Lexicon 10-K2) = sub-issues under their owner epics. Per **D7.1** the 13 OS-self
procedures are first-class — running the agentic OS is running the company.

**Count: 40 Operating Procedures** — Rachel 4 (A1–A4) · Holly 5 (H1–H5) · Laurel 3 (L1–L3) · Tess 3
(T1–T3) · Vera 14 (V1–V14, incl. V14 connection-health per D8) · Jessica 3 (J1–J3) · Lexicon 3
(K1–K3) · OS-self 13 (O1–O13).
