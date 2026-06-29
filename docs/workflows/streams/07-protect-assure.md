# Stream 07 — Protect → Assure

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

**Owner agents:** Cyrus (SOC, L4), Grace (GRC, L2), Roman (Deputy CISO, L2 delegate-only),
Phoenix (BCDR / Backup & Recovery, L3). **Owning ICM domains:** `icm/domains/soc/`,
`icm/domains/grc/`, `icm/domains/bcdr/`. **Epics:** Cyrus #1556 · Grace #1557 · Phoenix #1555 ·
Roman #1548.

**Stream scope:** security alert triage · investigation · containment · threat-intel intake ·
Security Posture Management (posture snapshot / Imperion Secure Score / pillar scoring · policy
& DNS Golden State drift · Client Security Standard measurement) · GRC control-evidence & attestation ·
**third-party / vendor security risk (TPRM)** · **Imperion's own SOC 2 / ISO / CMMC audit program** ·
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
`auto_at_level`/`always_gate` enforcement (FE #1412). Per A5c, deepened steps that depend on a
dormant source ship **propose-only** until built.

**Archetype map (B-templates this stream instantiates).**

| Procedure | Archetype |
|---|---|
| OP-07-01 triage a security alert | **B1 triage/route** |
| OP-07-02 investigate a confirmed signal | **B4 audit-attest** (investigate/attest, internal) |
| OP-07-03 contain / isolate a threat ⛔ | **B2 gated-actuation** (containment = `always_gate`, A2 class-5) |
| OP-07-04 threat-intel intake & posture-feed | **B1 triage/route** (TI → triage-unit, no actuation) |
| OP-07-05 control-evidence sweep | **B4 audit-attest** (measure, internal) |
| OP-07-06 compliance attestation | **B4 audit-attest** (external attestation = `always_gate`, human-signed) |
| OP-07-07 incident escalation & PIR governance | **B2/B4 seam** → executor's **B2** (delegate-only, prod-class `always_gate`) |
| OP-07-08 security-config change-control | **B2/B4** governance → **A11 seam → Stream 06** |
| OP-07-09 backup verification | **B4 audit-attest** (verify + read-back, A9c) |
| OP-07-10 recovery / restore execution ⛔ | **B8 provision-with-undo** / **B2** (prod restore = `always_gate`) |
| OP-07-11 DR runbook authoring & drill | **B4 audit-attest** (drill + maintain the dual-audience runbook, A8) |
| OP-07-12 compute posture snapshot | **B4 audit-attest** (measure-only, internal — D8 Cyrus) |
| OP-07-13 Golden State + DNS drift | **B4 audit-attest** (measure; baseline change = `always_gate`) |
| OP-07-14 per-client conformance vs Standard | **B4 audit-attest** (measure; remediation advisory-only forever) |
| OP-07-15 third-party / vendor security risk (TPRM) | **B4 audit-attest** (measure/assess OUR vendors, internal) |
| OP-07-16 Imperion's own SOC 2 / ISO / CMMC audit program | **B4 audit-attest** (external audit = `always_gate`, human-signed) |

**Doctrine showcase for this stream:** **A11 obligation/action separation** (the D8 posture ruling —
*Cyrus measures · Vera owns the Standard · Celeste presents · human + Datto remediate*, meeting at
explicit seams, never co-owning) and **A10 reversibility → derived ceiling** (the SOC reversible-vs-
destructive split + the prod-restore floor). **A7 pool-never-bleed** governs every cross-client threat
correlation: an indicator at one tenant may be checked against the whole pool *internally*, but one
client's identifiable exposure never surfaces in another's context.

---

## A. Cyrus — SOC (ceiling L4; destructive/identity/client-facing always_gate)

## OP-07-01 · Triage a security alert
- **Owner / Stream:** Cyrus / 07 (SOC). **Archetype:** B1 triage/route.
- **Trigger:** Sentinel/Defender alert lands in the agent_event inbox (per-account — both the
  Imperion-own tenant and each Customer Tenant).
- **Terminal outcome:** Alert dispositioned — `signal` (→ OP-07-02) | `noise`/false-positive
  (closed w/ rationale) | auto-contained-then-handoff.
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition → log):
  1. `[automation]` **Ground** — ingest alert + enrich from Defender/Sentinel bronze
     (Microsoft-sourced), **citing the alert source + as-of** (A5); correlate to Customer Tenant +
     account via Client Mapping. Empty/unparseable retrieval → park, never fabricate a disposition
     (A5b). **L0.**
  2. `[automation]` **Classify** — threat-intel enrich (Microsoft-sourced TI folded into SOC —
     low-invest); score signal vs noise. **Cross-client correlation is internal-only** — an
     indicator may be checked against the whole pool to sharpen the score, but no other client's
     identifiable exposure enters this disposition (A7, B1 carve-out). **L2.**
  3. `[hybrid]` **Disposition** — classify; high-confidence **reversible** containment may auto-fire
     at L4 under the IR runbook (→ OP-07-03, A10 row 2: clean-undo + undo window); **any
     destructive/identity lever parks regardless of dial** (B1 high-risk-escalate carve-out + A2
     class-3/5). **else** `[gui-step]` park proposal in cockpit as the 4-part easy-button (drafted
     disposition + cited why + one-click confirm/dismiss + consequence preview, A4).
     **SEAM →** OP-07-02 (investigate) / Roman (escalation, OP-07-07).
  4. `[automation]` **Log** — post triage work-note to the incident record (tracer write,
     attributed up-chain P2).
