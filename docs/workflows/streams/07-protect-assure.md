# Stream 07 — Protect → Assure

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-NNNN](../../decision-records/ADR-NNNN-operating-procedure-catalog.md). Terms
> **Operating Procedure** / **Procedure Step** are defined in [`CONTEXT.md`](../../../CONTEXT.md).
>
> **D9 global principles apply to every procedure below** (encoded in each Human-in-loop field,
> not restated per entry): **P1** Nova-native human co-working (every flow co-works with a human
> through Nova) · **P2** each sub-agent's reasoning is ascribed back to the paired human, up the
> chain · **P3** an "easy button" at every human gate (prep to the goal, hand the human a one-click
> resolution) · **P4** urgent → dedicated chat, else → tag the team member in the shared Teams chat.

**Owner agents:** Cyrus (SOC, L4), Grace (GRC, L2), Roman (Deputy CISO, L2 delegate-only),
Phoenix (BCDR / Backup & Recovery, L3). **Owning ICM domains:** `icm/domains/soc/`,
`icm/domains/grc/`, `icm/domains/bcdr/`. **Epics:** Cyrus #1556 · Grace #1557 · Phoenix #1555 ·
Roman #1548.

**Stream scope:** security alert triage · investigation · containment · threat-intel intake ·
Security Posture Management (posture snapshot / Imperion Secure Score / pillar scoring · policy
& DNS Golden State drift · Client Security Standard measurement) · GRC control-evidence & attestation ·
security ops-governance (incident escalation + PIR · security-config change-control) · BCDR
(backup verification · recovery/restore · DR runbook + drill).

**Subject:** BOTH — Imperion's own posture + BCDR (dogfood the `subject` parameter) AND per-client
managed posture/BCDR.

**Roman seam (→ Stream 11):** Roman's scheduled cross-division `security-posture-brief`
(SOC+GRC+Identity read-only roll-up to Mark) is **Stream 11 (Orchestrate)** — NOT enumerated here.
Below = the security ops-governance procedures Roman owns that are NOT the synthesis brief.

**Client-posture three-way seam (D8 ownership ruling):** *Cyrus measures conformance →
Vera owns the Client Security Standard + ratification (**Stream 10**) → Celeste presents to client
(**Stream 08**) → human + Datto remediate.* Client security is **advisory-only, NO auto-remediation
at any level** (Celeste no-commits-ever ceiling). Posture-management measurement/computation
(OP-07-12/13/14) is assigned to **Cyrus (SOC, measure-only)** as the security-data owner.

