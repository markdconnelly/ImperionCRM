# Stream 05 — Event → Resolution

> **Operating Procedure catalog stream file.** Part of [`../operating-procedure-catalog.md`](../operating-procedure-catalog.md);
> architecture [ADR-0133](../../decision-records/ADR-0133-operating-procedure-catalog.md). Terms
> **Operating Procedure** / **Procedure Step** are defined in [`CONTEXT.md`](../../../CONTEXT.md).
>
> **D9 global principles apply to every procedure below** (encoded in each Human-in-loop field,
> not restated per entry): **P1** Nova-native human co-working (every flow co-works with a human
> through Nova) · **P2** each sub-agent's reasoning is ascribed back to the paired human, up the
> chain · **P3** an "easy button" at every human gate (prep to the goal, hand the human a one-click
> resolution) · **P4** urgent → dedicated chat, else → tag the team member in the shared Teams chat.

**Owners:** **Ozzie** (NOC / monitoring, ladder ceiling **L4** — reversible auto under runbook+undo;
destructive/identity/client-facing `always_gate`) · **Sage** (L3/Escalation-Eng + Problem-Mgmt,
ceiling **L3** — deep diag + low-risk reversible fixes auto; prod/irreversible park). Epics: Ozzie
#1551 · Sage #1552 (both under #1534, milestone v1.0, `reports_to: Dexter`).
**Stream scope:** monitoring signal/alert → NOC alert-triage (dedupe/correlate/enrich) →
auto-remediation under runbook (Ozzie L4, undo window) OR incident declaration → escalate to L3
(Sage) → incident management (restore service) → problem management (root-cause / known-error /
permanent-fix proposal) → feeds Stream 06 Change (Marshall) for the fix and Stream 08 Engage
(Celeste) for the service-pattern Handoff.

**Design rule (never conflated):** **incident = restore service; problem = eliminate root cause.**
OP-05-01..07 restore service; OP-05-08/09 eliminate root cause.

**subject (every procedure):** runs on `subject: client` AND `subject: imperion` — Imperion's own
endpoints are monitored like any managed estate (dogfood is a parameter, not a duplicate, D7.2).