- **Driving policy:** inherits the doctrine baseline (A2/A4/A5) + TBD (#1586) — incident-response
  policy / severity matrix (`docs/security/incident-response.md` is framework-only, no severity
  matrix → POLICY GAP).
- **Realization:** `icm/domains/soc/security-alert-triage/` (tracer, epic #1556).
- **Autonomy ceiling:** **L4** (routing/triage internally reversible, A10 row 1; reversible
  auto-containment is the B1→B2 hand-off, not actuated here). **`always_gate` (inherited A2 +
  delta):** isolation/destructive/identity/client-facing acts (A2 classes 2/3/5).
- **Human-in-loop:** Mark (CISO) / Roman pairing. Ships L0 (A3); climbing → auto-triage of noise +
  auto-enrich; **always_gate floor** = any containment touching identity/destruction stays human at
  every level.
- **Substrate deps:** #991 inbox/handoff bus, #119, #1578 alert bronze feed, M365/Defender bronze,
  #1412 gauntlet. **subject:** both. **Maps to:** #1556.

## OP-07-02 · Investigate a confirmed signal (incident investigation)
- **Owner / Stream:** Cyrus / 07 (SOC). **Archetype:** B4 audit-attest (internal — assemble an
  evidence-backed investigation packet; the *act* of containment is OP-07-03's B2).
- **Trigger:** A triaged alert dispositioned `signal` (OP-07-01), or a manual Mark/Roman-raised
  investigation.
- **Terminal outcome:** Investigation record with scope/root-cause hypothesis + recommended
  containment + eradication plan → routed to containment (OP-07-03) or escalated.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → route):
  1. `[automation]` **Scope + collect evidence** — pull correlated telemetry (Entra sign-in logs,
     `audit_log`/`pii_access_log`, Defender incidents, related Autotask tickets), **citing each
     source + as-of** (A5); on dormant recall (#389) say so rather than presenting stale data as
     live (A5c). **L0.**
  2. `[automation]` **Evaluate** — build timeline + blast-radius (affected identities, devices,
     tenants, credentials). Pool-correlate similar incidents across the base **internally only** to
     improve the hypothesis (A7).
  3. `[hybrid]` **Compose** — form root-cause hypothesis + recommend containment/eradication levers;
     **identity/secret/destructive levers are flagged `always_gate` and park** (A2 class-3/5).
  4. `[gui-step]` **Route** — analyst/Mark reviews the investigation packet (4-part easy-button:
     packet + cited evidence + one-click approve-containment + consequence/irreversibility preview,
     A4); approves containment. **SEAM →** OP-07-03 (contain) / Phoenix (recovery, OP-07-10) /
     Roman (escalate, OP-07-07).
- **Driving policy:** inherits A2/A4/A5 + TBD (#1586) — IR investigation runbook (framework exists,
  drilled plan does not → GAP).
- **Realization:** SOC deeper playbook (sub-issue under #1556) — `procedure-only` until built;
  investigation stage may live inside the triage workspace initially.
- **Autonomy ceiling:** **L4** read/correlate auto (read-only = reversible, A10 row 1); containment
  recommendations park. No actuation of Cyrus's own here.
- **Human-in-loop:** Mark/Roman. Recedes: auto-assembly of the packet; **always_gate floor** =
  approving any containment action.
- **Substrate deps:** audit_log/pii_access_log, Entra logs, Defender bronze, #389 recall (dormant),
  #1577 problem/known_error. **subject:** both. **Maps to:** #1556.

## OP-07-03 · Contain / isolate a threat (reversible containment) ⛔
- **Owner / Stream:** Cyrus / 07 (SOC). **Archetype:** B2 gated-actuation — the stream's canonical
  showcase of **A10 reversibility → derived ceiling**: a clean-undo lever auto-fires at L4, a
  no-clean-undo lever is `always_gate` forever (A2 class-5, **security containment impacting client
  operations**).
- **Trigger:** Approved containment decision from OP-07-02, or an auto-fire high-confidence
  reversible containment from OP-07-01 (L4).
- **Terminal outcome:** Threat contained — credential/token revoked, session killed, workload
  isolated, account disabled; containment logged + reversible undo window recorded.
- **Procedure Steps** (B2: ground → plan/assemble ProposedAction → GATE → actuate → reconcile → log):
  1. `[hybrid]` **Ground + plan** — select containment lever (rotate/revoke secret-or-OAuth-token in
     Key Vault · revoke Entra sessions/disable account · isolate workload), re-grounding that the
     signal still holds (A5). **A10 split:** **reversible** levers (token rotate, session-revoke,
     **account disable** — the named A2 exception, clean undo + undo window) may auto-fire at L4;
     **destructive/identity-delete/client-ops-impacting** levers ⛔ **always_gate** (A2 class-5, no
     clean undo).
  2. `[gui-step]` **GATE** — human approves any `always_gate` lever, presented as the 4-part
     easy-button (drafted lever + cited evidence + one-click execute **+ its one-click inverse where
     reversible** + irreversibility/blast-radius preview, A4). ⛔ A gate is "prep everything + present
     the button," never "park and wait." **HAND-OFF ← Mark gate.**
  3. `[automation]` **Actuate** the lever via the backend (never FE; ADR-0035/0058 action path
     through the gauntlet, halt-on-fail). **Idempotency-keyed** so a retry/replay is a no-op + audit
     note, never a double-revoke (A9b); on partial failure **halt, no auto-rollback**, surface
     completed-vs-pending (A10).
  4. `[automation]` **Reconcile + log** — read back the SoR (Key Vault / Entra) to confirm the lever
     landed (close-on-verification, A9c); record containment + undo path + work-note. **SEAM →**
     OP-07-02 eradication branch / Phoenix recovery (OP-07-10).
- **Driving policy:** inherits A2/A4/A5/A9/A10 + TBD (#1586) — containment-authority policy.
- **Realization:** SOC playbook (sub-issue #1556); the actuation rides the ProposedAction gauntlet (#263).
- **Autonomy ceiling:** **L4** for reversible-with-undo (A10 row 2); ⛔ **`always_gate`** = isolation,
  account-delete, identity-affecting destructive revoke, anything destructive/client-facing/client-
  ops-impacting (A2 class-5, no clean undo → gated forever).
- **Human-in-loop:** Mark. Even at L5 the destructive/identity levers stay human — the dial-proof floor for SOC.
- **Substrate deps:** Key Vault custody, Entra admin path, backend executor + gauntlet (#263/#1412),
  #119. **subject:** both. **Maps to:** #1556.

## OP-07-04 · Threat-intelligence intake & posture-feed (Microsoft-sourced)
- **Owner / Stream:** Cyrus / 07 (SOC; standalone TI agent deliberately NOT created). **Archetype:**
  B1 triage/route (TI indicators → matched-exposure triage units; no actuation of its own).
- **Trigger:** Scheduled TI pull + new Microsoft TI indicators (Defender TI / Sentinel) available.
- **Terminal outcome:** Normalized indicators applied to detection enrichment + any matched active
  exposure raised as a triage unit (→ OP-07-01).
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition → log):
  1. `[automation]` **Ground** — pull Microsoft-sourced TI (low-invest, lowest priority per roster),
     **citing the feed + as-of** (A5). **L0.**
  2. `[automation]` **Classify** — normalize + dedupe indicators; match against current tenant
     exposure/posture data. A match at one tenant may be checked against the whole pool to find
     shared exposure **internally only** — no client's identifiable exposure surfaces in another's
     enrichment (A7). **L2.**
  3. `[automation]` **Disposition** — on match → emit a new triage unit into OP-07-01 inbox (routing
     auto-executes at L2, internally reversible, B1); else update enrichment store.
  4. `[gui-step]` **Log** — (low-dial) analyst reviews the new-indicator batch before it influences
     auto-disposition.
- **Driving policy:** inherits A2/A4/A5 + TBD (#1586).
- **Realization:** SOC sub-playbook under #1556 (`procedure-only` initially; harvested — folded into SOC).
- **Autonomy ceiling:** **L4** (read/enrich auto, reversible — A10 row 1); no actuation here (feeds
  OP-07-01). **No `always_gate`** (no world-changing act).
- **Human-in-loop:** Mark/Roman; recedes to auto-enrich; no always_gate.
- **Substrate deps:** Defender/Sentinel TI bronze, #1578 alert bronze feed, M365 per-client app gates.
  **subject:** both. **Maps to:** #1556.

---

## B. Grace — GRC (ceiling L2; audit/recommend; control changes/attestations always_gate)

## OP-07-05 · Control-evidence sweep
- **Owner / Stream:** Grace / 07 (GRC). **Archetype:** B4 audit-attest (**internal** measure — split
  by audience per B4: measurement/gap-detection auto-runs at L2; any *assertion* is OP-07-06).
- **Trigger:** Scheduled cadence (per framework) OR a control-relevant event.
- **Terminal outcome:** Evidence collected + gap report vs SOC2/HIPAA/CMMC control set; gaps routed;
  control changes parked.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → route):
  1. `[automation]` **Scope + collect evidence** — **citing the control-set version** (A5) — from
     posture/identity/config sources (M365 posture, CA policies, Defender, audit_log, device
     compliance), **audit-by-reference, no client PII reproduced** (Vera-precedent gag, A7
     pool-never-bleed enforced by `data_class`/RLS). **L0/L2.**
  2. `[automation]` **Evaluate** — map evidence to control-framework requirements (SOC2/HIPAA/CMMC),
     each finding carrying its evidence reference + as-of (A5).
  3. `[automation]` **Compose** — detect gaps; build the gap report (attributed P2).
  4. `[gui-step]` **Route** — human reviews gaps; any **control change / attestation is
     `always_gate`** → parks (the external assertion is OP-07-06's gate). **SEAM →** Roman
     (governance escalation, OP-07-07/08) / Celeste (client-facing finding, advisory, Stream 08).
- **Driving policy:** inherits A2/A4/A5 + TBD (#1586) — the compliance frameworks themselves
  (SOC2/HIPAA/CMMC mappings) → **POLICY GAP: framework control-set source not yet provided.**
- **Realization:** `icm/domains/grc/control-evidence-sweep/` (tracer, epic #1557).
- **Autonomy ceiling:** **L2** (evidence/gap-detection/mapping = reversible internal measure, A10
  row 1); control changes + attestations `always_gate`.
- **Human-in-loop:** Mark/Roman. Recedes to auto-sweep + auto-gap-report; **always_gate floor** =
  every control change & compliance attestation.
- **Substrate deps:** posture pillars, M365/Defender/Intune bronze, audit_log, #389 (dormant).
  **subject:** both. **Maps to:** #1557.

## OP-07-06 · Compliance attestation
- **Owner / Stream:** Grace / 07 (GRC). **Archetype:** B4 audit-attest (**external** assertion — the
  B4 audience split: an **external-facing attestation** — auditor, regulator, SOC2/CMMC package,
  client security questionnaire — is `always_gate`, human-signed, full evidence-backed package
  pre-staged).
- **Trigger:** Attestation due (audit window / certification cycle) OR a closed gap requires sign-off.
- **Terminal outcome:** Attestation recorded against a control with human sign-off (always_gate) —
  the audit artifact.
- **Procedure Steps** (B4: scope → collect-evidence → compose → sign-off):
  1. `[automation]` **Scope + assemble** the attestation packet from the latest evidence sweep
     (OP-07-05), **citing the control-set version + as-of** (A5). **L1.**
  2. `[automation]` **Compose** — pre-fill control status + cite evidence by reference (no PII, A7),
     staged as the 4-part easy-button so the human signs against a complete package (A4).
  3. `[gui-step]` **Sign-off** — **human attests** (`always_gate` — external assertion; Grace never
     self-attests, A11 obligation/action separation: Grace measures, the human signs).
     **HAND-OFF ← Mark/Roman gate.**
  4. `[automation]` **Log** — record attestation + immutable audit stamp; idempotency-keyed so a
     replay re-files no duplicate attestation (A9b).
- **Driving policy:** inherits A2/A4/A5 + TBD (#1586) — compliance-framework / attestation policy.
- **Realization:** GRC deeper playbook (sub-issue under #1557); `procedure-only` until built.
- **Autonomy ceiling:** **L2** (assemble/pre-fill auto); **attestation `always_gate`** (external
  assertion — A2: external-facing commitment, B4 audience split; no clean undo on a filed attestation).
- **Human-in-loop:** Mark/Roman. Never recedes off the attest step — dial-proof.
- **Substrate deps:** OP-07-05 evidence store, audit_log. **subject:** both. **Maps to:** #1557.

---

## C. Roman — Deputy CISO (security-ops-governance; L2 delegate-only; synthesis-brief = Stream 11)

> **SEAM NOTE:** Roman's scheduled cross-division `security-posture-brief` (SOC+GRC+Identity
> read-only roll-up to Mark) is **Stream 11 (Orchestrate)** — NOT enumerated here. Below = the
> security ops-governance procedures Roman owns that are NOT the synthesis brief.

## OP-07-07 · Security-incident escalation & post-incident review governance
- **Owner / Stream:** Roman / 07 (Deputy CISO). **Archetype:** **B2/B4 governance seam** — Roman
  holds the governance clock (escalate, gate, review); the world-changing act rides the executing
  sub-agent's **B2** (Cyrus/Phoenix). The PIR itself is **B4 audit-attest**. A11
  obligation/action separation, delegate-only.
- **Trigger:** SOC escalates an incident past the SOC ceiling (identity/backup/DC/prod-auth/client-data
  class), OR an incident closes and review is due.
- **Terminal outcome:** Incident governed to closure — escalation decided, blameless post-incident
  review completed, hardening item (new ADR/runbook/control) filed.
- **Procedure Steps:**
  1. `[hybrid]` **Receive** SOC escalation (OP-07-01/03 handoff, **SEAM**); decide severity + whether
     Mark-gate (prod-auth/infra/permissions/billing/client-data → Mark is escalation point). Urgency
     is computed (an `always_gate` act blocking a containment clock = urgent → dedicated chat; else
     Teams tag); absent human → walk the `reports_to` chain to Nova's gatekeeper, never dropped (A6).
  2. `[gui-step]` **GATE** — Mark-gated containment/recovery authorization for prod-class incidents,
     presented as the 4-part easy-button (decision + cited blast-radius + one-click authorize +
     irreversibility preview, A4). **HAND-OFF ↔ Mark.**
  3. `[hybrid]` **Review (B4)** — after recovery, run a blameless post-incident review
     (Detect→Contain→Eradicate→Recover→Review loop), each finding evidence-cited (A5).
  4. `[automation]` **File hardening** follow-up (new ADR/runbook/control) as a tracked issue (never
     a TODO). **SEAM →** Grace (control update, OP-07-05) / Cyrus (detection tuning) / Phoenix (BCDR gap).
- **Driving policy:** inherits A2/A4/A5/A6 + TBD (#1586) — IR policy + severity matrix +
  external-notification SLAs (**explicitly pre-go-live, not yet drilled → GAP**).
- **Realization:** Deputy-CISO playbook (sub-issue under #1548); `procedure-only`. Delegate-only L2 —
  actuation inherits the executing sub-agent's ceiling.
- **Autonomy ceiling:** **L2 delegate-only**; all world-changing acts ride Cyrus/Phoenix gauntlets
  under THEIR ceiling + `always_gate` (A11 — Roman never raises them); prod-class `always_gate` to Mark.
- **Human-in-loop:** Mark (CISO, Roman's human). Recedes on assembly/triage-of-escalations;
  **always_gate floor** = prod-auth/infra/client-data authorization + the review sign-off.
- **Substrate deps:** #991 handoff bus, audit_log, #1577 problem/known_error, ADR/issue tracker.
  **subject:** both. **Maps to:** #1548.

## OP-07-08 · Security ops governance: detection-rule & guardrail change-control
- **Owner / Stream:** Roman / 07 (Deputy CISO). **Archetype:** **B2/B4 governance gate** → the
  actual code/infra change-release is **A11 seam → Stream 06 (Marshall)**. Roman owns the
  *security-conformance review clock*; Marshall's executor owns the mechanical change act — they
  meet at an explicit step, never co-own.
- **Trigger:** A proposed change to detection rules, autonomy ceilings/always_gate config, or
  security guardrails (from SOC tuning, GRC gaps, or post-incident hardening).
- **Terminal outcome:** Security-config change governed — approved+applied via the change path, or
  rejected, with audit trail.
- **Procedure Steps:**
  1. `[automation]` **Ground** — receive the proposed security-config change + rationale +
     blast-radius, **cited + as-of** (A5).
  2. `[hybrid]` **Evaluate** — Roman reviews against the security baseline
     (`docs/security/unified-security-standard.md`) — conformance, least-privilege, dial-proof
     ceiling integrity.
  3. `[gui-step]` **GATE** — **human approves** any change to `always_gate` classes / autonomy
     ceilings (these are dial-proof — a config change to them is itself `always_gate`, A3: the dial
     never touches an `always_gate` step). Presented as the 4-part easy-button (A4). **HAND-OFF ← Mark gate.**
  4. `[automation]` **Apply** via the governed change path (rides Marshall's Change→Release for
     code/infra, **SEAM → Stream 06**; the prod change is `always_gate` on Marshall's executor, A2
     class-4 — not Roman's to actuate); record audit.
- **Driving policy:** inherits A2/A3/A4/A5 + TBD (#1586) + unified-security-standard.md (internal
  baseline, referenced not restated).
- **Realization:** Deputy-CISO playbook (#1548); `procedure-only`. **SEAM → Stream 06 (Marshall)** for
  the actual code/infra change-release.
- **Autonomy ceiling:** **L2 delegate-only**; ceiling/`always_gate` config changes are themselves
  `always_gate` (A3 — the autonomy dial cannot edit its own dial-proof floor).
- **Human-in-loop:** Mark. Dial-proof floor = any change touching the autonomy ceiling itself.
- **Substrate deps:** autopilot_policies/agent.yaml, gauntlet config (#1412), #1579
  change_freeze/rollback/standard-change, audit_log. **subject:** both. **Maps to:** #1548.

---

## D. Phoenix — BCDR / Backup & Recovery (ceiling L3; PRODUCTION restore always_gate; split OUT of NOC)

## OP-07-09 · Backup verification (backup-verification tracer)
- **Owner / Stream:** Phoenix / 07 (BCDR). **Archetype:** B4 audit-attest (internal — verify by
  read-back, A9c; the production *restore act* is OP-07-10's B8/B2).
- **Trigger:** Scheduled cadence OR a backup-job-completed event (Datto, M365, DB).
- **Terminal outcome:** Backup success verified + RPO/RTO evidence recorded; failures/aging flagged → report.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → route):
  1. `[automation]` **Scope + collect** — verify backup-job success across sources (Datto Endpoint +
     SaaS Backups, DB PITR availability, M365), **citing each source + as-of** (A5; on dormant Datto
     Client Mapping, say so rather than claiming verified, A5c). **L0/L3.**
  2. `[automation]` **Evaluate (read-back, A9c)** — sandbox **test-restore** a sample to confirm the
     backup actually restores (auto at L3, **sandbox only — never production**; close-on-verification,
     never close-on-job-success).
  3. `[automation]` **Compose** — compute RPO/RTO evidence; detect failures + aging backups.
  4. `[hybrid]` **Route** — flag failures/aging; **SEAM →** Cyrus (if failure looks like tampering) /
     Celeste (client advisory, Stream 08) / human+Datto (remediation — advisory, **no auto-remediate**,
     A11: Phoenix measures, human+Datto act).
- **Driving policy:** inherits A2/A4/A5/A9 + TBD (#1586) — backup / RPO-RTO policy.
- **Realization:** `icm/domains/bcdr/backup-verification/` (tracer, epic #1555).
- **Autonomy ceiling:** **L3** (verify + sandbox test-restore auto — internally reversible, A10 row 1).
  **`always_gate`:** PRODUCTION restore (separate workflow OP-07-10, no clean undo).
- **Human-in-loop:** Dexter (Phoenix's division CTO) + Mark for prod. Recedes to auto-verify +
  auto-sandbox-test; **always_gate floor** = any production restore.
- **Substrate deps:** Datto Client Mapping (per-client, dormant until mapped), DB PITR, M365 bronze,
  #119. **subject:** both. **Maps to:** #1555.

## OP-07-10 · Recovery / restore execution (production restore test + real restore) ⛔
- **Owner / Stream:** Phoenix / 07 (BCDR). **Archetype:** B8 provision-with-undo (sandbox/test
  restore, reversible) / **B2 gated-actuation** for the production restore — `always_gate` (A2
  class-4 production-destructive: a prod restore overwrites live state, no clean undo).
- **Trigger:** A verification failure requiring recovery, a DR event, OR a scheduled
  production-restore TEST.
- **Terminal outcome:** Data/workload restored (test or real) + restore validated; or restore
  declined with rationale.
- **Procedure Steps** (B2/B8: ground → plan → GATE → actuate → reconcile → log):
  1. `[hybrid]` **Ground + plan** — scope the restore (which backup point, what target, RPO target),
     **citing the backup-point + as-of** (A5); recommend a plan. Sandbox/test restores ride B8 behind
     an undo window (reversible); the prod restore peels off to its own gate (A10).
  2. `[gui-step]` ⛔ **GATE** — **human + Datto approve & execute** the production restore
     (`always_gate` — Phoenix recommends/orchestrates, does NOT auto-restore prod), presented as the
     4-part easy-button (drafted plan + cited RPO + one-click authorize + irreversibility/overwrite
     preview, A4). **HAND-OFF ↔ Mark + Datto.**
  3. `[automation]` **Reconcile (read-back, A9c)** — post-restore validation (data integrity,
     service health checks) to confirm the restore landed before declaring success; on partial
     failure **halt, no auto-rollback**, surface completed-vs-pending (A10).
  4. `[automation]` **Log** — record restore evidence + RTO actuals; **SEAM →** Roman (post-incident
     review OP-07-07 if incident-driven).
- **Driving policy:** inherits A2/A4/A5/A9/A10 + TBD (#1586) — DR runbook + restore-authority policy.
- **Realization:** BCDR playbook, separate workflow (sub-issue under #1555); `procedure-only`.
- **Autonomy ceiling:** **L3** for sandbox/test (reversible, A10 row 2); ⛔ **production restore
  `always_gate`** (A2 class-4, no clean undo → gated forever).
- **Human-in-loop:** Mark + Datto. Never recedes off prod-restore execution — dial-proof.
- **Substrate deps:** Datto, DB PITR, app redeploy path, disaster-recovery runbook
  (docs/disaster-recovery/). **subject:** both. **Maps to:** #1555.

## OP-07-11 · DR runbook authoring & drill (maintain the DR plan)
- **Owner / Stream:** Phoenix / 07 (BCDR). **Archetype:** B4 audit-attest (drift-detect + drill +
  maintain the **one uniform dual-audience runbook**, A8 — human-trainable + agent-executable from
  one source, Alivia-synced).
- **Trigger:** Scheduled DR-drill cadence OR a material change to infra/backup topology.
- **Terminal outcome:** DR runbook current + a drill executed/recorded with gaps filed.
- **Procedure Steps** (B4: scope → evaluate → compose → sign-off → route):
  1. `[automation]` **Scope** — detect topology/backup-config changes that stale the DR runbook,
     **cited + as-of** (A5). **L0/L2.**
  2. `[hybrid]` **Compose** — draft/update DR runbook steps (RPO/RTO targets per service) as the
     single dual-audience document (A8).
  3. `[gui-step]` **Sign-off** — human approves the runbook revision + schedules a drill (4-part
     easy-button, A4).
  4. `[hybrid]` **Route** — execute the drill (sandbox restore + failover rehearsal, auto where
     reversible; any prod failover is `always_gate`, A2 class-4); file gaps as issues. **SEAM →**
     Roman (governance, OP-07-07), Alivia (IT Glue SoT sync — **SEAM → Stream 10**).
- **Driving policy:** inherits A2/A4/A5/A8 + TBD (#1586) — DR / BCP policy.
- **Realization:** BCDR playbook (#1555); `procedure-only`. Runbook is a `docs/runbooks/`/IT-Glue
  artifact, Alivia-synced.
- **Autonomy ceiling:** **L3**; **production failover `always_gate`** (A2 class-4).
- **Human-in-loop:** Dexter/Mark. Recedes to auto-drift-detect + auto-draft; always_gate floor =
  approving the runbook + any prod failover.
- **Substrate deps:** infra topology, Datto, Alivia doc-sync (Stream 10), #389 (dormant).
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
- **Owner / Stream:** Cyrus / 07 (SOC, posture measurement — *owner gap, see note*). **Archetype:**
  B4 audit-attest (internal measure-only — the D8 ruling: Cyrus *measures*, never remediates, A11).
- **Trigger:** Quarterly schedule OR on-demand request (per account).
- **Terminal outcome:** Immutable `posture_snapshot` written per account — Imperion Secure Score
  (0–100) + every Posture Pillar's normalized result, stamped with Score Model version + grade
  (never recomputed).
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → route):
  1. `[automation]` **Scope + collect** — gather per-pillar data (M365 secure score, policy
     compliance, network, vulnerability, phishing, dark web) per account, **citing each pillar feed +
     as-of** (A5). **No-coverage pillar scores 0 → "No coverage", not failure** (A5b empty→honest, not
     fabricated). **L0.**
  2. `[automation]` **Evaluate** — compute Imperion Secure Score across pillars per the **current
     Score Model** (versioned weights, cited).
  3. `[automation]` **Compose** — write the immutable Posture Snapshot (Score Model version + grade
     frozen at capture; idempotent — re-capture writes a new immutable row, never mutates, A9).
  4. `[automation]` **Route** — **SEAM →** OP-07-13 (Golden State drift), OP-07-14 (Client Security
     Standard drift), Celeste (present — **SEAM Stream 08/10**). Cross-client benchmarking leaves only
     **anonymized/aggregated** (A7 — no client's score surfaces in another's view).
- **Driving policy:** inherits A2/A4/A5/A7 + TBD (#1586) — posture / Score Model policy.
- **Realization:** SOC posture playbook (harvested — UNFILED as a tracer; **flag: not in any current
  epic's tracer scope**); `procedure-only`.
- **Autonomy ceiling:** **L4** (measurement auto, fully reversible/read — A10 row 1); no remediation
  here. **Score Model *version change* `always_gate`** (governance, Roman — A11 the Standard-owner
  ratifies, not the measurer).
- **Human-in-loop:** Mark/Roman. Fully auto-capable; no always_gate (measure-only).
- **Substrate deps:** all 6 pillar feeds (M365 per-client app gates, Defender, dark-web, vuln,
  phishing — many deploy-dormant), Score Model store, #1578 alert/monitoring bronze. **subject:** both.

## OP-07-13 · Classify policy Golden State drift (per tenant) + DNS Golden State drift (per domain)
- **Owner / Stream:** Cyrus / 07 (SOC — *owner gap, see note*). **Archetype:** B4 audit-attest
  (internal measure — Cyrus classifies drift; the **baseline change is `always_gate`** and is the
  human/Standard-owner's, A11).
- **Trigger:** New observed config capture (policy or DNS) vs the human-approved Golden State; on
  schedule or on snapshot.
- **Terminal outcome:** Each observed policy/DNS record classified **compliant | drift | ungoverned |
  missing**; DNS governance verdict (`not-in-azure`→`in-azure-readonly`→`managed`) computed per domain.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → route):
  1. `[automation]` **Scope + collect** — capture observed policy config (per Customer Tenant) + DNS
     records (plane=azure via ARM + plane=public resolve), **citing capture source + as-of** (A5; on
     dormant LP #157 golden/drift merge, flag partial coverage, A5c). **L0.**
  2. `[automation]` **Evaluate** — full-outer-join captured vs Golden State per (account,
     tenant/domain) → classify compliant/drift/ungoverned/missing.
  3. `[automation]` **Compose** — compute the DNS governance verdict (managed = in-Azure +
     write-proven + live NS delegate).
  4. `[hybrid]` **Route** — surface drift; **Golden State *baseline approval/change* is human-gated**
     (`Set-ImperionDnsGoldenState` / policy Golden State — A11: Cyrus measures, the human owns the
     baseline; the 4-part easy-button is pre-staged, A4). **SEAM →** OP-07-14 / Celeste (present,
     Stream 08) / human+Datto (remediate — advisory).
- **Driving policy:** inherits A2/A4/A5 + TBD (#1586); ADR-0051 (golden/drift) + ADR-0063 (DNS) referenced.
- **Realization:** SOC/posture playbook; DNS golden/drift merge is **LP #157 (REMAINING, not yet
  shipped)** — partially dormant. `procedure-only`.
- **Autonomy ceiling:** **L4** (classify auto, read-only — A10 row 1); **Golden State baseline
  set/change `always_gate`** (human-approved baseline — A2: changing a governance baseline).
- **Human-in-loop:** Mark. Recedes to auto-classify; always_gate floor = approving/changing any Golden
  State baseline.
- **Substrate deps:** LP #157 (DNS golden/drift, REMAINING), ARM zone collector (shipped),
  public-resolve (shipped), account_domain registry, policy Golden State store. **subject:** both.

## OP-07-14 · Evaluate per-client conformance vs current Client Security Standard + draft remediation
- **Owner / Stream:** Cyrus / 07 measures → **Vera owns the Standard (SEAM Stream 10)** · **Celeste
  presents (SEAM Stream 08)** · human+Datto remediate. **Archetype:** B4 audit-attest (internal
  measure-only) — the **canonical A11 three-way seam**: Cyrus measures · Vera owns the Standard +
  ratification · Celeste presents · human+Datto remediate; none co-own.
- **Trigger:** New `posture_snapshot` for an account, OR a Client Security Standard version
  ratification (re-scores all clients).
- **Terminal outcome:** Per-client "get-back-in-shape" evaluation + **remediation recommendation
  (advisory only, NO auto-remediation)** produced and routed to Celeste for client presentation.
- **Procedure Steps** (B4: scope → evaluate → compose → route):
  1. `[automation]` **Scope** — measure the account's current posture_snapshot against the **current**
     Vera-owned Client Security Standard **version** (cited + as-of, A5). **L0.**
  2. `[automation]` **Evaluate** — produce the drift/get-back-in-shape evaluation + ranked remediation
     recommendations (each recommendation evidence-grounded, A5; cross-client patterns pooled
     internally only, A7).
  3. `[gui-step]` **Route** — human reviews (advisory; **no binding commitment — Celeste
     no-commits-ever ceiling**). **SEAM →** Celeste (present to client, Stream 08) → human + Datto
     (remediate).
  4. `[automation]` **Log** — record the evaluation; on Standard version change, re-score all clients
     (Standard **ratification itself = `always_gate`, Vera drafts / Mark ratifies — Stream 10**, A11:
     the Standard-owner ratifies, the measurer does not).
- **Driving policy:** inherits A2/A4/A5/A7 + TBD (#1586); Client Security Standard (Vera-owned,
  evolving baseline; distinct from the internal unified-security-standard.md).
- **Realization:** SOC posture playbook (`procedure-only`); the **Standard + ratification = Stream 10
  (Vera)**, NOT here.
- **Autonomy ceiling:** **L4** measure/recommend (read-only — A10 row 1); **remediation always
  advisory — no auto-remediation of client security at ANY level** (hard ceiling on client-security
  actuation; A11 obligation/action separation made absolute).
- **Human-in-loop:** Mark + Celeste + Datto. Measurement auto; **dial-proof floor = client-security
  remediation is never auto** (advisory forever).
- **Substrate deps:** posture_snapshot (OP-07-12), Vera Client Security Standard store (Stream 10),
  Celeste handoff bus (#991). **subject:** both.

---

## F. Grace + Roman — vendor risk (TPRM) & Imperion's own audit program (GRC; Grace L2 measure, external attestation/audit `always_gate`)

> **Distinction note.** These two are deliberately **NOT** the existing Grace procedures. OP-07-05
> (control-evidence sweep) + OP-07-06 (compliance attestation) measure Imperion's controls against a
> framework and file the resulting attestation; OP-07-15/16 below extend that surface in two
> orthogonal directions: **OP-07-15 turns the audit lens *outward* onto OUR vendors** (third-party
> security posture of the suppliers Imperion itself relies on) and **OP-07-16 runs the *end-to-end
> external-audit program* that produces the SOC 2 / ISO 27001 / CMMC certifications** (engagement
> lifecycle, evidence campaign, auditor liaison) — for which OP-07-06 is the per-control sign-off
> primitive. OP-07-15 is **also distinct from Vance's commercial vendor risk** (Stream 09/procurement:
> price/EOL/contract-commercial exposure, A11): Grace owns the *security/compliance* dimension of the
> same vendor; they meet at an explicit seam, never co-own.

## OP-07-15 · Assess third-party / vendor security risk (TPRM)
- **Owner / Stream:** Grace / 07 (GRC). **Archetype:** B4 audit-attest (**internal** measure — assess
  the security posture of OUR vendors; the B4 audience split: assessment/scoring auto-runs at L2, any
  *external assurance request* to a vendor or *attestation that a vendor is approved* parks).
- **Trigger:** A new vendor/subprocessor is onboarded (procurement seam ← Vance), a periodic
  reassessment cadence fires (per risk tier), OR a vendor security event (their breach, a CVE in their
  product, an expiring vendor SOC 2) lands.
- **Terminal outcome:** A persisted vendor security-risk assessment — posture/tier per vendor
  (critical/high/moderate/low), data-access + subprocessor exposure mapped, gaps + required
  remediations/contractual controls routed; the vendor's own attestation (SOC 2 / ISO / DPA) recorded
  by reference with an expiry to watch.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → route):
  1. `[automation]` **Scope + collect evidence** — enumerate Imperion's vendors/subprocessors and what
     data/access each holds, gather each vendor's security artifacts (their SOC 2 / ISO cert / pen-test
     summary / questionnaire response / DPA), **citing each artifact + as-of** (A5; on a missing or
     expired artifact say "no current attestation on file" rather than asserting compliant, A5b/c).
     **SEAM ← Vance (procurement, Stream 09)** for the vendor/contract record. **L0/L2.**
  2. `[automation]` **Evaluate** — score each vendor against the third-party-risk control set
     (data sensitivity × access × the vendor's attested controls) → risk tier; pool-correlate a shared
     vendor's posture/incident across the client base **internally only** (a vendor EOL/breach affecting
     many — A7), never surfacing one client's exposure in another's view.
  3. `[automation]` **Compose** — build the per-vendor gap report (missing controls, expiring
     attestations, required contractual safeguards), each finding evidence-referenced + as-of (A5),
     attributed P2.
  4. `[gui-step]` **Route** — human reviews tiers/gaps; **approving a vendor as in-policy, or sending a
     security-assurance request/questionnaire to a vendor, is `always_gate`** (an external commitment /
     assertion — A2 class-2/6; parks as the 4-part easy-button, A4). **SEAM →** Roman (governance
     escalation on a critical-vendor gap, OP-07-07/08) · Vance (commercial/contract action, Stream 09) ·
     Laurel (subprocessor → DPA/privacy register, **Stream 10**) · Celeste (if a vendor risk affects a
     specific client deliverable, advisory, Stream 08).
- **Driving policy:** inherits A2/A4/A5/A7 + `TBD (mark-blocker: company-policy-collection)` (D4, #1586)
  — third-party-risk / vendor-management policy + the TPRM control set → **POLICY GAP: TPRM control-set
  source not yet provided** (will map to the IMxxx info-sec canon, like OP-07-05).
- **Realization:** GRC vendor-risk playbook (sub-issue under #1557); `procedure-only` until built. No
  vendor-risk silver entity yet → **schema gap flagged to FE** (vendor security-assessment record);
  ships propose-only (A5c).
- **Autonomy ceiling:** **L2** (enumerate + score + gap-detect = reversible internal measure, A10 row 1);
  **`always_gate`: approving a vendor as in-policy + any outbound vendor-assurance request** (external
  assertion/commitment — A2 class-2/6).
- **Human-in-loop:** Mark/Roman. Recedes to auto-collect + auto-score + auto-gap-report; **always_gate
  floor** = the vendor-approval decision + any external assurance request. Ships L0 (A3).
- **Substrate deps:** vendor/contract record (Vance, Stream 09), #389 recall (dormant), #991 handoff bus,
  **schema gap (vendor security-assessment record)**, audit_log. **subject:** Imperion-self (OUR vendors)
  — dogfood `subject=imperion`; a client's own TPRM is the same procedure run with `subject=client`.
  **Maps to:** #1557.

## OP-07-16 · Run Imperion's own SOC 2 / ISO 27001 / CMMC audit program ⛔
- **Owner / Stream:** Grace (GRC, evidence + program clock) **+ Roman (Deputy CISO, governance + auditor
  liaison)** / 07. **Archetype:** B4 audit-attest (**external** — the audience split made absolute: the
  evidence campaign auto-runs at L2, but **engaging an external auditor / submitting the audit package /
  accepting a certification is `always_gate`, human-signed**, A2 class-2/6). A11: Grace runs the
  evidence/program clock, Roman governs + liaises, **the human signs/binds the external engagement** —
  none co-own the signature.
- **Trigger:** An audit/certification cycle opens (annual SOC 2 Type II window, ISO surveillance/recert,
  CMMC assessment) OR a customer/contract requires a named certification by a date.
- **Terminal outcome:** A managed audit engagement — control set scoped to the framework, evidence
  campaign run to completion, auditor liaised, and the certification/report achieved (or findings + a
  remediation plan filed), with every external commitment human-signed.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → sign-off → route):
  1. `[automation]` **Scope** — select the framework + control set (SOC 2 TSC / ISO 27001 Annex A / CMMC
     practices) and the audit period, **citing the framework version + period** (A5). **L1.**
  2. `[automation]` **Collect-evidence (the campaign)** — drive the recurring evidence pulls (reuses the
     OP-07-05 control-evidence sweep as its engine — audit-by-reference, **no client PII reproduced**,
     A7), tracking each control's evidence to ready/gap, each item cited + as-of (A5). **L2.**
  3. `[hybrid]` **Evaluate + remediate-plan** — Roman governs readiness vs the framework; gaps become
     tracked hardening items (never TODOs) routed via OP-07-08 (security-config change-control) /
     Marshall's Change→Release (**SEAM → Stream 06**). Pool prior-cycle findings internally (A7).
  4. `[gui-step]` ⛔ **Sign-off / engage** — **human signs**: engaging/authorizing the external auditor,
     submitting the audit package, and accepting the resulting attestation/certification are each
     `always_gate` (external assertion + binding engagement — A2 class-2/6; Grace assembles the complete
     package as the 4-part easy-button, Roman attests readiness, **the human binds**, A4/A11).
     **HAND-OFF ↔ Mark/Roman gate.**
  5. `[automation]` **Log + route** — record the certification/report + its validity window as an audit
     artifact (idempotency-keyed so a replay re-files no duplicate, A9b); set the recert/surveillance
     date as a watched deadline. **SEAM →** Laurel (cert feeds customer contracts/assurance, Stream 10) ·
     Celeste (certification available to present to clients, advisory, Stream 08) · the relevant C-suite
     synthesis-brief (Stream 11).
- **Driving policy:** inherits A2/A4/A5/A7 + TBD (#1586) — the compliance frameworks themselves
  (SOC 2 / ISO 27001 / CMMC mappings) → **POLICY GAP: framework control-set source not yet provided**
  (same gap as OP-07-05; this procedure is the program that consumes it).
- **Realization:** GRC audit-program playbook (sub-issue under #1557, with a Deputy-CISO governance seam
  to #1548); `procedure-only` until built. Builds on OP-07-05/06 (evidence engine + per-control sign-off
  primitive).
- **Autonomy ceiling:** **L2** (scope + evidence campaign + readiness eval auto = reversible internal,
  A10 row 1); ⛔ **`always_gate`: external auditor engagement + audit-package submission + certification
  acceptance** (external assertions/commitments, no clean undo on a filed audit package — A2 class-2/6,
  gated forever).
- **Human-in-loop:** Mark/Roman. Never recedes off the external-engagement/sign-off steps — dial-proof
  (the B4 external-attestation floor).
- **Substrate deps:** OP-07-05 evidence store + sweep engine, audit_log, #1548 (Roman governance seam),
  #991 handoff bus, ADR/issue tracker (hardening items), #119. **subject:** Imperion-self (dogfood
  `subject=imperion`) — a client's own certification program is the same procedure with `subject=client`.
  **Maps to:** #1557 (+ #1548 governance seam).

---

## Provable-coverage note

Protect→Assure surface fully covered: SOC alert→signal→containment→TI (OP-07-01…04), GRC
control-evidence + attestation (05/06), security ops-governance escalation/PIR + config change-control
(07/08, the latter seaming to Stream 06), BCDR backup-verify → recovery/restore → DR runbook+drill
(09/10/11), Security Posture Management — snapshot, Golden State + DNS drift, Client Security
Standard measurement (12/13/14, the D8 measure-only Cyrus assignment with the Vera/Celeste/human+Datto
seams), and the **vendor & own-audit GRC pair** — third-party/vendor security risk (TPRM, 15) +
Imperion's own SOC 2 / ISO / CMMC audit program (16, Grace+Roman, external engagement `always_gate`),
extending the 05/06 control-evidence surface outward (OUR vendors) and end-to-end (the certification
program), seaming to Vance (commercial vendor risk, Stream 09), Laurel (DPA/privacy + contract
assurance, Stream 10), and Marshall (hardening change-release, Stream 06). Roman's read-only
cross-division posture-brief synthesis is **excluded — it lives in Stream 11**.
This is the stream whose procedures will map most directly to the IMxxx info-sec policy canon once D4
policy collection lands; until then every Driving policy = TBD (#1586).

**Doctrine inheritance (ADR-0136):** every procedure names its archetype (B1–B9) and inherits A1–A11;
the stream is a canonical showcase of **A11 obligation/action separation** (the D8 three-way posture
seam — Cyrus measures, Vera owns the Standard, Celeste presents, human+Datto remediate, never
co-owning) and **A10 reversibility → derived ceiling** (the SOC reversible-vs-destructive containment
split in 03 and the prod-restore floor in 10). **A7 pool-never-bleed** governs every cross-client
threat correlation: pooled internally, surfaced only anonymized/aggregated. Per A5c, every procedure
that depends on a dormant substrate (#389 recall · #991 bus · #119 triggers · LP #157 DNS golden/drift ·
Datto Client Mapping · M365 per-client app gates) ships **propose-only** until its source hydrates.

**Count: 16 Operating Procedures** (Cyrus 7 = 4 SOC [01–04] + 3 posture-mgmt [12–14]; Grace 3 = 2
control-evidence/attestation [05/06] + TPRM [15]; Roman 2 ops-governance [07/08]; Phoenix 3 [09–11];
Grace+Roman 1 own-audit-program [16]) — Roman's synthesis brief excluded (Stream 11).
