# Stream 10 — Run the Company

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-0133](../../decision-records/ADR-0133-operating-procedure-catalog.md). Terms
> **Operating Procedure** / **Procedure Step** are defined in [`CONTEXT.md`](../../../CONTEXT.md).
>
> **Workflow Doctrine (ADR-0136) is inherited by every procedure below — not restated per entry.**
> The eleven cross-cutting rules (A1–A11) and the nine archetype step-templates (B1–B9) are the
> floor. Each procedure names its **archetype** and declares only its *deltas*. The doctrine carries:
> the universal `always_gate` set (A2) · L0 ship-dial (A3) · the 4-part easy-button bar at every gate
> (A4) · the evidence floor — cite + as-of, empty→park/delegate (A5) · computed-urgency notification
> + `reports_to` fallback (A6) · pool-never-bleed (A7) · idempotent actuation + read-back (A9) ·
> reversibility→derived-ceiling + halt-no-rollback (A10) · obligation/action separation (A11).

**The BIGGEST stream — running the agentic OS is running the company (D7.1).** It spans internal
G&A (Rachel CoS · Holly HR · Laurel Legal), platform/assurance governance (Tess QA · Vera
Governance · Jessica Risk · Alivia Doc-Hygiene), **and the agentic OS operating ITSELF** — agent
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

**Archetype map (B-templates this stream instantiates, grouped by owner; each procedure also names
its archetype inline).**