**Driving policy (every procedure):** `TBD (mark-blocker: company-policy-collection)` (D4, #1586).
Owed business documents: NOC/monitoring runbook policy · incident-management policy · severity/SLA
matrix · escalation policy · problem-management policy (Alivia → IT Glue).

**Ladder-ceiling floor (survives any dial, ADR-0128 dial-proof):** for BOTH owners — destructive
ops, identity/credential actions, client-facing comms, prod migrations, money are `always_gate` and
never auto-execute at any level. Human-in-loop recedes L1→L5; these stay parked forever.

**Substrate dormancy flags (apply across the stream):** 💤 **#119** trigger-sync (the whole
event→dispatch→agent loop is deploy-dormant) · 💤 **#991** event bus / cross-agent Handoff (Celeste
/ Marshall / Alivia seams degrade to note-only) · 💤 **#389** Voyage embeddings (TABLED — every
"similar past incident/problem" recall step degraded to declaration-pull) · `agent_event` inbox
(#998 / mig 0164) = **LIVE**, but 💤 **#1578** monitoring/NOC bronze feed missing (only live event
sources today: `autotask.ticket.created` + the Defender SOC seam) · 💤 **#1577** `problem`/`known_error`
silver missing (dropped from #373/ADR-0079, Change-only).

---

## OZZIE — NOC / Monitoring (ceiling L4)

## OP-05-01 · Triage a monitoring alert — *Ozzie's tracer (`alert-triage`, #1551)*
- **Owner / Stream:** Ozzie / 05.
- **Trigger:** a monitoring signal/alert arrives on the NOC alert inbox (RMM/Datto/UniFi/M365 health
  → `agent_event`), or a synthetic-check failure fires.
- **Terminal outcome:** the alert reaches a terminal disposition with an audit row — **suppressed**
  (noise/dedup), **auto-remediated** (→ OP-05-03), **incident declared** (→ OP-05-04), or **routed**
  (security → Cyrus / Stream 07; problem-candidate → Sage / OP-05-08).
- **Procedure Steps:**
  1. `[automation]` Ingest + dedupe: match against open alerts/incidents on the same CI; fold
     duplicates into a parent (dedup key). **L2.**
  2. `[automation]` Correlate: pull CI relationships (`okf:ci_relationship`, `okf:cmdb_ci_overlay`)
     to group co-firing alerts into one event + infer blast radius. **L2.**
  3. `[hybrid]` Enrich: CI criticality, owning account, recent changes (`okf:change_request` overlap),
     prior-incident context (semantic recall — **#389-dormant**). Human-on-loop below L3.
  4. `[automation]` Classify: noise | actionable-incident | security | problem-candidate (severity rubric).
  5. `[hybrid]` Disposition + hand-off: noise → suppress w/ reason; actionable+runbook+reversible →
     **OP-05-03**; actionable/no-runbook/irreversible/high-sev → **OP-05-04**; security → **Cyrus / Stream
     07** (`[gui-step]` confirm at low dial); recurring-cluster → **Sage / OP-05-08** (emit problem-candidate).
- **Driving policy:** TBD (#1586) — NOC monitoring & severity/SLA.
- **Realization:** `icm/domains/noc/alert-triage/` (ICM Workspace; tracer per #1551).
- **Autonomy ceiling:** L4. Triage/classify/dedupe/correlate auto from L2; suppression auto at L3;
  remediation/declare hand-offs carry their own ceilings. `always_gate`: client-facing notice,
  identity/credential enrichment read beyond scope.
- **Human-in-loop:** L1 reviews every classification+disposition; L2 auto-dedup/correlate, human
  approves disposition; L3 auto-suppress noise, human spot-checks; L4 full auto-triage, human reviews
  parked proposals. Floor: security-route confirm + client notice stay human. Pairing: NOC tech
  (Derek/Brandon; dogfood → Mark proxy).
- **Substrate deps:** `agent_event` (live), `ci_relationship`/`cmdb_ci_overlay` (live), recall
  **#389**, **#119**; **monitoring bronze feed = GAP (#1578)**. **subject:** both.

## OP-05-02 · Sweep monitoring health & surface coverage gaps
- **Owner / Stream:** Ozzie / 05.
- **Trigger:** scheduled (hourly/daily) NOC health sweep, or on-demand.
- **Terminal outcome:** a current NOC health picture + any **un-monitored CI / stale agent /
  silent-failure** gap surfaced as a flag (and a parked "monitor this CI" recommendation). Proactive
  "is everything reporting?" — distinct from OP-05-01's single-alert reaction.
- **Procedure Steps:**
  1. `[automation]` Enumerate monitored CIs vs the CMDB CI set; find CIs with no recent telemetry.
  2. `[automation]` Detect silent failures: agents stopped reporting, stale check timestamps.
  3. `[automation]` Score NOC health (per account + estate-wide); roll up.
  4. `[hybrid]` Surface gaps: emit "CI X unmonitored / agent Y silent" flags; propose onboarding the
     CI (parked recommendation — never auto-deploys an agent).
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/domains/noc/coverage-sweep/` (ICM Workspace).
- **Autonomy ceiling:** L4. Sweep + scoring auto from L2 (internal reversible). Deploying a monitoring
  agent / changing monitoring config = **destructive-config → `always_gate`**.
- **Human-in-loop:** L1–L2 reviews the gap list; L3+ auto-sweeps, human acts on parked "monitor this
  CI" proposals. Floor: any agent deploy / monitoring-config change.
- **Substrate deps:** CMDB CI union (live), monitoring bronze feed **(GAP #1578)**, #119. **subject:** both.

## OP-05-03 · Auto-remediate under a runbook (with undo) — the defining L4 procedure
- **Owner / Stream:** Ozzie / 05.
- **Trigger:** OP-05-01 classifies an actionable incident that **matches a vetted reversible runbook**
  (restart a hung service, clear a queue, recycle an app pool, re-trigger a failed backup job).
- **Terminal outcome:** the remediation **Sequence** runs (approve-once/run-all governed unit), the
  symptom clears OR it fails-at-N and parks; **service restored** OR **escalated to OP-05-04**. An
  **undo window** is open on the action (the L4 reversible-auto contract).
- **Procedure Steps:**
  1. `[automation]` Resolve the runbook Playbook for the alert signature; bind params (CI, account).
  2. `[automation]` Re-ground precondition (CI still alarmed, optimistic concurrency).
  3. `[hybrid]` Execute the reversible Sequence through the gauntlet (kill-switch → posture →
     tool-grant → scope/data_class → grounding → verifier → actuation-level → hard-ceiling →
     idempotency → egress → execute). Under L4 with undo; below L4 it **parks**.
  4. `[automation]` Verify the symptom cleared (post-action check / next telemetry); within the undo
     window, **auto-undo** if the action made it worse.
  5. `[automation]` Close-the-loop: clear/annotate on success; on failure/non-clear, **hand off to
     OP-05-04** with the attempted-remediation log.
- **Driving policy:** TBD (#1586) — runbook/remediation policy + the vetted runbook catalog itself.
- **Realization:** `icm/domains/noc/auto-remediate/` (Sequence/Playbook registry-backed).
- **Autonomy ceiling:** **L4 — the defining L4** (reversible-auto behind an undo window). `always_gate`
  (never auto): **destructive** (delete/wipe/reimage), **identity** (reset/disable account, MFA, CA),
  **client-facing** notice, **prod migration**. Irreversible steps park inside an otherwise-auto runbook
  (most-restrictive step sets the bar).
- **Human-in-loop:** L1 propose-only (all park); L2 auto internal-only steps; L3 auto low-risk standard
  restarts, execute-then-notify; L4 broad reversible auto w/ undo, human watches the undo window +
  handles parked irreversible steps. Floor: destructive/identity/client-facing human forever. Pairing:
  NOC/Service tech (Brandon/Derek; dogfood → Mark proxy).
- **Substrate deps:** vetted runbook/Sequence registry (backend, ADR-0081 governed sequences), gauntlet
  + verifier (#263 plane, **#119-dormant**), **undo endpoint (BE#345-class) = the load-bearing L4
  dependency, was open**. **subject:** both.

## OP-05-04 · Declare an incident & stand up incident management
- **Owner / Stream:** Ozzie / 05 (incident-commander seam to Sage on escalation).
- **Trigger:** OP-05-01 routes an actionable+high-sev/no-runbook event, OR OP-05-03 remediation failed,
  OR a human declares.
- **Terminal outcome:** an **incident record exists** (Autotask `ticket` = SoR; augment-not-replace),
  severity + owner + comms cadence set, and it is **owned** — Ozzie working a restore runbook or
  **escalated to Sage (OP-05-06)**. Distinct from "resolved" (OP-05-05).
- **Procedure Steps:**
  1. `[automation]` Create/locate the incident `ticket` in Autotask (SoR; gated executor,
     idempotency-keyed like the `task_ticket_fire` precedent).
  2. `[automation]` Set severity, affected CIs/account, link correlated alerts → the one incident.
  3. `[hybrid]` Comms cadence: post the **internal** incident work-note + status; any **client-facing**
     status update is `always_gate` (drafted, parked) `[gui-step]`.
  4. `[automation]` Assign ownership: keep with Ozzie if restore-runbook-eligible; else **hand-off →
     OP-05-06 (Sage L3)** with full triage + remediation log.
- **Driving policy:** TBD (#1586) — incident-management + severity/SLA + client-comms.
- **Realization:** `icm/domains/noc/declare-incident/` (ICM Workspace). Incident SoR = Autotask ticket
  (augment-not-replace, ADR-0042); the workspace orchestrates, the ticket records.
- **Autonomy ceiling:** L4. Create/sev/link/internal-note auto from L2–L3. `always_gate`: every
  **client-facing** status update; sev-1 declaration MAY be configured notify-then-park.
- **Human-in-loop:** L1 human declares + sets comms; L3 auto-create + internal note, human owns client
  comms; L4 auto-stand-up, human on client comms + escalation decision. Floor: client-facing comms
  always human. Pairing: incident commander (Derek; dogfood → Mark).
- **Substrate deps:** Autotask ticket write executor (gated, augment-not-replace),
  `defender_incident_ticket_link` precedent (security-origin), **#119-dormant**, **#991** (cross-agent
  escalation/Handoff). **subject:** both.

## OP-05-05 · Resolve & close an incident (verify before close)
- **Owner / Stream:** Ozzie / 05 (or Sage if she held it through OP-05-06/07).
- **Trigger:** a remediation/restore action reports the service is back, OR a human marks it restored.
- **Terminal outcome:** the incident `ticket` moves to **Resolved/Closed with a verification signal**
  (never close-on-claim — mirrors Felix "no close without verification"), a post-incident note written,
  and — if root-cause unknown/recurring — a **problem-candidate emitted to Sage (OP-05-08)**.
- **Procedure Steps:**
  1. `[automation]` Verify restore: independent post-restore check / clean telemetry window (not the
     remediation's own success claim). Fail → reopen, back to OP-05-03/04.
  2. `[automation]` Write the internal resolution work-note (symptom, action, restore evidence).
  3. `[hybrid]` Close the incident ticket (gated executor); any **client-facing** "resolved" notice is
     `always_gate` `[gui-step]`.
  4. `[automation]` If recurrence/unknown-root-cause → **hand-off → Sage OP-05-08** (problem-candidate)
     with the incident + correlation cluster. Else terminal.
- **Driving policy:** TBD (#1586).
- **Realization:** `icm/domains/noc/resolve-incident/` (ICM Workspace).
- **Autonomy ceiling:** L4. Verify + internal note auto; close auto at L3+ **only with verification
  signal present**; `always_gate` for client-facing resolved notice.
- **Human-in-loop:** L1–L2 human verifies + closes; L3+ auto-close on verification, human on client
  notice. Floor: close-without-verification is **refused** (not just gated); client comms always human.
- **Substrate deps:** verification signal source (telemetry / Felix-style verifier), Autotask close
  executor, #119, **#991** (Handoff to Sage/Celeste). **subject:** both.

---

## SAGE — L3 Escalation Engineering + Problem Management (ceiling L3)

## OP-05-06 · Work an escalated incident (L3 deep diagnosis & restore)
- **Owner / Stream:** Sage / 05.
- **Trigger:** Felix triage stage-05 emits an escalation handoff (identity/backup/DC or hard-symptom),
  OR Ozzie OP-05-04 hands off a high-sev/no-runbook incident.
- **Terminal outcome:** the incident is **diagnosed to a working hypothesis and either restored
  (low-risk reversible fix auto, L3) or a fix is proposed + parked** (prod/irreversible); ownership
  returns to OP-05-05 (resolve) or routes to a permanent fix via OP-05-08 — never left hanging.
- **Procedure Steps:**
  1. `[automation]` Load the full handoff dossier (Felix triage decision+log, or Ozzie incident +
     remediation log); re-ground (incident still open/unchanged).
  2. `[automation]` Deep diagnosis: trace across CIs, logs, recent changes (`okf:change_request`),
     similar past incidents (recall **#389-dormant**); adversarial verifier on the root-cause hypothesis
     (refute-by-default).
  3. `[hybrid]` Apply fix: low-risk **reversible** fix w/ runbook → **auto at L3** (execute-then-notify);
     **prod/irreversible/identity/backup/DC** → **draft + park** the fix Sequence `[gui-step]`.
  4. `[automation]` Verify restore (independent signal); hand back to OP-05-05 (resolve/close).
  5. `[automation]` If root-cause persists/recurs → **hand-off → OP-05-08 (open a problem)**.
- **Driving policy:** TBD (#1586) — escalation + change-control.
- **Realization:** `icm/domains/problem-mgmt/work-escalation/` (ICM Workspace).
- **Autonomy ceiling:** **L3** (Sage). Diag + low-risk reversible fixes auto; **prod/irreversible park**.
  `always_gate`: identity/backup/DC actions, prod migrations, destructive ops, client-facing comms.
- **Human-in-loop:** L1 propose every fix; L2 internal diag auto, fixes park; L3 low-risk reversible
  fixes auto w/ notify, higher-stakes park. Floor: identity/backup/DC/prod forever human. Pairing:
  senior/L3 engineer (Brandon/Luke; dogfood → Mark proxy).
- **Substrate deps:** Felix triage handoff (the seam, exists), verifier/critic (#263 plane), recall
  **#389-dormant**, **#119-dormant**. **subject:** both.

## OP-05-07 · Coordinate a major-incident bridge — *(lower-frequency / "rare", in-scope, bias-to-inclusion)*
- **Owner / Stream:** Sage / 05 (major-incident commander).
- **Trigger:** a sev-1 / multi-CI / multi-client major incident is declared (OP-05-04 at top severity).
- **Terminal outcome:** the major incident is **driven to restore under a coordinated bridge** — roles
  assigned, timeline captured, stakeholders updated on cadence — terminating in restore (→ OP-05-05) +
  a **mandatory problem hand-off (OP-05-08)** + PIR trigger.
- **Procedure Steps:**
  1. `[hybrid]` Stand up the bridge: assign incident roles (commander, comms, scribe); the agent keeps
     the **timeline** + work-note scribe role automatically. `[automation]` scribe / `[gui-step]` role assign.
  2. `[automation]` Maintain the running timeline + correlation picture; surface CI blast-radius.
  3. `[gui-step]` Stakeholder/client comms on cadence — **`always_gate`**, drafted + parked, human sends.
  4. `[automation]` On restore → OP-05-05; **always** emit problem-candidate (OP-05-08) + flag for PIR.
- **Driving policy:** TBD (#1586) — major-incident / comms.
- **Realization:** `icm/domains/problem-mgmt/major-incident/` (ICM Workspace).
- **Autonomy ceiling:** L3. Scribe/timeline/correlation auto; **all external/stakeholder comms
  `always_gate`**; role assignment is human-in-loop (judgment) at low dial.
- **Human-in-loop:** human is commander at every level; agent is scribe + analyst, recedes only on the
  analytical work. Floor: every stakeholder/client communication. Pairing: Derek/Mark.
- **Substrate deps:** timeline store (agent_run/work-notes), **#991** cross-agent Handoff, #119. **subject:** both.

## OP-05-08 · Investigate a problem (root-cause → known-error) — *Sage's tracer (`problem-investigation`, #1552)*
- **Owner / Stream:** Sage / 05.
- **Trigger:** a recurring-incident cluster (OP-05-01 problem-candidate), an OP-05-05/06/07 problem
  hand-off, OR a scheduled recurring-incident-pattern scan.
- **Terminal outcome:** a **problem record exists** with a documented **root cause** + a **known-error**
  entry (workaround + permanent-fix recommendation); resolved-by-known-error or **fed to Stream 06
  Change (Marshall)** for the permanent fix. **This is the "eliminate root cause" terminal — distinct
  from any incident restore.**
- **Procedure Steps:**
  1. `[automation]` Cluster: gather the incident set sharing a signature/CI/account; quantify recurrence.
  2. `[automation]` Root-cause analysis: trace CMDB relationships, change history (`okf:change_request`),
     config/telemetry, similar past problems (recall **#389-dormant**); adversarial verifier on the causal
     claim (refute-by-default).
  3. `[automation]` Record the **problem** + **known-error** (workaround + permanent-fix proposal).
     **⚠ SUBSTRATE GAP: `problem`/`known_error` silver does NOT exist (#1577)** — problem-management was
     *dropped* from #373/ADR-0079 (Change-only). Today this parks as an internal note/work-note only.
  4. `[hybrid]` Hand-off seams: **→ Marshall (Stream 06):** raise a `change_request` for the permanent
     fix (Sage proposes, Marshall governs); **→ Celeste (Stream 08):** emit a service-pattern Handoff
     (recurring problem on an account = relationship/QBR signal, **#991-dormant**); **→ Alivia (Stream
     10):** document the known-error / runbook (IT Glue SoT).
- **Driving policy:** TBD (#1586) — problem-management.
- **Realization:** `icm/domains/problem-mgmt/problem-investigation/` (tracer). **Realization blocked on
  `problem`/`known_error` schema (#1577)** — propose-only / note-only until that silver lands.
- **Autonomy ceiling:** L3. Cluster + RCA + record auto (internal reversible). The permanent-fix change
  is Marshall's `change_request` → governed in Stream 06 (`always_gate` per change-type there); Sage only
  *proposes* it. `always_gate` for any client-facing problem communication.
- **Human-in-loop:** L1 propose problem + RCA; L2–L3 auto cluster/RCA/record, human approves the
  known-error + the change hand-off. Floor: the permanent fix's actuation (Stream 06) + any client comms.
  Pairing: L3/problem engineer (Brandon/Luke; dogfood → Mark).
- **Substrate deps:** **`problem`/`known_error` silver = MISSING (#1577, the headline gap)**; CMDB
  relationships (live), `change_request` (live, Stream 06 seam), recall **#389-dormant**, **#991-dormant**
  Handoff, #119. **subject:** both.

## OP-05-09 · Run a post-incident review (PIR)
- **Owner / Stream:** Sage / 05.
- **Trigger:** an OP-05-07 major incident closes, OR an incident over a severity/duration threshold closes.
- **Terminal outcome:** a **PIR record** exists — timeline, root cause, what-went-well/-wrong, and
  **action items** (each routed: permanent fix → OP-05-08/Marshall; monitoring gap → Ozzie OP-05-02; doc
  → Alivia). Terminal = a reviewed PIR with owned, routed action items.
- **Procedure Steps:**
  1. `[automation]` Assemble the timeline + facts from `agent_run`/work-notes/incident ticket.
  2. `[automation]` Draft the PIR: contributing factors, root cause (from OP-05-08 if run), gaps.
  3. `[hybrid]` Human review/edit the PIR (blameless-review judgment) `[gui-step]`.
  4. `[automation]` Mint + route action items (problem → OP-05-08, monitoring → OP-05-02, change →
     Marshall, doc → Alivia). Any client-shared PIR summary is `always_gate`.
- **Driving policy:** TBD (#1586) — PIR / continual-improvement.
- **Realization:** `icm/domains/problem-mgmt/post-incident-review/` (ICM Workspace).
- **Autonomy ceiling:** L3. Assemble + draft auto; the review verdict is human; client-shared summary
  `always_gate`.
- **Human-in-loop:** human owns the review judgment at every level; agent assembles + drafts + routes.
  Floor: anything client-shared. Pairing: Sage's human (Brandon/Luke; Mark for dogfood).
- **Substrate deps:** `agent_run` timeline (live), action-item routing (**#991-dormant** for
  cross-agent), problem/known-error gap (OP-05-08, #1577), #119. **subject:** both.

---

## Provable-coverage note

Event→Resolution surface fully covered along the incident-vs-problem split. **Restore service**
(Ozzie): alert-triage (01), coverage sweep (02), auto-remediate-under-runbook (03 — the defining L4,
undo window), declare-incident (04), resolve-incident (05). **Eliminate root cause** (Sage):
work-escalation (06), major-incident bridge (07), investigate-problem (08), run-PIR (09). Tracers:
OP-05-01 (`alert-triage`) + OP-05-08 (`problem-investigation`). Both ladder ceilings exercised (L4
defining = OP-05-03; L3 = all Sage). Seams are hand-off **steps**, never duplicated procedures: Felix
stage-05 → OP-05-06 · OP-05-01 → Cyrus/Stream 07 · OP-05-08 → Marshall/Stream 06 · OP-05-05/07/08 →
Celeste/Stream 08 · OP-05-08/09 → Alivia/Stream 10. Headline gaps flagged in-line:
💤 **#1577** `problem`/`known_error` silver missing (OP-05-08 cannot persist a problem record);
💤 **#1578** monitoring/NOC bronze feed missing (OP-05-01/02/03 dormant); L4 undo endpoint (BE#345-class)
load-bearing for OP-05-03; #389/#991/#119 dormancies degrade recall + Handoff + dispatch.

**Count: 9 Operating Procedures** (Ozzie 5: OP-05-01..05 · Sage 4: OP-05-06..09).