**Driving policy (every procedure):** `TBD (mark-blocker: company-policy-collection)` (D4, #1586).
No IMxxx mapping yet — **but this stream (Security & Compliance) is the one whose procedures will map
most directly to the IMxxx info-sec policy canon later.** Candidate policy names retained per
procedure: incident-response / severity matrix · containment-authority · IR investigation runbook ·
SOC2/HIPAA/CMMC control-sets · backup/RPO-RTO · DR/BCP · posture/Score Model · Client Security
Standard · external-notification SLAs.

**Substrate dormancy legend:** **#389** Voyage embeddings (recall) · **#991** event/handoff bus ·
**#119** trigger-sync (deploy-dormant triggers) · **#1537** worker retrieval tier · **#1577**
problem/known_error · **#1578** monitoring/alert bronze feed (Cyrus security alerts may reference
this) · **#1579** change_freeze/rollback/standard-change · **#1580** AR/invoice · M365 per-client
app gates · Datto Client Mapping · LP DNS #157 golden/drift merge (REMAINING) · gauntlet
`auto_at_level`/`always_gate` enforcement (FE #1412).

---

## A. Cyrus — SOC (ceiling L4; destructive/identity/client-facing always_gate)

## OP-07-01 · Triage a security alert
- **Owner / Stream:** Cyrus / 07 (SOC).
- **Trigger:** Sentinel/Defender alert lands in the agent_event inbox (per-account — both the
  Imperion-own tenant and each Customer Tenant).
- **Terminal outcome:** Alert dispositioned — `signal` (→ OP-07-02) | `noise`/false-positive
  (closed w/ rationale) | auto-contained-then-handoff.
- **Procedure Steps:**
  1. `[automation]` Ingest alert + enrich from Defender/Sentinel bronze (Microsoft-sourced);
     correlate to Customer Tenant + account via Client Mapping. **L0.**
  2. `[automation]` Threat-intel enrich (Microsoft-sourced TI folded into SOC — low-invest);
     score signal vs noise. **L2.**
  3. `[hybrid]` Classify disposition; high-confidence reversible containment may auto-fire at L4
     under the IR runbook (→ OP-07-03); **else** `[gui-step]` park proposal in cockpit.
     **HAND-OFF →** OP-07-02 (investigate) / Roman (escalation, OP-07-07).
  4. `[automation]` Post triage work-note to the incident record (tracer write).
- **Driving policy:** TBD (#1586) — incident-response policy / severity matrix
  (`docs/security/incident-response.md` is framework-only, no severity matrix → POLICY GAP).
- **Realization:** `icm/domains/soc/security-alert-triage/` (tracer, epic #1556).
- **Autonomy ceiling:** L4. `always_gate`: isolation/destructive/identity/client-facing acts.
- **Human-in-loop:** Mark (CISO) / Roman pairing. L1 = every disposition parks; climbing →
  auto-triage of noise + auto-enrich; **always_gate floor** = any containment touching
  identity/destruction stays human at every level.
- **Substrate deps:** #991 inbox/handoff bus, #119, #1578 alert bronze feed, M365/Defender bronze,
  #1412 gauntlet. **subject:** both. **Maps to:** #1556.

## OP-07-02 · Investigate a confirmed signal (incident investigation)
- **Owner / Stream:** Cyrus / 07 (SOC).
- **Trigger:** A triaged alert dispositioned `signal` (OP-07-01), or a manual Mark/Roman-raised
  investigation.
- **Terminal outcome:** Investigation record with scope/root-cause hypothesis + recommended
  containment + eradication plan → routed to containment (OP-07-03) or escalated.
- **Procedure Steps:**
  1. `[automation]` Pull correlated telemetry — Entra sign-in logs, `audit_log`/`pii_access_log`,
     Defender incidents, related Autotask tickets. **L0.**
  2. `[automation]` Build timeline + blast-radius (affected identities, devices, tenants, credentials).
  3. `[hybrid]` Form root-cause hypothesis + recommend containment/eradication levers; **always_gate**
     identity/secret/destructive levers park.
  4. `[gui-step]` Analyst/Mark reviews investigation packet; approves containment. **HAND-OFF →**
     OP-07-03 (contain) / Phoenix (recovery, OP-07-10) / Roman (escalate, OP-07-07).
- **Driving policy:** TBD (#1586) — IR investigation runbook (framework exists, drilled plan does not → GAP).
- **Realization:** SOC deeper playbook (sub-issue under #1556) — `procedure-only` until built;
  investigation stage may live inside the triage workspace initially.
- **Autonomy ceiling:** L4 read/correlate auto; containment recommendations park.
- **Human-in-loop:** Mark/Roman. Recedes: auto-assembly of the packet; **always_gate floor** =
  approving any containment action.
- **Substrate deps:** audit_log/pii_access_log, Entra logs, Defender bronze, #389 recall (dormant),
  #1577 problem/known_error. **subject:** both. **Maps to:** #1556.

## OP-07-03 · Contain / isolate a threat (reversible containment) ⛔
- **Owner / Stream:** Cyrus / 07 (SOC).
- **Trigger:** Approved containment decision from OP-07-02, or an auto-fire high-confidence
  reversible containment from OP-07-01 (L4).
- **Terminal outcome:** Threat contained — credential/token revoked, session killed, workload
  isolated, account disabled; containment logged + reversible undo window recorded.
- **Procedure Steps:**
  1. `[hybrid]` Select containment lever (rotate/revoke secret-or-OAuth-token in Key Vault · revoke
     Entra sessions/disable account · isolate workload). **Reversible** levers may auto-fire at L4
     w/ undo; **destructive/identity** levers ⛔ **always_gate**.
  2. `[gui-step]` Human approves any always_gate lever (revoke/disable/isolate). **HAND-OFF ← Mark gate.**
  3. `[automation]` Execute lever via backend (never FE; ADR-0035/0058 action path through the gauntlet).
  4. `[automation]` Record containment + undo path + work-note; **HAND-OFF →** OP-07-02 eradication
     branch / Phoenix recovery (OP-07-10).
- **Driving policy:** TBD (#1586) — containment-authority policy.
- **Realization:** SOC playbook (sub-issue #1556); the actuation rides the ProposedAction gauntlet (#263).
- **Autonomy ceiling:** L4 for reversible-with-undo; ⛔ **`always_gate`** = isolation, account-disable,
  identity-affecting token-revoke, anything destructive/client-facing.
- **Human-in-loop:** Mark. Even at L5 the destructive/identity levers stay human — the dial-proof floor for SOC.
- **Substrate deps:** Key Vault custody, Entra admin path, backend executor + gauntlet (#263/#1412),
  #119. **subject:** both. **Maps to:** #1556.

## OP-07-04 · Threat-intelligence intake & posture-feed (Microsoft-sourced)
- **Owner / Stream:** Cyrus / 07 (SOC; standalone TI agent deliberately NOT created).
- **Trigger:** Scheduled TI pull + new Microsoft TI indicators (Defender TI / Sentinel) available.
- **Terminal outcome:** Normalized indicators applied to detection enrichment + any matched active
  exposure raised as a triage unit (→ OP-07-01).
- **Procedure Steps:**
  1. `[automation]` Pull Microsoft-sourced TI (low-invest, lowest priority per roster). **L0.**
  2. `[automation]` Normalize + dedupe indicators; match against current tenant exposure/posture data.
  3. `[automation]` On match → emit a new triage unit into OP-07-01 inbox; else update enrichment store.
  4. `[gui-step]` (low-dial) analyst reviews new-indicator batch before it influences auto-disposition.
- **Driving policy:** TBD (#1586).
- **Realization:** SOC sub-playbook under #1556 (`procedure-only` initially; harvested — folded into SOC).
- **Autonomy ceiling:** L4 (read/enrich auto); no actuation here (feeds OP-07-01).
- **Human-in-loop:** Mark/Roman; recedes to auto-enrich; no always_gate (no world-changing act).
- **Substrate deps:** Defender/Sentinel TI bronze, #1578 alert bronze feed, M365 per-client app gates.
  **subject:** both. **Maps to:** #1556.

---

## B. Grace — GRC (ceiling L2; audit/recommend; control changes/attestations always_gate)

## OP-07-05 · Control-evidence sweep
- **Owner / Stream:** Grace / 07 (GRC).
- **Trigger:** Scheduled cadence (per framework) OR a control-relevant event.
- **Terminal outcome:** Evidence collected + gap report vs SOC2/HIPAA/CMMC control set; gaps routed;
  control changes parked.
- **Procedure Steps:**
  1. `[automation]` Collect control evidence from posture/identity/config sources (M365 posture, CA
     policies, Defender, audit_log, device compliance) — **audit-by-reference, no client PII
     reproduced** (Vera-precedent gag). **L0/L2.**
  2. `[automation]` Map evidence to control-framework requirements (SOC2/HIPAA/CMMC).
  3. `[automation]` Detect gaps; build gap report.
  4. `[gui-step]` Human reviews gaps; any **control change / attestation is `always_gate`** → parks.
     **HAND-OFF →** Roman (governance escalation) / Celeste (client-facing finding, advisory).
- **Driving policy:** TBD (#1586) — the compliance frameworks themselves (SOC2/HIPAA/CMMC mappings)
  → **POLICY GAP: framework control-set source not yet provided.**
- **Realization:** `icm/domains/grc/control-evidence-sweep/` (tracer, epic #1557).
- **Autonomy ceiling:** L2 (evidence/gap-detection/mapping auto); control changes + attestations always_gate.
- **Human-in-loop:** Mark/Roman. Recedes to auto-sweep + auto-gap-report; **always_gate floor** =
  every control change & compliance attestation.
- **Substrate deps:** posture pillars, M365/Defender/Intune bronze, audit_log, #389 (dormant).
  **subject:** both. **Maps to:** #1557.

## OP-07-06 · Compliance attestation
- **Owner / Stream:** Grace / 07 (GRC).
- **Trigger:** Attestation due (audit window / certification cycle) OR a closed gap requires sign-off.
- **Terminal outcome:** Attestation recorded against a control with human sign-off (always_gate) —
  the audit artifact.
- **Procedure Steps:**
  1. `[automation]` Assemble the attestation packet from the latest evidence sweep (OP-07-05). **L1.**
  2. `[automation]` Pre-fill control status + cite evidence by reference.
  3. `[gui-step]` **Human attests** (always_gate — Grace never self-attests). **HAND-OFF ← Mark/Roman gate.**
  4. `[automation]` Record attestation + immutable audit stamp.
- **Driving policy:** TBD (#1586) — compliance-framework / attestation policy.
- **Realization:** GRC deeper playbook (sub-issue under #1557); `procedure-only` until built.
- **Autonomy ceiling:** L2 (assemble/pre-fill auto); attestation always_gate.
- **Human-in-loop:** Mark/Roman. Never recedes off the attest step — dial-proof.
- **Substrate deps:** OP-07-05 evidence store, audit_log. **subject:** both. **Maps to:** #1557.

---

## C. Roman — Deputy CISO (security-ops-governance; L2 delegate-only; synthesis-brief = Stream 11)

> **SEAM NOTE:** Roman's scheduled cross-division `security-posture-brief` (SOC+GRC+Identity
> read-only roll-up to Mark) is **Stream 11 (Orchestrate)** — NOT enumerated here. Below = the
> security ops-governance procedures Roman owns that are NOT the synthesis brief.

## OP-07-07 · Security-incident escalation & post-incident review governance
- **Owner / Stream:** Roman / 07 (Deputy CISO).
- **Trigger:** SOC escalates an incident past the SOC ceiling (identity/backup/DC/prod-auth/client-data
  class), OR an incident closes and review is due.
- **Terminal outcome:** Incident governed to closure — escalation decided, blameless post-incident
  review completed, hardening item (new ADR/runbook/control) filed.
- **Procedure Steps:**
  1. `[hybrid]` Receive SOC escalation (OP-07-01/03 handoff); decide severity + whether Mark-gate
     (prod-auth/infra/permissions/billing/client-data → Mark is escalation point).
  2. `[gui-step]` Mark-gated containment/recovery authorization for prod-class incidents. **HAND-OFF ↔ Mark.**
  3. `[hybrid]` After recovery, run blameless post-incident review (Detect→Contain→Eradicate→Recover→Review loop).
  4. `[automation]` File hardening follow-up (new ADR/runbook/control) as a tracked issue (never a TODO).
     **HAND-OFF →** Grace (control update) / Cyrus (detection tuning) / Phoenix (BCDR gap).
- **Driving policy:** TBD (#1586) — IR policy + severity matrix + external-notification SLAs
  (**explicitly pre-go-live, not yet drilled → GAP**).
- **Realization:** Deputy-CISO playbook (sub-issue under #1548); `procedure-only`. Delegate-only L2 —
  actuation inherits the executing sub-agent's ceiling.
- **Autonomy ceiling:** L2 delegate-only; all world-changing acts ride Cyrus/Phoenix gauntlets;
  prod-class always_gate to Mark.
- **Human-in-loop:** Mark (CISO, Roman's human). Recedes on assembly/triage-of-escalations;
  **always_gate floor** = prod-auth/infra/client-data authorization + the review sign-off.
- **Substrate deps:** #991 handoff bus, audit_log, #1577 problem/known_error, ADR/issue tracker.
  **subject:** both. **Maps to:** #1548.

## OP-07-08 · Security ops governance: detection-rule & guardrail change-control
- **Owner / Stream:** Roman / 07 (Deputy CISO).
- **Trigger:** A proposed change to detection rules, autonomy ceilings/always_gate config, or
  security guardrails (from SOC tuning, GRC gaps, or post-incident hardening).
- **Terminal outcome:** Security-config change governed — approved+applied via the change path, or
  rejected, with audit trail.
- **Procedure Steps:**
  1. `[automation]` Receive proposed security-config change + rationale + blast-radius.
  2. `[hybrid]` Roman reviews against the security baseline (`docs/security/unified-security-standard.md`)
     — conformance, least-privilege, dial-proof ceiling integrity.
  3. `[gui-step]` **Human approves** any change to always_gate classes / autonomy ceilings (these are
     dial-proof — config change to them is itself always_gate). **HAND-OFF ← Mark gate.**
  4. `[automation]` Apply via governed change path (rides Marshall's Change→Release for code/infra,
     **SEAM → Stream 06**); record audit.
- **Driving policy:** TBD (#1586) + unified-security-standard.md (internal baseline, referenced not restated).
- **Realization:** Deputy-CISO playbook (#1548); `procedure-only`. **SEAM → Stream 06 (Marshall)** for
  the actual code/infra change-release.
- **Autonomy ceiling:** L2 delegate-only; ceiling/always_gate config changes are themselves always_gate.
- **Human-in-loop:** Mark. Dial-proof floor = any change touching the autonomy ceiling itself.
- **Substrate deps:** autopilot_policies/agent.yaml, gauntlet config (#1412), #1579
  change_freeze/rollback/standard-change, audit_log. **subject:** both. **Maps to:** #1548.

---

## D. Phoenix — BCDR / Backup & Recovery (ceiling L3; PRODUCTION restore always_gate; split OUT of NOC)

## OP-07-09 · Backup verification (backup-verification tracer)
- **Owner / Stream:** Phoenix / 07 (BCDR).
- **Trigger:** Scheduled cadence OR a backup-job-completed event (Datto, M365, DB).
- **Terminal outcome:** Backup success verified + RPO/RTO evidence recorded; failures/aging flagged → report.
- **Procedure Steps:**
  1. `[automation]` Verify backup-job success across sources (Datto Endpoint + SaaS Backups, DB PITR
     availability, M365). **L0/L3.**
  2. `[automation]` Sandbox **test-restore** a sample (auto at L3, sandbox only — never production).
  3. `[automation]` Compute RPO/RTO evidence; detect failures + aging backups.
  4. `[hybrid]` Flag failures/aging; **HAND-OFF →** Cyrus (if failure looks like tampering) /
     Celeste (client advisory) / human+Datto (remediation — advisory, no auto-remediate).
- **Driving policy:** TBD (#1586) — backup / RPO-RTO policy.
- **Realization:** `icm/domains/bcdr/backup-verification/` (tracer, epic #1555).
- **Autonomy ceiling:** L3 (verify + sandbox test-restore auto). **`always_gate`:** PRODUCTION
  restore (separate workflow OP-07-10).
- **Human-in-loop:** Dexter (Phoenix's division CTO) + Mark for prod. Recedes to auto-verify +
  auto-sandbox-test; **always_gate floor** = any production restore.
- **Substrate deps:** Datto Client Mapping (per-client, dormant until mapped), DB PITR, M365 bronze,
  #119. **subject:** both. **Maps to:** #1555.

## OP-07-10 · Recovery / restore execution (production restore test + real restore) ⛔
- **Owner / Stream:** Phoenix / 07 (BCDR).
- **Trigger:** A verification failure requiring recovery, a DR event, OR a scheduled
  production-restore TEST.
- **Terminal outcome:** Data/workload restored (test or real) + restore validated; or restore
  declined with rationale.
- **Procedure Steps:**
  1. `[hybrid]` Scope the restore (which backup point, what target, RPO target) — recommend plan.
  2. `[gui-step]` ⛔ **Human + Datto approve & execute** the production restore (always_gate — Phoenix
     recommends/orchestrates, does NOT auto-restore prod). **HAND-OFF ↔ Mark + Datto.**
  3. `[automation]` Post-restore validation (data integrity, service health checks).
  4. `[automation]` Record restore evidence + RTO actuals; **HAND-OFF →** Roman (post-incident review
     OP-07-07 if incident-driven).
- **Driving policy:** TBD (#1586) — DR runbook + restore-authority policy.
- **Realization:** BCDR playbook, separate workflow (sub-issue under #1555); `procedure-only`.
- **Autonomy ceiling:** L3 for sandbox/test; ⛔ **production restore always_gate.**
- **Human-in-loop:** Mark + Datto. Never recedes off prod-restore execution — dial-proof.
- **Substrate deps:** Datto, DB PITR, app redeploy path, disaster-recovery runbook
  (docs/disaster-recovery/). **subject:** both. **Maps to:** #1555.

## OP-07-11 · DR runbook authoring & drill (maintain the DR plan)
- **Owner / Stream:** Phoenix / 07 (BCDR).
- **Trigger:** Scheduled DR-drill cadence OR a material change to infra/backup topology.
- **Terminal outcome:** DR runbook current + a drill executed/recorded with gaps filed.
- **Procedure Steps:**
  1. `[automation]` Detect topology/backup-config changes that stale the DR runbook. **L0/L2.**
  2. `[hybrid]` Draft/update DR runbook steps (RPO/RTO targets per service).
  3. `[gui-step]` Human approves the runbook revision + schedules a drill.
  4. `[hybrid]` Execute drill (sandbox restore + failover rehearsal, auto where reversible); file
     gaps as issues. **HAND-OFF →** Roman (governance), Lexicon (IT Glue SoT sync — **SEAM → Stream 10**).
- **Driving policy:** TBD (#1586) — DR / BCP policy.
- **Realization:** BCDR playbook (#1555); `procedure-only`. Runbook is a `docs/runbooks/`/IT-Glue
  artifact, Lexicon-synced.
- **Autonomy ceiling:** L3; production failover always_gate.
- **Human-in-loop:** Dexter/Mark. Recedes to auto-drift-detect + auto-draft; always_gate floor =
  approving the runbook + any prod failover.
- **Substrate deps:** infra topology, Datto, Lexicon doc-sync (Stream 10), #389 (dormant).
  **subject:** both. **Maps to:** #1555.

---

## E. Security Posture Management (Cyrus-owned per the D8 measure-only ruling; advisory)

> **OWNERSHIP RULING (D8, flag retained for Mark):** posture-snapshot/secure-score/golden-state
> machinery has no single agent named in the org recast. It is Microsoft-sourced (SOC/Cyrus natural
> fit). The D8 ruling assigns the *measurement/computation* procedures to **Cyrus (SOC), measure-only**
> as security-data owner, with explicit seams: **Vera owns the Client Security Standard** (Stream 10),
> **Celeste presents** (Stream 08), **human + Datto remediate**. These are **not yet in any current
> epic's tracer scope** (#1556 = alert-triage only) → unfiled, harvested. **CONFIRM owner.**

## OP-07-12 · Compute Posture Snapshot (quarterly / on-demand)
- **Owner / Stream:** Cyrus / 07 (SOC, posture measurement — *owner gap, see note*).
- **Trigger:** Quarterly schedule OR on-demand request (per account).
- **Terminal outcome:** Immutable `posture_snapshot` written per account — Imperion Secure Score
  (0–100) + every Posture Pillar's normalized result, stamped with Score Model version + grade
  (never recomputed).
- **Procedure Steps:**
  1. `[automation]` Gather per-pillar data (M365 secure score, policy compliance, network,
     vulnerability, phishing, dark web) per account. No-coverage pillar scores 0 → "No coverage",
     not failure. **L0.**
  2. `[automation]` Compute Imperion Secure Score across pillars per the current Score Model
     (versioned weights).
  3. `[automation]` Write immutable Posture Snapshot (Score Model version + grade frozen at capture).
  4. `[automation]` **HAND-OFF →** OP-07-13 (Golden State drift), OP-07-14 (Client Security Standard
     drift), Celeste (present — **SEAM Stream 08/10**).
- **Driving policy:** TBD (#1586) — posture / Score Model policy.
- **Realization:** SOC posture playbook (harvested — UNFILED as a tracer; **flag: not in any current
  epic's tracer scope**); `procedure-only`.
- **Autonomy ceiling:** L4 (measurement auto, fully reversible/read); no remediation here. Score Model
  *version change* always_gate (governance, Roman).
- **Human-in-loop:** Mark/Roman. Fully auto-capable; no always_gate (measure-only).
- **Substrate deps:** all 6 pillar feeds (M365 per-client app gates, Defender, dark-web, vuln,
  phishing — many deploy-dormant), Score Model store, #1578 alert/monitoring bronze. **subject:** both.

## OP-07-13 · Classify policy Golden State drift (per tenant) + DNS Golden State drift (per domain)
- **Owner / Stream:** Cyrus / 07 (SOC — *owner gap, see note*).
- **Trigger:** New observed config capture (policy or DNS) vs the human-approved Golden State; on
  schedule or on snapshot.
- **Terminal outcome:** Each observed policy/DNS record classified **compliant | drift | ungoverned |
  missing**; DNS governance verdict (`not-in-azure`→`in-azure-readonly`→`managed`) computed per domain.
- **Procedure Steps:**
  1. `[automation]` Capture observed policy config (per Customer Tenant) + DNS records (plane=azure via
     ARM + plane=public resolve). **L0.**
  2. `[automation]` Full-outer-join captured vs Golden State per (account, tenant/domain) → classify
     compliant/drift/ungoverned/missing.
  3. `[automation]` Compute DNS governance verdict (managed = in-Azure + write-proven + live NS delegate).
  4. `[hybrid]` Surface drift; **Golden State *baseline approval/change* is human-gated**
     (`Set-ImperionDnsGoldenState` / policy Golden State). **HAND-OFF →** OP-07-14 / Celeste (present) /
     human+Datto (remediate — advisory).
- **Driving policy:** TBD (#1586); ADR-0051 (golden/drift) + ADR-0063 (DNS) referenced.
- **Realization:** SOC/posture playbook; DNS golden/drift merge is **LP #157 (REMAINING, not yet
  shipped)** — partially dormant. `procedure-only`.
- **Autonomy ceiling:** L4 (classify auto, read-only); **Golden State baseline set/change always_gate**
  (human-approved baseline).
- **Human-in-loop:** Mark. Recedes to auto-classify; always_gate floor = approving/changing any Golden
  State baseline.
- **Substrate deps:** LP #157 (DNS golden/drift, REMAINING), ARM zone collector (shipped),
  public-resolve (shipped), account_domain registry, policy Golden State store. **subject:** both.

## OP-07-14 · Evaluate per-client conformance vs current Client Security Standard + draft remediation
- **Owner / Stream:** Cyrus / 07 measures → **Vera owns the Standard (SEAM Stream 10)** · **Celeste
  presents (SEAM Stream 08)** · human+Datto remediate.
- **Trigger:** New `posture_snapshot` for an account, OR a Client Security Standard version
  ratification (re-scores all clients).
- **Terminal outcome:** Per-client "get-back-in-shape" evaluation + **remediation recommendation
  (advisory only, NO auto-remediation)** produced and routed to Celeste for client presentation.
- **Procedure Steps:**
  1. `[automation]` Measure the account's current posture_snapshot against the **current** Vera-owned
     Client Security Standard version. **L0.**
  2. `[automation]` Produce drift/get-back-in-shape evaluation + ranked remediation recommendations.
  3. `[gui-step]` Human reviews (advisory; **no binding commitment — Celeste no-commits-ever ceiling**).
     **HAND-OFF →** Celeste (present to client, Stream 08) → human + Datto (remediate).
  4. `[automation]` Record evaluation; on Standard version change, re-score all clients (Standard
     ratification itself = **always_gate, Vera drafts / Mark ratifies — Stream 10**).
- **Driving policy:** TBD (#1586); Client Security Standard (Vera-owned, evolving baseline; distinct
  from the internal unified-security-standard.md).
- **Realization:** SOC posture playbook (`procedure-only`); the **Standard + ratification = Stream 10
  (Vera)**, NOT here.
- **Autonomy ceiling:** L4 measure/recommend (read-only); **remediation always advisory — no
  auto-remediation of client security at ANY level** (hard ceiling on client-security actuation).
- **Human-in-loop:** Mark + Celeste + Datto. Measurement auto; **dial-proof floor = client-security
  remediation is never auto** (advisory forever).
- **Substrate deps:** posture_snapshot (OP-07-12), Vera Client Security Standard store (Stream 10),
  Celeste handoff bus (#991). **subject:** both.

---

## Provable-coverage note

Protect→Assure surface fully covered: SOC alert→signal→containment→TI (OP-07-01…04), GRC
control-evidence + attestation (05/06), security ops-governance escalation/PIR + config change-control
(07/08, the latter seaming to Stream 06), BCDR backup-verify → recovery/restore → DR runbook+drill
(09/10/11), and Security Posture Management — snapshot, Golden State + DNS drift, Client Security
Standard measurement (12/13/14, the D8 measure-only Cyrus assignment with the Vera/Celeste/human+Datto
seams). Roman's read-only cross-division posture-brief synthesis is **excluded — it lives in Stream 11**.
This is the stream whose procedures will map most directly to the IMxxx info-sec policy canon once D4
policy collection lands; until then every Driving policy = TBD (#1586).

**Count: 14 Operating Procedures** (Cyrus 7 = 4 SOC [01–04] + 3 posture-mgmt [12–14]; Grace 2 [05/06];
Roman 2 ops-governance [07/08]; Phoenix 3 [09–11]) — Roman's synthesis brief excluded (Stream 11).