| Owner group | Procedures | Archetype(s) |
|---|---|---|
| Rachel (CoS / G&A) | 10-A1 daily brief · 10-A2 request routing · 10-A3/A4 program stewardship · 10-A5 facilities/fleet/corporate-IT (w/ Holly) | **B3 synthesis-brief** (A1), **B1 triage/route** (A2), **B4 audit-attest** governance-stewardship (A3/A4), **B2 gated-actuation** facilities/fleet/IT spend (A5) |
| Holly (HR / internal JML + people-at-scale) | 10-H1 onboard · 10-H2 offboard · 10-H3 brain spin-up · 10-H4 review · 10-H5 PTO · 10-H6 recruit→hire · 10-H7 capacity (w/ Dexter) · 10-H8 L&D/cert lifecycle · 10-H9 comp & benefits · 10-H10 employee relations (w/ Laurel) · 10-H11 W-2 payroll (w/ Audrey + human) | **B5 JML disable≠delete** (H1/H2), **B8/B2 provision-with-undo** (H3), **B2/B4** comp+review gated (H1/H4), **B2 gated-actuation** PTO/comp+benefits/employee-relations (H5/H9/H10), **B1 triage/route + B2 offer gate** (H6), **B3 synthesis-brief** capacity (H7), **B9 deadline-sentinel** cert-expiry (H8), **B6 money-gate** W-2 payroll (H11, propose-only #1621) |
| Laurel (Legal) | 10-L1 contract review · 10-L2 lifecycle/renewal · 10-L3 compliance · 10-L4 privacy program (w/ Grace) · 10-L5 cyber/E&O + breach clock (w/ Roman) · 10-L6 business-insurance portfolio | **B2 gated-actuation** (L1/L3, binding always_gate), **B9 deadline-sentinel** renewal radar (L2/L6), **B4 audit-attest + B9 deadline-sentinel** privacy/DSR clock (L4), **B9 deadline-sentinel** cyber/E&O + breach-notification clock (L5, escalate-to-terminal, never auto-actuate) |
| Tess (QA) | 10-T1 ticket-quality · 10-T2 CSAT · 10-T3 SLA-conformance | **B4 audit-attest** internal measure+route (all three; T2 survey-send = B7 edge) |
| Vera (Governance) | 10-V1…V14 | **B4 audit-attest** (the stream's canonical B4 family); V3 standard ratification = `always_gate`; V1 detect→quarantine→route→verify is B4 + reversible-auto-quarantine |
| Jessica (CRO / Risk) | 10-J1 assurance-govern · 10-J2 eval-acceptance · 10-J3 platform-risk register · 10-J4 enterprise/business-risk register | **B3 synthesis-brief** delegate-only (all four; the risk *call* always_gate to Mark; J4 distinct from J3 = enterprise vs platform risk) |
| Alivia (Doc-Hygiene) | 10-K1 doc-sync · 10-K2 runbook-author · 10-K3 freshness | **B4 audit-attest** detect→draft→route (all three; SoT publish gated until trusted; A8 one uniform dual-audience doc) |
| OS-self (Rachel/Vera/Jessica/Alivia/Nova) | 10-O1…O13 | mostly **B4 audit-attest** (O1/O2/O4/O5/O8/O11/O13); **B2 gated-actuation** for connector/credential ops + deploy (O9/O10/O11) + dial-apply (O3); **B4** memory/curation (O6/O7); **B1 triage/route** Nova intake (O12) |

---

## Rachel (Chief of Staff / G&A) — Epic #1546

Ceiling **L2 delegate-only** (synthesize/advise/orchestrate; NEVER bypasses a sub-agent's gauntlet;
any world-changing act inherits the executing sub-agent's ceiling). Serves Derek.

### 10-A1 · Compose daily G&A chief-of-staff brief
- **Owner / Stream:** Rachel / 10. **Archetype:** B3 synthesis-brief (delegate-only, L2, no actuation).
- **Trigger:** schedule (daily, AM) — the C-suite synthesis-brief archetype (tracer `daily-brief`).
- **Terminal outcome:** Derek receives a cross-division status / priorities / blockers brief with a
  decisions-needed list; persisted for audit.
- **Procedure Steps:**
  1. `[automation]` Delegate-read each division's roll-up (Dexter delivery-pulse, Sterling
     financial-pulse, Roman/Jessica posture+risk, G&A items) via `pg.read` + `memory.recall`, **each
     source cited + as-of** (A5); anonymize any cross-client signal (A7); flag dormancy honestly (A5c). **L0.**
  2. `[automation]` Synthesize blockers + priorities + decisions-needed into one brief; cite
     sources, never fabricate on empty (A5b). **L2.**
  3. `[automation]` Write the brief to Derek's surface (Teams card / cockpit) + agent diary.
  4. `[gui-step]` Derek reviews, marks decisions, optionally re-tasks. **B3 rule:** the brief is a
     **launchpad** — an actionable item **auto-spawns the owning worker procedure parked/draft**
     (easy-button-ready, A4) for one-click launch; Rachel never actuates (any company-committing
     decision routes to the relevant sub-agent's gated path).
- **Driving policy:** TBD (#1586) — risk/G&A reporting policy.
- **Realization:** `icm/executive/chief-of-staff/daily-brief/` (live SoR; D5 brief archetype).
- **Autonomy ceiling:** L2 (read+recall+synthesize+deliver; no actuation). `always_gate`: none of
  its own — it delegates; every downstream commitment stays gated at its owner.
- **Human-in-loop:** Derek. L1 = Rachel drafts, Derek co-shapes; L2 = auto-compose+deliver.
- **Substrate deps:** #389 (recall), #991 (cross-division intake), #1537. **subject:** imperion.

### 10-A2 · Orchestrate G&A request intake / routing
- **Owner / Stream:** Rachel / 10. **Archetype:** B1 triage/route (routing auto at L2 — internally
  reversible; cross-cutting escalation parks, A11 seam).
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
- **Owner / Stream:** Rachel (co-owner with Holly) / 10 — Epic #1543. **Archetype:** B4 audit-attest
  (inventory coverage + route gaps; the spin-up mechanism is 10-H3, A11 seam).
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
- **Owner / Stream:** Rachel / 10 — Epic #1544. **Archetype:** B4 audit-attest (verify-the-loop +
  route findings to Vera/eval; no actuation).
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

### 10-A5 · Manage facilities / fleet / corporate-IT (G&A operations) — net-new, low-priority (#1630)
- **Owner / Stream:** Rachel (CoS, program) + Holly (people-tied facilities/fleet assignments) / 10.
  **Archetype:** B2 gated-actuation — the inventory/scheduling/draft is auto, any spend-committing or
  contract-binding facilities/fleet/IT act is `always_gate` (A2 class-1/6). Low-priority: the operational
  G&A back-office (premises, company vehicles, internal corporate-IT assets) — distinct from client-CMDB.
- **Trigger:** a facilities/fleet/corporate-IT need surfaces (lease renewal, vehicle assignment/service,
  internal asset refresh, onboarding workspace/device from 10-H1) OR cadence inventory review.
- **Terminal outcome:** facilities/fleet/corporate-IT inventory current; renewals/services tracked ahead
  of deadline; any spend or binding commitment drafted as a parked easy-button for a human.
- **Procedure Steps** (B2 spine):
  1. `[automation]` **Ground** — inventory premises/leases, company vehicles, and internal corporate-IT
     assets, **cited + as-of** (A5); empty → park. (Internal corporate-IT assets, NOT client CMDB —
     SEAM with Ozzie/Felix only for Imperion-self assets under the dogfood loop, 10-A4.) **L2.**
  2. `[automation]` **Detect + draft** — surface lease-renewal / vehicle-service / asset-refresh needs
     ahead of deadline (B9-style watch on the renewal clock); draft the action + cost. SEAM → Laurel
     (10-L6 business-insurance — fleet/property coverage) + Sterling/Nick (CFO spend) + Holly (10-H1
     workspace/device on onboarding; fleet/vehicle assignment to a person).
  3. `[hybrid]` **PARK** any spend-committing or contract-binding act (lease sign, vehicle purchase,
     asset PO) as the 4-part easy-button (A4); route to a human. Non-committing logistics (scheduling a
     service appt, recording an assignment) may auto at L2 (internally reversible, A10).
- **Driving policy:** TBD (#1586) facilities + fleet + corporate-IT-asset policy.
- **Realization:** procedure-only (graduates with a corporate-asset/facilities store — owed, proposed to FE).
- **Autonomy ceiling:** **L2** (inventory/detect/draft + reversible logistics auto). **`always_gate`:**
  any spend or binding commitment — lease/vehicle/asset purchase or contract (A2 class-1/6).
- **Human-in-loop:** Derek/Rachel-human + Sterling/Nick (spend). Floor: spend + binding commitment human.
- **Substrate deps:** corporate-asset/facilities store (owed), #991, Laurel 10-L6 + Holly 10-H1 + CFO
  seams. **subject:** imperion (internal G&A back-office — NOT client CMDB, which is Stream-level CMDB).

---

## Holly (HR / People) — Epic #1558

Ceiling **L2–L3** (onboarding orchestration auto; employment/comp/PII always-gate; salary
non-disclosure absolute). Reports to Rachel. INTERNAL employee JML — distinct from Osiris's
client-tenant IAM (Stream 04). **SEAM:** Holly owns the PEOPLE event; Osiris owns the IDENTITY
actuation (the joiner-mover-leaver technical grants).

### 10-H1 · Onboard a new employee (hire → onboarded)
- **Owner / Stream:** Holly / 10 (tracer `employee-onboarding`). **Archetype:** B5 JML (joiner branch)
  + B2/B4 for comp (always_gate). **SEAM (A11):** Holly owns the PEOPLE event; Osiris owns the IDENTITY
  actuation. **B5 rule:** Joiner grants **gate** (over-grant prevention > speed).
- **Trigger:** offer accepted (HR event).
- **Terminal outcome:** new employee fully onboarded — identity provisioned, brain spun up, IT setup
  tracked complete, classification + pay-rate recorded.
- **Procedure Steps:**
  1. `[automation]` Create the internal `app_user`/Employee record; set Employee Classification (v1:
     1099) + effective-dated Pay Rate, **cited to the HR offer event + as-of** (A5). (**`always_gate`:**
     comp fields — payroll-role-gated (A2 class-1 money); salary non-disclosure absolute (pool-never-bleed,
     A7).) **L2.**
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
- **Owner / Stream:** Holly / 10. **Archetype:** B5 JML (leaver branch). **B5 disable≠delete split:**
  Leaver **auto-disable + session/token revoke at L4** (disabling is reversible → fast containment
  without a gate, A10) while **delete/deprovision/license-removal (irreversible) stays `always_gate`**
  as the human-approved cleanup.
- **Trigger:** termination/resignation (HR event).
- **Terminal outcome:** employee offboarded — access revoked, brain archived/sealed, final-pay
  obligations flagged, equipment return tracked.
- **Procedure Steps:**
  1. `[automation]` Emit the leaver people-event → HAND OFF to **Osiris** leaver branch (A11 seam):
     **auto-disable + token revoke L4** (reversible), **delete/deprovision/license-removal
     `always_gate`** (irreversible cleanup, A2 class-3 / A10). **L2.**
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
- **Owner / Stream:** Holly / 10 (sub-mechanism of #1543, invoked by 10-H1). **Archetype:** B8/B2
  provision-with-undo — the infra provisioning sub-steps (blob container + RBAC + pg-role) are
  `always_gate` Mark (no clean undo on identity/role creation, A10).
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
- **Owner / Stream:** Holly / 10. **Archetype:** B4 audit-attest (assemble packet + route) — any comp
  change peels off to a B2/money gate (A2 class-1). ⛔ **UNFILED leaf — recommend sub-issue under #1558.**
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

### 10-H5 · PTO / leave administration — un-deferred (#1627)
- **Owner / Stream:** Holly / 10. **Archetype:** B2 gated-actuation (draft → manager-approve gate);
  accrual/balance writes are internal-reversible (auto L2, A10 row 1) while the leave-approval
  *commitment* is the manager's gate. **A11 seam:** Holly owns the leave clock/policy; the calendar/
  identity coverage actuation (OOO, delegation) rides Osiris/IT once approved.
- **Trigger:** employee leave request OR an accrual-cadence tick (balance accrues per policy).
- **Terminal outcome:** leave request recorded + approved/denied, balance updated, coverage flagged;
  tracked to closure (no surprise negative balance, no unapproved leave).
- **Procedure Steps** (B2: ground → plan → GATE → actuate → reconcile → log):
  1. `[gui-step]` Employee submits a leave request (type · dates · duration).
  2. `[automation]` **Ground (A5):** check the request against current balance/accrual + leave policy
     (eligibility, blackout windows, overlap with team coverage), **citing the policy + balance as-of**;
     empty/unparseable policy → park (never fabricate an entitlement). **L2.**
  3. `[automation]` **Plan** — draft a recommendation (approve/deny/partial) + the coverage impact;
     assemble the 4-part easy-button (drafted decision + grounded why + one-click approve/deny + the
     balance-after preview, A4). **L2.**
  4. `[gui-step]` **GATE — manager approves/denies** (the leave commitment is the human's; `always_gate`
     on the approval decision). On approve, decrement the balance via the idempotent accrual write (A9b).
  5. `[hybrid]` **SEAM → Osiris/IT** to set OOO/delegation coverage; **flag finance (Audrey read-only)**
     if the leave class affects pay (PTO vs unpaid). Reconcile the balance read-back (A9c); log attributed.
- **Driving policy:** TBD (#1586) PTO/leave policy (accrual rates, carryover, blackout windows).
- **Realization:** `icm/domains/people/pto-leave/` (graduates once the leave/accrual store + accrual
  worker land; today procedure-only until the v1 PTO deferral lifts).
- **Autonomy ceiling:** L2 (ground + draft + balance write = internally reversible, A10 row 1).
  **`always_gate`: the leave-approval commitment** (manager) — a granted leave is a coverage/pay
  commitment.
- **Human-in-loop:** Manager/Derek. L1 = Holly drafts, manager approves each; L2 = auto-ground+draft,
  manager approves the decision only. Floor: leave approval always human.
- **Substrate deps:** leave/accrual store (proposed to FE alongside the W-2 payroll schema, **#1621**
  — until built ships propose-only per A5c), Osiris seam (Stream 04), Audrey read-only, #991.
  **subject:** imperion.

### 10-H6 · Recruit → hire (req → source → interview → offer) — net-new (#1627)
- **Owner / Stream:** Holly / 10 (tracer `recruit-to-hire`). **Archetype:** B1 triage/route (pipeline
  movement auto at L2 — stage changes are internally reversible) **+ B2 gated-actuation** for the offer
  (an offer is a comp + binding commitment, A2 class-1/6). **Feeds 10-H1 onboarding** (offer accepted =
  the 10-H1 trigger; A11 seam — recruiting is the funnel, onboarding is the joiner).
- **Trigger:** an approved hiring requisition (headcount approved by Derek/manager) OR an inbound
  candidate against an open req.
- **Terminal outcome:** a candidate progresses requisition → sourced → interviewed → offer; on
  offer-accept, **hands off to 10-H1** (joiner). No offer extended without a human gate.
- **Procedure Steps** (B1 spine for the pipeline + a B2 gate at the offer):
  1. `[automation]` **Ground** — open the requisition (role · level · comp band · hiring manager),
     **cited to the approved headcount event + as-of** (A5); empty/unapproved req → park (never source
     against an unapproved headcount). **L2.**
  2. `[automation]` **Classify + move** candidates through stages (applied → screen → interview →
     reference). Stage movement auto-executes at L2 (B1 — internally reversible); pool-correlate prior
     candidates internally only (A7 — never bleed one candidate's specifics into another's packet).
  3. `[hybrid]` **Resolve-owner** — route to the hiring manager + interview panel; assemble the
     interview-feedback packet (labeled signal vs inference, A5).
  4. `[gui-step]` **OFFER GATE** ⛔ — Holly drafts the offer (comp band-checked, the 4-part easy-button:
     drafted offer + grounded why + one-click extend/decline + the comp-commitment preview, A4). **Human
     (manager/Derek) extends the offer** — `always_gate` (comp + binding commitment, A2 class-1/6; comp
     fields payroll-role-gated, salary non-disclosure absolute per A7).
  5. `[automation]` On accept → **SEAM → 10-H1 (Onboard)** with the offer event; on decline → log,
     terminal. Idempotent on the candidate+req key (A9b — no double-offer).
- **Driving policy:** TBD (#1586) hiring/recruiting policy (comp bands, EEO/interview standards) +
  ADR-0016 (Entra identity, downstream).
- **Realization:** `icm/domains/people/recruit-to-hire/` (graduates with a candidate/req store; today
  procedure-only — the offer gate is the load-bearing step).
- **Autonomy ceiling:** L2 (req-open + pipeline movement = internally reversible, A10 row 1).
  **`always_gate`: extending an offer** (comp + binding commitment).
- **Human-in-loop:** hiring manager/Derek. L1 = Holly drafts each stage move, human confirms; L2 =
  auto-move pipeline, human gates the offer only. Floor: offer extension + comp always human.
- **Substrate deps:** candidate/req store (owed; proposed to FE), #991 (req-approved event), 10-H1 seam.
  **subject:** imperion.

### 10-H7 · Plan the workforce / capacity vs delivery demand — net-new (#1627)
- **Owner / Stream:** Holly (people) + Dexter (delivery demand) / 10. **Archetype:** B3 synthesis-brief
  (delegate-only, L2, **no actuation** — a hire/backfill decision spawns 10-H6 parked; a comp move
  spawns 10-H9/H4 parked). **A11 seam:** Holly owns the people-supply picture; Dexter owns the delivery-
  demand signal; they meet at this brief, neither actuates.
- **Trigger:** schedule (capacity-planning cadence — monthly/quarterly) OR a demand spike / attrition
  event.
- **Terminal outcome:** a capacity-vs-demand brief (current headcount + utilization vs forecast
  delivery demand) with gap recommendations (hire / cross-train / contractor); decisions parked
  easy-button-ready, never auto-actuated.
- **Procedure Steps** (B3: gather → synthesize → narrate → deliver → log):
  1. `[automation]` **Gather** — current roster + skills/cert coverage (10-H8) + utilization (Audrey
     read-only / Tess delivery signals) **and** forecast delivery demand (Dexter: pipeline-weighted
     project/ticket load), **each source cited + as-of** (A5); anonymize any cross-client signal (A7);
     flag dormant feeds honestly (A5c). **L0.**
  2. `[automation]` **Synthesize** the capacity gap (skills/seat shortfall vs demand band); never
     fabricate a forecast on empty (A5b). **L2.**
  3. `[automation]` **Narrate** the gap + options (hire / cross-train via L&D / contractor) with P2
     thought-attribution.
  4. `[hybrid]` **Deliver** to Derek/Dexter (A6). **B3 launchpad rule:** a "hire" decision auto-spawns
     **10-H6 (recruit) parked**; a "cross-train" decision spawns **10-H8 (L&D) parked**; a retention
     comp move spawns **10-H9/H4 parked** — Holly never actuates the hire/comp herself.
- **Driving policy:** TBD (#1586) workforce-planning policy.
- **Realization:** `icm/domains/people/capacity-planning/` (graduates; today a delegate-only brief).
- **Autonomy ceiling:** L2 (gather + synthesize + deliver; no actuation). `always_gate`: none of its
  own — every downstream commitment (hire/comp) stays gated at its owning procedure (10-H6/H9).
- **Human-in-loop:** Derek/Dexter. L1 = Holly drafts the brief, humans co-shape; L2 = auto-compose+
  deliver. Floor: hire/comp decisions gate at their owner.
- **Substrate deps:** roster + utilization (Audrey/Tess read-only), Dexter delivery-demand feed (#991),
  #389 (recall), #1537. **subject:** imperion · **SEAM: Holly = people-supply; Dexter = delivery-demand;
  the brief is the meeting point, neither actuates (A11).**

### 10-H8 · Run the L&D + certification lifecycle (cert-expiry, partner-tier gating) — net-new (#1627)
- **Owner / Stream:** Holly / 10 (L&D/Enablement folds into Holly per #1627). **Archetype:** B9
  deadline-sentinel (watch cert-expiry + partner-tier-requirement clocks; **never auto-actuate** a
  renewal/enrollment — escalate + pre-stage the easy-button at T-30/T-7/T-1, A11/B9). **A11 seam:**
  Holly watches the people-cert clock; the partner-tier *business* consequence (Pax8/vendor tier
  jeopardy) is Vance's procurement concern — they meet at the seam.
- **Trigger:** a certification approaches expiry (lead-time tick) OR a new partner-tier requirement
  lands (a vendor raises the cert bar) OR onboarding assigns a required cert (from 10-H1).
- **Terminal outcome:** required certs tracked per employee; expiring/at-risk certs escalated with a
  pre-staged renewal/enrollment easy-button; partner-tier coverage gaps flagged before they jeopardize
  a tier — no surprise lapse.
- **Procedure Steps** (B9: watch → detect → quantify → draft-rec → route+notify):
  1. `[automation]` **Watch** the cert register vs partner-tier requirements (which certs the org must
     hold to keep a vendor tier), **citing each cert's expiry + as-of** (A5). **L0.**
  2. `[automation]` **Detect** expiring/lapsed certs + tier-coverage shortfalls; **quantify** the risk
     (tier jeopardy, partner-discount/MDF impact).
  3. `[automation]` **Draft-rec** a renewal/enrollment plan (who recerts, by when); **escalate up
     `reports_to` with rising urgency at policy lead times (T-30/T-7/T-1), never auto-enrolling** (B9 —
     a deadline does not license autonomous spend/commitment). **L2.**
  4. `[hybrid]` **Route + notify** (A6) — PARK the renewal/enrollment as the easy-button; **SEAM →
     Vance** where the cert gates a *vendor partner tier* (the procurement/tier consequence is Vance's,
     Stream 09); enrollment spend rides the money gate (10-H9 / Vance). A passed cert deadline is a
     **logged escalation failure** surfaced in the capacity/G&A brief (10-H7 / Rachel 10-A1).
- **Driving policy:** TBD (#1586) L&D / certification policy + partner-tier requirements (vendor canon).
- **Realization:** `icm/domains/people/learning-cert-lifecycle/` (graduates with a cert register;
  today procedure-only watcher).
- **Autonomy ceiling:** L2 (watch + detect + draft + escalate). **`always_gate`: enrolling / committing
  cert spend** (money, A2 class-1) — the sentinel never auto-actuates (B9).
- **Human-in-loop:** Holly-human/manager + Vance on tier. Floor: enrollment commitment + spend human.
- **Substrate deps:** cert register (owed), partner-tier requirements (vendor canon), Vance seam
  (Stream 09), #991 (date-trigger), #389. **subject:** imperion · **SEAM: Holly watches the people-cert
  clock; the partner-tier business consequence is Vance's (Stream 09 Deadline Sentinel). Split.**

### 10-H9 · Administer comp & benefits / open enrollment — net-new (#1627)
- **Owner / Stream:** Holly / 10. **Archetype:** B2 gated-actuation — **every pay movement is
  `always_gate`** (A2 class-1 money out); benefits-elections orchestration is L2 (reversible election
  window) while the *carrier/payroll commitment* gates. **A11 seam:** Holly owns the comp/benefits
  clock + the elections packet; the money movement is Audrey/payroll's gated act (10-H11), the carrier
  enrollment is the human/broker act.
- **Trigger:** the open-enrollment window opens (annual cadence) OR a qualifying life event OR a
  comp-change proposal lands (from 10-H4 review / 10-H7 retention).
- **Terminal outcome:** benefits elections collected + validated; comp changes recorded **gated**;
  payroll/carrier handed the change — no pay movement without a human money gate, no salary disclosure
  across the pool.
- **Procedure Steps** (B2: ground → plan → GATE → actuate → reconcile → log):
  1. `[automation]` **Ground** — load eligibility + current elections + comp record (effective-dated),
     **cited + as-of** (A5). (**`always_gate`/strict RLS:** comp fields are `data_class` financial +
     `client_pii`-grade personal — payroll-role-gated, **salary non-disclosure absolute, refusal-class**
     per A7, consistent with Stream 09 Audrey.) **L2 (read/orchestrate only).**
  2. `[automation]` **Plan** — drive the enrollment window; validate elections vs plan rules; assemble
     the comp-change / elections easy-button (drafted change + grounded why + one-click approve + the
     **exact $ + irreversibility** preview, A4).
  3. `[gui-step]` **MONEY GATE** ⛔ — **any pay movement is `always_gate`** (payroll-role + Mark/Derek;
     A2 class-1). A benefits *election* (employee-chosen, reversible within the window) is L2; the
     **carrier/payroll commitment** at window close gates.
  4. `[hybrid]` **Actuate the non-money half** (record elections) idempotently (A9b); **SEAM → 10-H11
     (payroll)** for any deduction/pay change and **→ human/broker** for carrier enrollment (external
     SoR — the agent mirrors, never owns, A9a). Reconcile read-back (A9c); log attributed, comp values
     **never echoed to non-payroll context** (A7).
- **Driving policy:** TBD (#1586) comp & benefits policy (bands, plan rules, eligibility).
- **Realization:** `icm/domains/people/comp-benefits/` (graduates; the comp/benefits store is part of
  the **#1621** people-payroll schema — until built ships propose-only per A5c).
- **Autonomy ceiling:** L2 (orchestrate elections = reversible). **`always_gate`: any pay movement /
  comp change** (money, A2 class-1) — dial-proof forever.
- **Human-in-loop:** payroll-role + Mark/Derek; broker for carrier. Floor: pay movement + comp change
  always human; salary disclosure refusal-class.
- **Substrate deps:** comp/benefits store (**#1621**, until built propose-only), 10-H11 payroll seam,
  Audrey read-only, carrier (external SoR). **subject:** imperion.

### 10-H10 · Manage employee relations / case (sensitive) — net-new (#1627)
- **Owner / Stream:** Holly (people) + Laurel (legal) / 10. **Archetype:** B2 gated-actuation —
  every case action with employment/legal consequence is `always_gate` (A2 class-6 binding + A10 no
  clean undo on a disciplinary/termination act). **Sensitive PII: strict RLS, audit-by-reference, no
  pool bleed (A7).** **A11 seam:** Holly owns the HR case clock + record; Laurel owns the legal-exposure
  call; any termination/identity action rides Osiris (Stream 04) + 10-H2 offboarding.
- **Trigger:** an employee-relations matter is raised (complaint, grievance, performance/conduct
  concern, investigation request).
- **Terminal outcome:** the case is logged, handled per policy, and closed — with every consequential
  action human-gated and every record access RLS-scoped; **no case detail or identity bleeds across the
  pool** (A7).
- **Procedure Steps** (B2, handled as a strict-PII case file):
  1. `[automation]` **Ground** — open/append the case record (parties · category · timeline),
     **cited + as-of**, on the **most-restrictive RLS scope** (HR-case `data_class`; access ledgered,
     **audit-by-reference — never reproduces the sensitive value**, the Vera-PII-audit peer A7/10-V12). **L2.**
  2. `[hybrid]` **Plan** — Holly drafts the next step per policy (documented conversation, PIP,
     investigation); **SEAM → Laurel** for any matter with legal exposure (termination-for-cause,
     harassment, protected-class, regulatory) — Laurel frames the legal-risk call (A11; not licensed
     counsel — routes genuine legal calls to a human, Stream 10 Laurel ceiling).
  3. `[gui-step]` **GATE** ⛔ — any consequential action (formal discipline, PIP issuance, termination)
     is `always_gate` (HR human + manager/Derek + Mark where legal/identity; A2 class-6, A10
     irreversible). Assemble the 4-part easy-button (drafted action + grounded why + one-click + the
     irreversibility/legal-exposure preview, A4).
  4. `[hybrid]` On a termination outcome → **SEAM → 10-H2 (offboard) / Osiris** (identity
     disable≠delete, B5); log the case closure attributed; retain per policy. Halt-no-rollback on a
     failed step (A10) — a human decides remediation, never an improvised compensating act.
- **Driving policy:** TBD (#1586) employee-relations / investigation policy + ADR-0118 (data_class) +
  `unified-security-standard.md` (PII handling).
- **Realization:** `icm/domains/people/employee-relations/` (graduates; today procedure-only — the
  case store is a strict-RLS surface, owed).
- **Autonomy ceiling:** L2 (record + draft only). **`always_gate`: every consequential employment/legal
  action** (discipline/termination, A2 class-6, A10) — dial-proof forever.
- **Human-in-loop:** HR human + manager/Derek + Mark (legal/identity); Laurel on legal exposure. Floor:
  every consequential action human; case PII audit-by-reference, never reproduced, never pooled.
- **Substrate deps:** HR-case store (strict-RLS, owed), Laurel seam, 10-H2/Osiris seam (Stream 04),
  data_class RLS (#967/#990). **subject:** imperion · **SEAM: Holly = HR case clock/record; Laurel =
  legal-exposure call; termination identity = Osiris/10-H2. Split (A11).**

### 10-H11 · Run W-2 payroll — un-deferred, propose-only / 💤DORMANT (schema #1621) (#1627)
- **Owner / Stream:** Audrey (money) + Holly (people inputs) + human (the run) / 10. **Archetype:**
  B6 money-gate — payroll money out is **`always_gate` class-1 forever** (A2/A6/A10 no clean undo on a
  settled pay run). **A11 seam:** Holly owns the people inputs (hours, classification, comp, leave/PTO
  from 10-H5, deductions from 10-H9); Audrey owns the money computation + the gated run; QBO/payroll
  provider is the external SoR (the agent mirrors, never owns, A9a). ⛔ **Un-defers the v1 W-2 deferral;
  ships propose-only until the people-payroll silver schema (#1621) lands (A5c).**
- **Trigger:** the payroll cycle clock (per-period) OR an off-cycle correction.
- **Terminal outcome:** a payroll run computed, **human-approved at the money gate**, submitted to the
  payroll provider/QBO (external SoR), and reconciled by read-back — no pay movement without a human
  gate, no double-run.
- **Procedure Steps** (B6: ground → compute → draft → MONEY GATE → actuate → log+mirror):
  1. `[automation]` **Ground** — assemble per-employee inputs: hours/time (silver `time_record`,
     Stream 09), classification + comp (10-H1/H9), PTO/leave (10-H5), deductions/benefits (10-H9) —
     **each cited + as-of** (A5); **strict comp RLS, salary non-disclosure absolute** (A7, refusal-class,
     consistent with Stream 09 Audrey). **L2 (compute only).**
  2. `[automation]` **Compute** gross→net per period (taxes/withholdings via the provider's engine —
     the agent does not compute statutory tax itself, A9a external SoR).
  3. `[automation]` **Draft** the run as one easy-button: **total $ + headcount + the period-over-period
     diff/exception view** (A4 + B6 batch rule).
  4. `[gui-step]` **MONEY GATE** ⛔ — **`always_gate` class-1, dial-proof forever** (payroll-role +
     Mark/Derek). **B6 batch rule:** one approval runs items **within tolerance** vs the prior period;
     **any item tripping a variance guard** (new payee, >X% change, first-period amount) **splits out
     and gates individually**. Variance threshold = per-procedure policy (#1586).
  5. `[automation]` **Actuate** the submission to the payroll provider / QBO, **idempotency-keyed on
     (employee + pay-period)** so a retry is a no-op + audit note (A9b — never a double-pay); **read back**
     the provider record to confirm it landed before declaring done (A9c). **Log + mirror** to the
     app-native record; comp values **never echoed to non-payroll context** (A7).
- **Driving policy:** TBD (#1586) payroll policy (cycle, variance tolerance, tax jurisdictions) +
  ADR-0093 (time→close) + CLAUDE.md §5 (money/secret handling).
- **Realization:** `icm/domains/people/w2-payroll/` (**DORMANT — propose-only until the people-payroll
  silver schema #1621 lands; per A5c the run-side steps ship propose-only**). Finance = QBO read-side
  SoR (v1 finance is read-only; the actuating pay submission is the gated exception, human-run).
- **Autonomy ceiling:** L2 (compute + draft). **`always_gate`: the payroll money movement** (A2 class-1)
  — never auto at any dial.
- **Human-in-loop:** payroll-role + Mark/Derek run it; QBO/provider is external SoR. Floor: every pay
  run + every off-cycle correction human; salary disclosure refusal-class.
- **Substrate deps:** ⛔ **people-payroll silver schema #1621 (OPEN — gates the data shape; until built
  this is propose-only)** · `time_record` (Stream 09, migs 0085–0087) · QBO/payroll provider (external
  SoR, gated) · 10-H5/H9 input seams · #119. **subject:** imperion.

---

## Laurel (Legal / Contracts-lifecycle) — Epic #1559

Ceiling **L2** (draft/redline/flag auto; execution/binding always-gate; not licensed counsel —
routes genuine legal calls to a human). Reports to Rachel. **SEAM:** contracts arrive from Chase
(sales MSA/SOW) and Vance (vendor agreements); execution/esign is always-gate.

### 10-L1 · Review an inbound contract (MSA / SOW / NDA)
- **Owner / Stream:** Laurel / 10 (tracer `contract-review`). **Archetype:** B2 gated-actuation —
  signing/binding is `always_gate` class-6 (A2), no clean undo on a bound agreement (A10).
- **Trigger:** a contract document arrives (Chase won-deal MSA/SOW, Vance vendor agreement, inbound NDA).
- **Terminal outcome:** contract redlined + risk clauses flagged + summarized; execution parked for a human.
- **Procedure Steps:**
  1. `[automation]` Ingest the document; classify type (MSA/SOW/NDA/vendor/renewal). **L2.**
  2. `[automation]` Redline against the standard playbook; flag risk clauses (liability, indemnity,
     auto-renew, termination, data-handling).
  3. `[automation]` Summarize risks + recommendation; **cite the clause + as-of** (A5, audit-by-reference,
     no fabrication).
  4. `[hybrid]` HAND OFF to the human (or counsel) for genuine legal calls (A11 seam); PARK execution
     as the 4-part easy-button (drafted redline + grounded why + one-click + consequence preview, A4).
     (**`always_gate`:** signing / binding the company, A2 class-6.)
- **Driving policy:** TBD (#1586) contract-standards policy.
- **Realization:** `icm/domains/legal/contract-review/` (live SoR).
- **Autonomy ceiling:** L2; `always_gate`: execution / binding / esign.
- **Human-in-loop:** Mark/Derek (+ external counsel for real legal calls). L1 = Laurel drafts
  redline, human reviews all; L2 = auto-redline+flag, human approves execution only. Floor: signing
  always human.
- **Substrate deps:** #389 (clause recall), DocuSign esign path (always-gate). **subject:** both
  (client MSAs serve clients; internal/vendor contracts = imperion).

### 10-L2 · Track contract lifecycle + renewals (legal side)
- **Owner / Stream:** Laurel / 10 (deeper playbook under #1559). **Archetype:** B9 deadline-sentinel
  (watch term/renewal/notice clocks; **never auto-actuate** a renew/cancel — A11/B9; escalate +
  pre-stage the easy-button, T-30/T-7/T-1).
- **Trigger:** contract executed (lifecycle start) OR renewal/expiry window approaching.
- **Terminal outcome:** contract obligations + key dates tracked; renewal-legal review triggered
  ahead of expiry; no surprise auto-renew (legal twin of Vance's Deadline Sentinel).
- **Procedure Steps:**
  1. `[automation]` Record the executed contract + key dates (term, renewal, notice window), **cited
     + as-of** (A5). **L2.**
  2. `[automation]` Watch the renewal/expiry window; on approach, draft a renewal-legal review +
     flag changed terms, **escalating up `reports_to` with rising urgency, never auto-actuating** (B9).
     SEAM with Vance (vendor procurement) + Chase (client renewal as a sales motion / `contract_renewal`).
  3. `[hybrid]` Route the renewal recommendation to a human; execution always-gate.
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only (graduates with the watcher).
- **Autonomy ceiling:** L2; `always_gate`: renewal commitment.
- **Human-in-loop:** Mark/Derek; floor: binding renewal/cancellation human.
- **Substrate deps:** #991 (date-trigger), overlaps Vance Deadline Sentinel. **subject:** both ·
  **OVERLAP:** client-renewal commercial motion is Chase's (`contract_renewal`); vendor auto-renew
  is Vance's Deadline Sentinel. Laurel owns the LEGAL-terms review only — split at the seam.

### 10-L3 · Compliance / policy review (legal)
- **Owner / Stream:** Laurel / 10 (deeper playbook under #1559). **Archetype:** B2 gated-actuation —
  binding compliance commitments are `always_gate` (A2 class-6); Laurel measures legal obligations,
  Grace owns security-control evidence (A11 seam).
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

### 10-L4 · Run the privacy program (GDPR/CCPA · DPA register · DSR handling) — net-new (#1628)
- **Owner / Stream:** Laurel (legal-obligation owner) + Grace (control-attestation) / 10. **Archetype:**
  B4 audit-attest (the DPA-register + privacy-program attestation) **+ B9 deadline-sentinel** (the DSR
  clock — statutory response deadlines never auto-actuate, escalate-to-terminal per A11/B9). Laurel owns
  the legal/contractual privacy obligation, Grace owns the security-control evidence (A11 seam).
- **Trigger:** a Data Subject Request (access/erasure/portability) arrives; OR a new vendor processing
  personal data is onboarded (DPA needed); OR cadence privacy-program review; OR a regulatory change.
- **Terminal outcome:** privacy obligations mapped + DPA register current; each DSR routed to a human
  decision before its statutory deadline (never auto-fulfilled); privacy-control evidence emitted.
- **Procedure Steps** (B4 attest spine, B9 sentinel on the DSR clock):
  1. `[automation]` **Ground** — on a DSR, identify the data subject + the systems/silver entities holding
     their personal data, **citing each source + as-of** (A5); on empty/ambiguous identity → park (never
     guess a subject). **Strict-RLS:** the DSR working record + any subject identifiers are `data_class`
     personal/`client_pii` — **report by reference, never reproduce the personal data into the register,
     a brief, an issue, or a comment** (A5 + #967/#990 RLS). **L2.**
  2. `[automation]` **Maintain the DPA register** — record processors/sub-processors handling personal
     data, the lawful basis, and the executed DPA, cited + as-of; flag any processing lacking a DPA. SEAM
     with Vance (vendor onboarding) + Grace (TPRM, Stream 07) — Laurel = the DPA legal terms, Grace = the
     vendor's security-control evidence.
  3. `[automation]` **Run the DSR clock as a deadline-sentinel** — on receipt, set the statutory deadline
     (GDPR 1 month / CCPA 45 days); draft the fulfillment package (the data to disclose/erase, by
     reference); **escalate up `reports_to` with rising urgency (T-clock), NEVER auto-fulfilling or
     auto-erasing** (B9 escalate-to-terminal — a DSR fulfillment is an irreversible disclosure/deletion,
     A10 no-clean-undo ⇒ `always_gate`). A missed/at-risk deadline is a **logged escalation failure**
     surfaced to Mark + Jessica (10-J4 register).
  4. `[hybrid]` **Route the DSR decision + the privacy-program recommendation to a human** as the 4-part
     easy-button (drafted package + grounded why + one-click + consequence preview, A4). SEAM → Grace
     for control evidence; **hand genuine legal calls to a human/counsel** (A11 — Laurel is not licensed
     counsel).
- **Driving policy:** TBD (#1586) privacy/data-protection policy (GDPR/CCPA), DPA-standard, DSR-runbook.
- **Realization:** `icm/domains/legal/privacy-program/` (graduates with the DSR clock + register store).
- **Autonomy ceiling:** **L2** (map/draft/register auto). **`always_gate`:** any DSR fulfillment
  (disclosure/erasure — A2 class-2/4, irreversible) and any binding privacy commitment (A2 class-6).
- **Human-in-loop:** Mark (CISO/privacy) + Derek (+ counsel for real legal calls). L1 = Laurel drafts,
  human reviews all; L2 = auto-map+register+draft, human decides every fulfillment. Floor: DSR
  fulfillment + erasure always human.
- **Substrate deps:** DSR-clock + DPA-register store (owed — proposed to FE), #389 (clause/data recall),
  #991 (deadline trigger), Grace TPRM seam (Stream 07), data_class RLS (#967/#990). **subject:** both
  (client DSRs serve clients as data-controller-support; Imperion's own DSRs = imperion) · **SEAM: Laurel
  = privacy legal obligation + DSR clock; Grace = security-control evidence (Stream 07).**

### 10-L5 · Manage cyber / E&O insurance lifecycle + breach-notification clock — net-new (#1628)
- **Owner / Stream:** Laurel (policy-lifecycle + breach legal clock) + Roman (security-incident facts) / 10.
  **Archetype:** B9 deadline-sentinel — both the **renewal/attestation clock** (cyber/E&O policy terms) and
  the **breach-notification clock**; the breach clock is the hard case: **escalate-to-terminal, NEVER
  auto-actuate a notification** (A11/B9 — a breach notice is an irreversible legal/regulatory commitment).
- **Trigger:** a cyber/E&O policy approaches renewal or an insurer attestation is due; OR Roman declares a
  security incident that may trigger a breach-notification obligation; OR a coverage/claim event.
- **Terminal outcome:** cyber/E&O coverage tracked with no lapse; on a qualifying incident the
  breach-notification deadlines are computed and escalated to a human decision **before** the statutory/
  contractual clock expires — never auto-sent.
- **Procedure Steps** (B9 sentinel; two clocks):
  1. `[automation]` **Record the policy** + key dates (term, renewal, notice window, attestation
     conditions, coverage limits/exclusions), **cited + as-of** (A5). **L2.**
  2. `[automation]` **Watch the renewal/attestation clock** — on approach (T-30/T-7/T-1) draft the renewal
     review + flag changed terms/conditions, **escalating up `reports_to`, never auto-binding** (B9). SEAM
     with Vance (procurement of the policy as a vendor agreement) + Sterling/Nick (CFO — premium/spend).
  3. `[automation]` **Breach-notification clock (the hard sentinel):** on a Roman-declared qualifying
     incident, ingest the **incident facts by reference** (SEAM → Roman, Stream 07 — Roman owns the
     security facts, Laurel owns the legal-obligation framing; A11), compute every applicable notification
     deadline (regulator, affected parties, insurer, contractual), and **escalate-to-terminal: surface the
     pre-staged notification easy-button to Mark, NEVER auto-actuating the notice** (B9 — irreversible
     legal/regulatory commitment, A10 no-clean-undo ⇒ `always_gate`). **Strict-RLS:** breach facts +
     affected-party identifiers are `data_class` personal/sensitive — **report by reference, never
     reproduce into a brief/issue/comment** (A5 + #967/#990).
  4. `[hybrid]` **Route to a human** — renewal decisions and every breach notification go to Mark (+ counsel
     for the legal call) as the 4-part easy-button (A4). A missed/at-risk notification deadline is a
     **logged escalation failure** surfaced to Mark + Jessica (10-J4).
- **Driving policy:** TBD (#1586) cyber/E&O-insurance + breach-notification (incident-response) policy.
- **Realization:** procedure-only (graduates with the policy store + breach-clock watcher).
- **Autonomy ceiling:** **L2** (record/watch/draft auto). **`always_gate`:** binding a policy
  renewal (A2 class-6) and **any breach notification** (A2 class-2/6, irreversible — dial-proof at any level).
- **Human-in-loop:** Mark (CISO) + Derek + counsel; Roman supplies incident facts. Floor: breach
  notification + policy binding always human.
- **Substrate deps:** policy store (owed), #991 (deadline trigger), Roman incident seam (Stream 07),
  Vance procurement seam, data_class RLS (#967/#990). **subject:** both (a client-affecting breach also
  drives client notification via Celeste; Imperion's own policy = imperion) · **SEAM: Roman = incident
  facts; Laurel = legal notification clock; Celeste = any client-facing notice.**

### 10-L6 · Manage the business-insurance portfolio — net-new (#1630)
- **Owner / Stream:** Laurel / 10. **Archetype:** B9 deadline-sentinel — watch the renewal/attestation
  clocks across the non-cyber business-insurance portfolio (general liability, property, workers'-comp,
  D&O, auto/fleet); **never auto-bind a renewal** (A11/B9; escalate + pre-stage the easy-button,
  T-30/T-7/T-1). The legal twin of Vance's procurement Deadline Sentinel for insurance lines.
- **Trigger:** a business-insurance policy approaches renewal/expiry OR an attestation/audit (e.g.
  workers'-comp payroll audit) is due OR a new coverage need surfaces (new fleet vehicle, new premises).
- **Terminal outcome:** every business-insurance line tracked with no coverage lapse; renewals reviewed
  ahead of expiry; the portfolio + key dates kept current for the risk register (10-J4) and CFO spend.
- **Procedure Steps** (B9 sentinel):
  1. `[automation]` Record each policy + key dates (term, renewal, notice window, coverage limits,
     audit/attestation conditions), **cited + as-of** (A5). **L2.**
  2. `[automation]` Watch the renewal/expiry/attestation window; on approach draft a renewal review +
     flag changed terms/premiums, **escalating up `reports_to` with rising urgency, never auto-binding**
     (B9). SEAM with Vance (procurement) + Sterling/Nick (CFO — premium spend) + Holly (workers'-comp ties
     to payroll/headcount, 10-H11) + Rachel (facilities/fleet coverage need, 10-A5).
  3. `[hybrid]` Route the renewal recommendation to a human; binding/renewal always-gate. Feed the
     coverage posture into Jessica's enterprise-risk register (10-J4 — insurance is a key risk mitigation).
- **Driving policy:** TBD (#1586) business-insurance policy.
- **Realization:** procedure-only (graduates with the policy store; shares the 10-L5 watcher).
- **Autonomy ceiling:** **L2** (record/watch/draft auto). **`always_gate`:** binding a renewal/policy
  change (A2 class-6).
- **Human-in-loop:** Mark/Derek + Sterling/Nick (CFO). Floor: binding renewal human.
- **Substrate deps:** policy store (owed, shared with 10-L5), #991 (deadline trigger), Vance procurement
  seam, 10-J4 register feed. **subject:** imperion · **OVERLAP:** cyber/E&O is 10-L5 (its own breach
  clock); 10-L6 is the rest of the portfolio. **SEAM: Vance procures; Laurel watches the legal/renewal
  clock; Jessica's 10-J4 consumes the coverage posture.**

---

## Tess (Service-Quality / QA) — Epic #1560

Ceiling **L2** (audit/score/flag/recommend auto; NO actuation — watcher, like Vera). Reports to
Jessica. Sits OUTSIDE Service so it audits delivery, not itself.

### 10-T1 · Audit ticket quality on close
- **Owner / Stream:** Tess / 10 (tracer `ticket-quality-audit`). **Archetype:** B4 audit-attest
  (internal — measure + route, auto at L2; **no actuation** — every output is a flag, A11: Tess audits,
  the delivery owner re-works).
- **Trigger:** ticket closed OR sampled on a cadence.
- **Terminal outcome:** ticket scored on quality / CSAT-risk / SLA-adherence; systemic issues
  flagged + recommended to Dexter/Jessica; no actuation.
- **Procedure Steps:**
  1. `[automation]` Load the closed/sampled ticket (read-only); score documentation quality,
     resolution quality, time-to-resolve vs SLA, **citing the SLA standard version + as-of** (A5/B4 scope). **L2.**
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
- **Owner / Stream:** Tess / 10 (deeper playbook under #1560). **Archetype:** B4 audit-attest
  (capture + trend + route) with the outbound survey send a **B7 client-facing-send** edge (`always_gate`).
  ⛔ **UNFILED leaf.**
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
- **Owner / Stream:** Tess / 10 (deeper playbook under #1560). **Archetype:** B4 audit-attest
  (conformance measure + route; recommend-only). **A11 seam:** real-time SLA escalation = the Service
  stream (Felix/Scout/Ozzie); Tess audits conformance after the fact. ⛔ **UNFILED leaf.**
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
- **Owner / Stream:** Vera / 10. **Archetype:** B4 audit-attest (the stream's canonical B4) —
  measure auto at L2 + **reversible auto-quarantine** (A10 internally-reversible); the correction is
  the OWNER's (`always_gate`, A11 seam).
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
- **Owner / Stream:** Vera / 10. **Archetype:** B4 audit-attest (encode + ratify) — ruleset
  activation is a governance-config change, `always_gate` Mark (A2/A11).
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
- **Owner / Stream:** Vera / 10 (the standard-owner mission). **Archetype:** B4 audit-attest
  (external-facing standard ratification). ⛔ **Mark ratification is `always_gate`, dial-proof FOREVER**
  (A2/A3 — earned autonomy can never cross it); Vera drafts the standard, Mark signs (A11 obligation/action split).
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
- **Owner / Stream:** Vera / 10. **Archetype:** B4 audit-attest (measure + route, advisory).
  **A11 seam:** Vera measures / Celeste presents / human-Datto remediates.
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
- **Owner / Stream:** Vera / 10. **Archetype:** B4 audit-attest (detect + flag; remediation human, A11).
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
- **Owner / Stream:** Vera / 10. **Archetype:** B4 audit-attest (draft + route, advisory); actuation
  is human/Datto (`always_gate`, A11).
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
- **Owner / Stream:** Vera / 10. **Archetype:** B4 audit-attest (all-client fan-out re-score,
  contained by rate/fan-out caps #991-1A; remediation human, A11).
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
- **Owner / Stream:** Vera / 10 (the auditor mission). **Archetype:** B4 audit-attest
  (audit-by-reference, report-only — Vera OBSERVES the earned-autonomy ledger, never executes it, A11/ADR-0121).
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
- **Owner / Stream:** Vera / 10. **Archetype:** B4 audit-attest (detect + flag); tuning is Mark-gated
  and ACTED on by 10-O5 (A11 seam — Vera detects, O5 acts).
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
- **Owner / Stream:** Vera / 10. **Archetype:** B4 audit-attest (detect + draft + route, recommend-only);
  the governance-config change is `always_gate` Mark and APPLIED by 10-O3 (A11 — Vera recommends, O3 applies).
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
- **Owner / Stream:** Vera / 10. **Archetype:** B4 audit-attest (detect + escalate-only; resolution
  is the owner's, A11 seam — Curator works WITHIN one owner (10-O7), Vera ACROSS company tier).
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
- **Owner / Stream:** Vera / 10. **Archetype:** B4 audit-attest (report-by-reference — NEVER reproduces
  the value; the pool-never-bleed / data_class enforcement audit, A7/ADR-0118).
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
- **Owner / Stream:** Vera / 10. **Archetype:** B4 audit-attest (detect + route; corrections go to the
  owning data plane, never silent, A11).
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
  platform function / OS-self-op). **Archetype:** B4 audit-attest (sweep + flag); destructive secret
  deletes are `always_gate` Mark (A2/A10 — no clean undo on a deleted secret).
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

### 10-J1 · Govern the assurance program (Vera/Tess/Alivia orchestration)
- **Owner / Stream:** Jessica / 10. **Archetype:** B3 synthesis-brief (delegate-only, never bypasses a
  sub-agent gauntlet; risk acceptance always Mark's, A11).
- **Trigger:** cadence OR a division-level assurance escalation from Vera/Tess/Alivia.
- **Terminal outcome:** assurance work (conformance, quality, doc-hygiene) coordinated; cross-cutting
  risks routed to Mark.
- **Procedure Steps:**
  1. `[automation]` Receive escalations/flags from Vera (conformance/posture), Tess (quality),
     Alivia (knowledge freshness). **L2.**
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
- **Owner / Stream:** Jessica / 10. **Archetype:** B3 synthesis-brief — frames a risk decision; the
  release/risk acceptance + go-live gating is `always_gate` Mark (A2/A11 — Vera detects, Jessica
  makes the call, O5 tunes: three split roles).
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
- **Owner / Stream:** Jessica / 10. **Archetype:** B3 synthesis-brief (capture + score + surface;
  label signal vs inference per A5; risk acceptance always Mark's, A11).
- **Trigger:** a new platform/assurance risk surfaces (audit finding, drift, incident) OR cadence.
- **Terminal outcome:** platform/assurance risk register kept current; each risk has an owner +
  status; top risks roll into the Stream-11 brief.
- **Procedure Steps:**
  1. `[automation]` Capture risks from Vera/Tess/Alivia/Cyrus/Grace feeds; label signal vs
     inference. **L2.**
  2. `[automation]` Score + assign an owner; track mitigation.
  3. `[hybrid]` Surface top risks to Mark; risk acceptance always-gate.
- **Driving policy:** TBD (#1586).
- **Realization:** procedure-only (graduates; register store owed).
- **Autonomy ceiling:** L2.
- **Human-in-loop:** Mark; floor: risk acceptance human.
- **Substrate deps:** register store (owed), #991. **subject:** imperion · **NOTE: DISTINCT from
  Celeste's client-facing Client Risk Register (Stream 08) — Jessica's is internal platform/OS risk.**

### 10-J4 · Maintain the enterprise / business-risk register (concentration · key-person · market) — net-new (#1630)
- **Owner / Stream:** Jessica / 10. **Archetype:** B3 synthesis-brief (capture + score + surface;
  label signal vs inference per A5; risk acceptance always Mark's, A11). **DISTINCT from 10-J3:** 10-J3
  is the *platform/assurance* register (drift, audit findings, eval regressions — the OS-as-software
  risks); **10-J4 is the *enterprise/business* register** — revenue concentration, key-person, market/
  competitive, supply/vendor-concentration, financial, and legal/regulatory exposure (the company-as-a-
  business risks). Two registers, one owner, no overlap.
- **Trigger:** a business risk surfaces (a client crosses a concentration threshold, a key person leaves,
  a market/competitor shift, a vendor-concentration flag) OR cadence (the enterprise-risk review feeding
  the Stream-11 board pack); fed by Audrey (financial/AR concentration), Holly (key-person/attrition,
  10-H7 capacity), Vance (vendor concentration), Jessica (10-J3 platform), Laurel (insurance/legal, 10-L5/L6).
- **Terminal outcome:** an enterprise-risk register kept current — each risk has an owner, a likelihood ×
  impact score, a mitigation (incl. its insurance coverage), and a status; the top risks roll into the
  Stream-11 board/strategy brief; concentration/key-person risks have an explicit mitigation owner.
- **Procedure Steps** (B3 synthesis spine):
  1. `[automation]` **Gather** the business-risk feeds — revenue/AR concentration (Audrey, Stream 09),
     key-person/attrition (Holly 10-H7), vendor concentration (Vance), market/competitive signals,
     platform risk (10-J3), legal/insurance posture (Laurel 10-L5/L6) — **citing each source + as-of**,
     **labeling signal vs inference** (A5). **Report concentration by aggregate/redacted metric, never
     reproduce client-level revenue or personal data** (A5 + #967/#990 RLS — the register is PII-free). **L2.**
  2. `[automation]` **Score + assign** — likelihood × impact band; attach a mitigation owner + the
     current mitigation (incl. insurance coverage from 10-L5/L6); track status. Pool-correlate recurring
     themes internally only (A7).
  3. `[hybrid]` **Surface** the top enterprise risks to Mark; **risk acceptance always-gate** (A11 —
     Jessica frames, Mark accepts/rejects). **SEAM → Stream 11** (the board/strategy pack consumes the
     register top-N — Jessica frames the brief there, not duplicated here).
- **Driving policy:** TBD (#1586) enterprise-risk-management policy + risk-appetite statement.
- **Realization:** procedure-only (graduates; enterprise-risk register store owed — shares the 10-J3
  register substrate if FE builds one register with a `risk_class` discriminator).
- **Autonomy ceiling:** **L2** (capture + score + draft auto). **`always_gate`:** risk acceptance /
  appetite decisions (A2 class-6 governance commitment — dial-proof, Mark's).
- **Human-in-loop:** Mark (risk reports to Mark). L1 = Jessica drafts the register, Mark reviews; L2 =
  auto-capture+score, Mark accepts. Floor: risk acceptance human.
- **Substrate deps:** enterprise-risk register store (owed — proposed to FE; may share 10-J3's store via
  a `risk_class` column), #991 (feed triggers), Audrey/Holly/Vance/Laurel seams. **subject:** imperion ·
  **NOTE: DISTINCT from 10-J3 (platform/assurance risk) and from Celeste's client-facing Client Risk
  Register (Stream 08) — 10-J4 is internal enterprise/business risk.**

---

## Alivia (Doc-Hygiene / Knowledge) — Epic #1561

Ceiling **L3** (poll/draft/update + stale-flag auto; publish-to-SoT gated until trusted). Reports to
Jessica. IT Glue = the SoT. **This catalog's human-facing runbooks are Alivia's long-term output**
(D5: a runbook = generated projection of the ICM Workspace; Alivia syncs workspace→runbook→IT Glue).

### 10-K1 · Doc-sync poll → IT Glue SoT
- **Owner / Stream:** Alivia / 10 (tracer `doc-sync`). **Archetype:** B4 audit-attest (detect-stale +
  draft + route); SoT publish gated until trusted (A10 — externally-visible write); no secrets/PII in docs (A7).
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
- **Human-in-loop:** Alivia-human/Derek. L1 = drafts diffs, human publishes; L3 = auto-publish
  low-risk, human reviews SoT-critical. Floor: secrets/PII never in docs; high-stakes SoT writes gated.
- **Substrate deps:** IT Glue connector, #389 (contradiction detection), #991. **subject:** both
  (client runbooks in IT Glue + internal docs/dogfood).

### 10-K2 · Author human-facing runbooks from agent procedures
- **Owner / Stream:** Alivia / 10 (deeper playbook; the catalog's long-term home, D5). **Archetype:**
  B4 audit-attest (generate-projection + sync). **A8 supersedes the old runbook+prose split:** there is
  **one uniform dual-audience document** single-sourced from the ICM Workspace, readable by both human
  (training) and agent (execution); this procedure materializes that projection. ⛔ **UNFILED leaf under #1561.**
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
- **Human-in-loop:** Alivia-human; floor: SoT publish gated early.
- **Substrate deps:** ICM workspace files, IT Glue, Sage seam (Stream 05). **subject:** both ·
  **NOTE: this is the procedure that MATERIALIZES this whole catalog as runbooks long-term.**

### 10-K3 · Knowledge freshness / contradiction surfacing
- **Owner / Stream:** Alivia / 10 (deeper playbook under #1561). **Archetype:** B4 audit-attest
  (freshness verdict + flag; route to the owning author, A11 — K3 = human IT-Glue docs vs O8 = machine OKF).
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
(Rachel/Vera/Jessica/Alivia/Nova). These run the OS as software-operating-software. Mostly
`subject:imperion`.

### 10-O1 · Onboard a new agent into the org
- **Owner / Stream:** Rachel (program) + Mark (gate) / 10 (OS-self). **Archetype:** B4 audit-attest
  (author + conformance-check + gate); Constitution widening + tool grants + activation are
  `always_gate` Mark (A2/A3 ship-dial conservative; A11 — Rachel authors, Mark ratifies).
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
- **Owner / Stream:** Rachel + Vera (conformance) / 10 (OS-self). **Archetype:** B4 audit-attest
  (diff + draft + re-conform); guardrail/ceiling changes are `always_gate` via PR review (A2/A11).
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
- **Owner / Stream:** Vera (recommends) + Mark (applies) / 10 (OS-self). **Archetype:** B2
  gated-actuation (the dial apply is the actuation, Mark's `always_gate`); the **dial-proof ceiling**
  (money/customer-facing/credentials/prod-migration/X.0.0) can NEVER auto-cross (A2/A3/A10 — Vera
  recommends (10-V10), Mark applies, A11).
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
  **Archetype:** B4 audit-attest (author + run + compare); golden activation / baseline change gated
  (the evidence-floor A5 enforcement substrate).
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
  **Archetype:** B4 audit-attest (collect + open tuning candidates); any grant/guardrail/prompt change
  to a live agent is `always_gate` Mark (A2/A11 — V9 detects, J2 makes the risk call, O5 acts).
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
- **Owner / Stream:** Vera (integrity) + LocalPipeline (mechanism) / 10 (OS-self). **Archetype:** B4
  audit-attest (compose + vectorize + verify); AI-key custody is `always_gate` (A2 class). ⛔ DORMANT on
  Voyage seed #389 — per A5c this ships propose-only / recall reports staleness honestly until hydrated.
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
  **Archetype:** B4 audit-attest (project + distill + hunt-contradictions); never auto-resolves a
  contradiction and **never crosses the personal→company wall** (`always_gate`, A7 pool-never-bleed / ADR-0105 §3c).
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
- **Owner / Stream:** Alivia (knowledge) + the schema author / 10 (OS-self). **Archetype:** B4
  audit-attest (detect-change + update concept+matrix); PII/secrets/code-knowledge boundaries are
  hard refusals (A7/ADR-0086); gate-blocking is CI.
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
- **Autonomy ceiling:** L3 (Alivia poll/draft) / human authors at merge today; gate-blocking is CI.
- **Human-in-loop:** the schema author + Mark on merge. Floor: PII/secrets/code-knowledge boundaries
  are hard refusals.
- **Substrate deps:** OKF bundle (~95 files, ~complete), CI gates (live), LP #175/#176. **subject:**
  imperion · **OVERLAP with 10-K3 (Alivia freshness):** O8 = the machine OKF concept files; K3 =
  human IT-Glue docs. Split.

### 10-O9 · Connector / connection setup
- **Owner / Stream:** Vance/IT (operator) + Mark (custody) / 10 (OS-self) — #1256. **Archetype:** B2
  gated-actuation — credential custody is `always_gate` human-on-the-GUI (A2; secrets never read/print/commit);
  the custody write is idempotent + read-back-verified (A9).
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
- **Owner / Stream:** Mark (custody) + IT / 10 (OS-self). **Archetype:** B2 gated-actuation —
  re-custody is `always_gate` human (A2 secret material); old-secret delete is Mark-gated (A10 no clean undo);
  health verified via read-back (A9).
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
  **Archetype:** B2 gated-actuation (verify half) — prod deploys are Marshall's gated change (A2 class-4);
  this is the OS-self read-back verification that "deployed" is real, not assumed (A9c, A11 seam with Stream 06).
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
- **Owner / Stream:** Nova (orchestrator) / 10 (OS-self) — tracer `intake-route`. **Archetype:** B1
  triage/route (ground → classify → resolve-owner → disposition) — routing auto at L2; world-changing
  acts inherit the sub-agent ceiling; above-ceiling parks to the cockpit (A3/A11).
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
  **Archetype:** B4 audit-attest (ingest + normalize + route; no actuation — corrective actuation routes
  to the owning plane, A11 seam: live-host telemetry = Ozzie / governance consumption = Vera).
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
author) · Jessica #1550 · Alivia #1561. Cross-cutting #1543/#1544/#1537/#1538 mapped; Osiris #1562
referenced as the Stream-04 JML seam (not owned here). **D8 resolved** the prior connection-health
ownership gap → Vera (10-V14, platform function). **People-at-scale (#1627) extends Holly:** recruit→hire
(10-H6, feeds 10-H1) · capacity planning (10-H7, w/ Dexter) · L&D + cert lifecycle (10-H8) · comp &
benefits / open enrollment (10-H9) · employee relations / case (10-H10, w/ Laurel, sensitive PII) ·
W-2 payroll (10-H11, w/ Audrey + human); **10-H5 PTO/leave un-deferred** to a full gated entry. UNFILED
leaves flagged inline (Tess 10-T2/T3, Alivia 10-K2) = sub-issues under their owner epics. Per **D7.1** the 13 OS-self
procedures are first-class — running the agentic OS is running the company. **Doctrine inheritance
(ADR-0136):** every procedure names its archetype (B1–B9) and inherits A1–A11 — most of this stream
is **B4 audit-attest** (the assurance/governance core: Vera's 14 + Tess + Alivia + most OS-self), with
**B5 JML disable≠delete** carrying Holly's joiner/leaver split, **B3 synthesis-brief** for the
delegate-only C-suite tracers (Rachel A1, all of Jessica), **B2 gated-actuation** for legal binding +
connector/credential/deploy + dial-apply, **B9 deadline-sentinel** for Laurel's renewal radar, and
**B1 triage/route** for Rachel A2 + Nova intake. The stream's hard floors — Vera's Client Security
Standard ratification (10-V3), every credential/secret act (O9/O10), comp/identity gates (Holly),
and the personal→company wall (O7) — are `always_gate` per A2/A7/A10, dial-proof forever. **Schema gap
flagged to FE (#1621):** the people-payroll silver shape gates W-2 payroll (10-H11), comp & benefits
(10-H9), and the PTO/leave-accrual store (10-H5); per **A5c** those procedures ship **propose-only /
dormant** until #1621 lands. **Comp/payroll PII** is strict-RLS `data_class` financial + personal —
salary non-disclosure is **refusal-class** (consistent with Stream 09 Audrey) and every pay movement
is `always_gate` (A2 class-1). **Imperion-as-vendor security/compliance (#1628) extends Laurel:** the
privacy program (10-L4, GDPR/CCPA + DPA register + the DSR clock, w/ Grace) and the cyber/E&O insurance
lifecycle + breach-notification clock (10-L5, w/ Roman). **Both the DSR clock and the breach-notification
clock are hard B9 deadline-sentinels — escalate-to-terminal, NEVER auto-actuate** (a DSR fulfillment/
erasure and a breach notice are irreversible disclosures, A10 no-clean-undo ⇒ `always_gate` dial-proof);
their subject identifiers + breach facts are **strict-RLS `data_class` personal/sensitive — reported by
reference, never reproduced** (A5 + #967/#990; the privacy/breach surfaces fold into Laurel+Grace, not a
new DPO agent). **Enterprise risk & strategy (#1630, organic — NO M&A) extends Jessica + Laurel + Rachel:**
the enterprise/business-risk register (10-J4 — concentration/key-person/market, **explicitly DISTINCT
from the platform-risk register 10-J3**), the business-insurance portfolio (10-L6, Laurel, the non-cyber
lines), and low-pri facilities/fleet/corporate-IT G&A ops (10-A5, Rachel/Holly, B2 gated on spend). The
strategic-planning + board-pack rows of #1630 live in **Stream 11** (not duplicated here). **Schema gaps
flagged to FE:** the **DSR-clock + DPA register** (10-L4), the **insurance-policy store** (10-L5/L6), the
**enterprise-risk register** (10-J4 — may share 10-J3's store via a `risk_class` discriminator), and a
**corporate-asset/facilities store** (10-A5) are all owed; per **A5c** those steps ship **propose-only**
until built.

**Count: 59 Operating Procedures** — Rachel 5 (A1–A5, incl. facilities/fleet/corporate-IT A5 per #1630) ·
Holly 11 (H1–H11, incl. people-at-scale H6–H11 + un-deferred H5 per #1627) · Laurel 6 (L1–L6, incl. privacy
L4 + cyber/E&O+breach-clock L5 per #1628 + business-insurance L6 per #1630) · Tess 3 (T1–T3) · Vera 14
(V1–V14, incl. V14 connection-health per D8) · Jessica 4 (J1–J4, incl. enterprise-risk J4 per #1630) ·
Alivia 3 (K1–K3) · OS-self 13 (O1–O13).
