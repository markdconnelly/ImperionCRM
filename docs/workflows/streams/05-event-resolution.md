# Stream 05 — Event → Resolution

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

**Owners:** **Ozzie** (NOC / monitoring, ladder ceiling **L4** — reversible auto under runbook+undo;
destructive/identity/client-facing `always_gate`) · **Sage** (L3/Escalation-Eng + Problem-Mgmt,
ceiling **L3** — deep diag + low-risk reversible fixes auto; prod/irreversible park). Epics: Ozzie
#1551 · Sage #1552 (both under #1534, milestone v1.0, `reports_to: Dexter`).
**Stream scope:** monitoring signal/alert → NOC alert-triage (dedupe/correlate/enrich) →
auto-remediation under runbook (Ozzie L4, undo window) OR incident declaration → escalate to L3
(Sage) → incident management (restore service) → problem management (root-cause / known-error /
permanent-fix proposal) → feeds Stream 06 Change (Marshall) for the fix and Stream 08 Engage
(Celeste) for the service-pattern Handoff.

**Core design rule (incident ≠ problem, never conflated).** **incident = restore service; problem =
eliminate root cause.** OP-05-01..07 restore service; OP-05-08/09 eliminate root cause. This is also
the stream's clean showcase of doctrine **A11 (obligation/action separation)** twice over: (1)
Ozzie's NOC L4 is **reversible-auto behind an undo window** (the defining L4 — OP-05-03), but the
*irreversible* row of the A10 reversibility table (destructive/identity/client-facing) stays
`always_gate` on whoever actuates; (2) Sage owns the *problem clock* (eliminate root cause) while the
*permanent fix* is a `change_request` governed in Stream 06 (Marshall) — she proposes, Marshall
governs, the executor actuates. They meet at explicit seams (OP-05-08 → Marshall), never co-own.

**Seams (every cross-agent hand-off is an explicit Procedure Step, A11):** triage-in from Felix
(stage-05 escalation → OP-05-06); security-route-out → Cyrus / Stream 07 (OP-05-01); change-out →
Marshall / Stream 06 (OP-05-08 permanent fix); relationship/service-pattern-out → Celeste / Stream
08 (OP-05-05/07/08); runbook/known-error-out → Alivia / Stream 10 (OP-05-08/09).

**Ladder-ceiling floor (survives any dial, ADR-0128 dial-proof; = the A2 universal `always_gate`
set + A10 irreversible row):** for BOTH owners — destructive ops, identity/credential actions,
client-facing comms, prod migrations, money are `always_gate` and never auto-execute at any level.
Human-in-loop recedes L1→L5 (A3 ship-dial = L0); these stay parked forever (A10: no clean undo ⇒
gated).

**subject (every procedure):** runs on `subject: client` AND `subject: imperion` — Imperion's own
endpoints are monitored like any managed estate (dogfood is a parameter, not a duplicate, D7.2 / A8).

**Driving policy (every procedure):** inherits the doctrine universal baseline (ADR-0136 A2/A4/A5)
+ `TBD (mark-blocker: company-policy-collection)` for the 1–3 specific drivers (D4, #1586). Owed
business documents (Alivia → IT Glue): NOC/monitoring runbook policy · incident-management policy ·
severity/SLA matrix · escalation policy · problem-management policy.

**Archetype map (B-templates this stream instantiates).**

| Procedure | Archetype |
|---|---|
| OP-05-01 triage a monitoring alert | **B1 triage/route** |
| OP-05-02 sweep monitoring coverage | **B4 audit-attest** (measure/score, internal) |
| OP-05-03 auto-remediate under runbook ⛔ | **B2 gated-actuation** — the **L4 reversible-auto-behind-undo SHOWCASE** |
| OP-05-04 declare incident | **B2 gated-actuation** |
| OP-05-05 resolve & close incident | **B2 gated-actuation** (verify-before-close) |
| OP-05-06 work escalated incident | **B2 gated-actuation** |
| OP-05-07 coordinate major incident | **B2 gated-actuation** (commander = human, A11) |
| OP-05-08 investigate problem → known-error | **B4 audit-attest** (RCA + record) |
| OP-05-09 run a PIR | **B4 audit-attest** (verify + emit + route) |

**Substrate dormancy flags (apply across the stream; per A5c deepened steps that depend on these
ship propose-only / note-only until built):** 💤 **#119** trigger-sync (the whole
event→dispatch→agent loop is deploy-dormant) · 💤 **#991** event bus / cross-agent Handoff (Celeste
/ Marshall / Alivia seams degrade to note-only) · 💤 **#389** Voyage embeddings (TABLED — every
"similar past incident/problem" recall step degraded to declaration-pull) · `agent_event` inbox
(#998 / mig 0164) = **LIVE**, but 💤 **#1578** monitoring/NOC bronze feed missing (only live event
sources today: `autotask.ticket.created` + the Defender SOC seam) · 💤 **#1577** `problem`/`known_error`
silver missing (dropped from #373/ADR-0079, Change-only).

---

## OZZIE — NOC / Monitoring (ceiling L4)

## OP-05-01 · Triage a monitoring alert — *Ozzie's tracer (`alert-triage`, #1551)*
- **Owner / Stream:** Ozzie / 05. **Archetype:** B1 triage/route.
- **Trigger:** a monitoring signal/alert arrives on the NOC alert inbox (RMM/Datto/UniFi/M365 health
  → `agent_event`), or a synthetic-check failure fires.
- **Terminal outcome:** the alert reaches a terminal disposition with an audit row — **suppressed**
  (noise/dedup), **auto-remediated** (→ OP-05-03), **incident declared** (→ OP-05-04), or **routed**
  (security → Cyrus / Stream 07; problem-candidate → Sage / OP-05-08).
- **Procedure Steps** (B1: ground → classify → resolve-owner → disposition → log):
  1. `[automation]` **Ground** — ingest + dedupe: match against open alerts/incidents on the same CI,
     **citing the source event + as-of** (A5); empty/unparseable → park. Fold duplicates into a parent
     (dedup key). **L2.**
  2. `[automation]` **Correlate (resolve owner)** — pull CI relationships (`` `okf:ci_relationship` ``,
     `` `okf:cmdb_ci_overlay` ``) to group co-firing alerts into one event + infer blast radius;
     cross-client correlation is **internal-only** (A7, never surfaced into another client's context). **L2.**
  3. `[hybrid]` **Enrich** — CI criticality, owning account, recent changes (`` `okf:change_request` ``
     overlap), prior-incident context (semantic recall — **#389-dormant**, declaration-pull per A5c).
     Human-on-loop below L3.
  4. `[automation]` **Classify** — noise | actionable-incident | security | problem-candidate (severity rubric).
  5. `[hybrid]` **Disposition + log** — noise → suppress w/ reason; actionable+runbook+reversible →
     **OP-05-03**; actionable/no-runbook/irreversible/high-sev → **OP-05-04**; security → **SEAM →
     Cyrus / Stream 07** (B1 carve-out: a high-risk security route emits a proposal that *parks* — `[gui-step]`
     confirm at low dial); recurring-cluster → **SEAM → Sage / OP-05-08** (emit problem-candidate).
- **Autonomy ceiling:** **L4.** Mechanical triage/classify/dedupe/correlate **auto-executes at L2**
  (B1 — internally reversible, A10 row 1); suppression auto at L3; remediation/declare hand-offs carry
  their own ceilings. **`always_gate` (inherited A2 + delta):** client-facing notice (class-2),
  identity/credential enrichment read beyond scope; security-route confirm parks (B1 carve-out).
- **Human-in-loop:** L1 reviews every classification+disposition; L2 auto-dedup/correlate, human
  approves disposition; L3 auto-suppress noise, human spot-checks; L4 full auto-triage, human reviews
  parked proposals. Floor: security-route confirm + client notice stay human (A3 ship-dial = L0).
  Pairing: NOC tech (Derek/Brandon; dogfood → Mark proxy).
- **Substrate deps:** `agent_event` (live), `ci_relationship`/`cmdb_ci_overlay` (live), recall
  **#389**, **#119**; **monitoring bronze feed = GAP (#1578)**. **subject:** both.

## OP-05-02 · Sweep monitoring health & surface coverage gaps
- **Owner / Stream:** Ozzie / 05. **Archetype:** B4 audit-attest (internal — measure + score coverage,
  no external attestation).
- **Trigger:** scheduled (hourly/daily) NOC health sweep, or on-demand.
- **Terminal outcome:** a current NOC health picture + any **un-monitored CI / stale agent /
  silent-failure** gap surfaced as a flag (and a parked "monitor this CI" recommendation). Proactive
  "is everything reporting?" — distinct from OP-05-01's single-alert reaction.
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → route-gaps):
  1. `[automation]` **Scope + collect evidence** — enumerate monitored CIs vs the CMDB CI set,
     **citing each CI + telemetry as-of** (A5); find CIs with no recent telemetry. **L2.**
  2. `[automation]` **Collect (silent-failure detection)** — agents stopped reporting, stale check
     timestamps; an empty/missing feed is reported as a gap, never assumed healthy (A5b/A5c).
  3. `[automation]` **Evaluate** — score NOC health (per account + estate-wide); roll up. Pool-correlate
     coverage patterns across the base internally only (A7).
  4. `[hybrid]` **Compose + route-gaps** — emit "CI X unmonitored / agent Y silent" flags; propose
     onboarding the CI as a **parked recommendation** (the easy-button: the drafted "monitor this CI"
     action + its grounded why + one-click deploy — A4); **never auto-deploys an agent.**
- **Autonomy ceiling:** **L4.** Sweep + scoring auto from L2 (internal reversible, A10 row 1).
  **`always_gate`:** deploying a monitoring agent / changing monitoring config = **destructive-config**
  (A2 class-4, no clean undo on a client estate → gated forever, A10).
- **Human-in-loop:** L1–L2 reviews the gap list; L3+ auto-sweeps, human acts on parked "monitor this
  CI" proposals. Floor: any agent deploy / monitoring-config change (A3).
- **Substrate deps:** CMDB CI union (live), monitoring bronze feed **(GAP #1578)**, #119. **subject:** both.

## OP-05-03 · Auto-remediate under a runbook (with undo) — the defining L4 procedure ⛔
- **Owner / Stream:** Ozzie / 05. **Archetype:** B2 gated-actuation — **the stream's L4
  reversible-auto-behind-an-undo-window SHOWCASE** (A10 row 2: externally reversible, clean undo →
  declare undo **+ undo window** → max ceiling L4).
- **Trigger:** OP-05-01 classifies an actionable incident that **matches a vetted reversible runbook**
  (restart a hung service, clear a queue, recycle an app pool, re-trigger a failed backup job).
- **Terminal outcome:** the remediation **Sequence** runs (approve-once/run-all governed unit), the
  symptom clears OR it fails-at-N and parks; **service restored** OR **escalated to OP-05-04**. An
  **undo window** is open on the action (the L4 reversible-auto contract, A10).
- **Procedure Steps** (B2: ground → plan → GATE → actuate → reconcile → log):
  1. `[automation]` **Ground** — resolve the runbook Playbook for the alert signature; bind params
     (CI, account), **citing the matched signature + as-of**; re-ground the precondition (CI still
     alarmed, optimistic concurrency); drifted → re-park (A5). **L2.**
  2. `[automation]` **Plan** — assemble the reversible Sequence as a ProposedAction (ADR-0081),
     **declaring the undo + its undo window** (the A10 contract) and verification criteria up-front. **L2.**
  3. `[hybrid]` **GATE / Actuate** — execute through the gauntlet (kill-switch → posture → tool-grant →
     scope/data_class → grounding → verifier → actuation-level → hard-ceiling → idempotency → egress →
     execute). Each actuating write is **idempotency-keyed** (procedure+CI+intent — replay = no-op +
     audit note, A9b). **Under L4 with undo; below L4 it parks.** Irreversible steps park inside an
     otherwise-auto runbook (most-restrictive step sets the bar, A10).
  4. `[automation]` **Reconcile (read-back, A9c)** — verify the symptom cleared (post-action check /
     next telemetry, not the action's own success claim); **within the undo window, auto-undo** if the
     action made it worse. **Failure contract: halt, NO auto-rollback** beyond the declared undo —
     surface completed-vs-pending, hand to OP-05-04 (A10).
  5. `[automation]` **Log + close-the-loop** — clear/annotate on success; on failure/non-clear,
     **SEAM → OP-05-04** with the attempted-remediation log (attributed up-chain, P2).
- **Autonomy ceiling:** **L4 — the defining L4** (reversible-auto behind an undo window, A10 row 2).
  **`always_gate` (never auto, A2 + A10 irreversible row):** **destructive** (delete/wipe/reimage),
  **identity** (reset/disable account, MFA, CA), **client-facing** notice, **prod migration**. These
  park inside an otherwise-auto runbook.
- **Human-in-loop:** L1 propose-only (all park); L2 auto internal-only steps; L3 auto low-risk standard
  restarts, execute-then-notify; L4 broad reversible auto w/ undo, human watches the undo window +
  handles parked irreversible steps. Floor: destructive/identity/client-facing human forever (A3).
  Pairing: NOC/Service tech (Brandon/Derek; dogfood → Mark proxy).
- **Substrate deps:** vetted runbook/Sequence registry (backend, ADR-0081 governed sequences), gauntlet
  + verifier (#263 plane, **#119-dormant**), **undo endpoint (BE#345-class) = the load-bearing L4
  dependency**. **subject:** both.

## OP-05-04 · Declare an incident & stand up incident management
- **Owner / Stream:** Ozzie / 05 (incident-commander seam to Sage on escalation). **Archetype:** B2
  gated-actuation (the actuation = creating/owning the incident record; client comms peel off to their gate).
- **Trigger:** OP-05-01 routes an actionable+high-sev/no-runbook event, OR OP-05-03 remediation failed,
  OR a human declares.
- **Terminal outcome:** an **incident record exists** (Autotask `ticket` = SoR; augment-not-replace),
  severity + owner + comms cadence set, and it is **owned** — Ozzie working a restore runbook or
  **escalated to Sage (OP-05-06)**. Distinct from "resolved" (OP-05-05).
- **Procedure Steps** (B2: ground → plan → actuate → reconcile → log):
  1. `[automation]` **Ground + actuate (external SoR, A9a)** — create/locate the incident `ticket` in
     Autotask (SoR; the agent mirrors, never owns); **idempotency-keyed** like the `task_ticket_fire`
     precedent (replay = no-op + audit note, A9b); cite the source alerts + as-of (A5). **L2.**
  2. `[automation]` **Plan** — set severity, affected CIs/account, link correlated alerts → the one incident.
  3. `[hybrid]` **Comms cadence** — post the **internal** incident work-note + status; any
     **client-facing** status update peels off to its own gate (`always_gate`, A2 class-2: drafted,
     parked) `[gui-step]`.
  4. `[automation]` **Reconcile + assign ownership** — read back the ticket landed (A9c); keep with
     Ozzie if restore-runbook-eligible; else **SEAM → OP-05-06 (Sage L3)** with full triage +
     remediation log.
- **Autonomy ceiling:** **L4.** Create/sev/link/internal-note auto from L2–L3 (reversible internal +
  idempotent external write). **`always_gate`:** every **client-facing** status update (class-2);
  sev-1 declaration MAY be configured notify-then-park (A6: a sev-high incident is computed-urgent →
  dedicated chat).
- **Human-in-loop:** L1 human declares + sets comms; L3 auto-create + internal note, human owns client
  comms; L4 auto-stand-up, human on client comms + escalation decision. Floor: client-facing comms
  always human (A3).
  Pairing: incident commander (Derek; dogfood → Mark).
- **Substrate deps:** Autotask ticket write executor (gated, augment-not-replace),
  `defender_incident_ticket_link` precedent (security-origin), **#119-dormant**, **#991** (cross-agent
  escalation/Handoff). **subject:** both.

## OP-05-05 · Resolve & close an incident (verify before close)
- **Owner / Stream:** Ozzie / 05 (or Sage if she held it through OP-05-06/07). **Archetype:** B2
  gated-actuation — the **close-on-verification** invariant (A9c) is load-bearing.
- **Trigger:** a remediation/restore action reports the service is back, OR a human marks it restored.
- **Terminal outcome:** the incident `ticket` moves to **Resolved/Closed with a verification signal**
  (never close-on-claim — mirrors Felix "no close without verification"), a post-incident note written,
  and — if root-cause unknown/recurring — a **problem-candidate emitted to Sage (OP-05-08)**.
- **Procedure Steps** (B2: ground → actuate → reconcile → log):
  1. `[automation]` **Ground / verify-restore (A9c)** — independent post-restore check / clean
     telemetry window (NOT the remediation's own success claim), cited + as-of (A5). Fail → reopen,
     back to OP-05-03/04. **L2.**
  2. `[automation]` **Log** — write the internal resolution work-note (symptom, action, restore evidence).
  3. `[hybrid]` **Actuate (gated close)** — close the incident ticket (external SoR, idempotent, A9);
     any **client-facing** "resolved" notice is **`always_gate`** (A2 class-2) `[gui-step]`.
  4. `[automation]` **Reconcile + route** — if recurrence/unknown-root-cause → **SEAM → Sage OP-05-08**
     (problem-candidate) with the incident + correlation cluster (the incident≠problem boundary). Else terminal.
- **Autonomy ceiling:** **L4.** Verify + internal note auto; close auto at L3+ **only with verification
  signal present**; **`always_gate`** for client-facing resolved notice (class-2).
- **Human-in-loop:** L1–L2 human verifies + closes; L3+ auto-close on verification, human on client
  notice. Floor: close-without-verification is **refused** (A5/A9c — not just gated); client comms
  always human (A3).
- **Substrate deps:** verification signal source (telemetry / Felix-style verifier), Autotask close
  executor, #119, **#991** (Handoff to Sage/Celeste). **subject:** both.

---

## SAGE — L3 Escalation Engineering + Problem Management (ceiling L3)

## OP-05-06 · Work an escalated incident (L3 deep diagnosis & restore)
- **Owner / Stream:** Sage / 05. **Archetype:** B2 gated-actuation (deep diag → reversible fix auto;
  irreversible park).
- **Trigger:** Felix triage stage-05 emits an escalation handoff (identity/backup/DC or hard-symptom),
  OR Ozzie OP-05-04 hands off a high-sev/no-runbook incident.
- **Terminal outcome:** the incident is **diagnosed to a working hypothesis and either restored
  (low-risk reversible fix auto, L3) or a fix is proposed + parked** (prod/irreversible); ownership
  returns to OP-05-05 (resolve) or routes to a permanent fix via OP-05-08 — never left hanging.
- **Procedure Steps** (B2: ground → plan → GATE → actuate → reconcile → log):
  1. `[automation]` **Ground** — load the full handoff dossier (Felix triage decision+log, or Ozzie
     incident + remediation log), **citing the seam + as-of**; re-ground (incident still open/unchanged) (A5). **SEAM ← Felix stage-05 / Ozzie OP-05-04.**
  2. `[automation]` **Plan (deep diagnosis)** — trace across CIs, logs, recent changes
     (`` `okf:change_request` ``), similar past incidents (recall **#389-dormant**, declaration-pull
     per A5c); adversarial verifier on the root-cause hypothesis (refute-by-default).
  3. `[hybrid]` **GATE / Actuate** — low-risk **reversible** fix w/ runbook → **auto at L3**
     (execute-then-notify, A10 row 2); **prod/irreversible/identity/backup/DC** → **draft + park** the
     fix Sequence (easy-button: drafted fix + grounded why + one-click + consequence preview, A4) `[gui-step]`.
  4. `[automation]` **Reconcile** — verify restore (independent signal, A9c); **failure halts, no
     auto-rollback** (A10); hand back to OP-05-05 (resolve/close).
  5. `[automation]` **Log + route** — if root-cause persists/recurs → **SEAM → OP-05-08 (open a problem)**.
- **Autonomy ceiling:** **L3** (Sage). Diag + low-risk reversible fixes auto (A10 row 1/2);
  **prod/irreversible park.** **`always_gate`:** identity/backup/DC actions, prod migrations,
  destructive ops, client-facing comms (A2 + A10 irreversible row).
- **Human-in-loop:** L1 propose every fix; L2 internal diag auto, fixes park; L3 low-risk reversible
  fixes auto w/ notify, higher-stakes park. Floor: identity/backup/DC/prod forever human (A3). Pairing:
  senior/L3 engineer (Brandon/Luke; dogfood → Mark proxy).
- **Substrate deps:** Felix triage handoff (the seam, exists), verifier/critic (#263 plane), recall
  **#389-dormant**, **#119-dormant**. **subject:** both.

## OP-05-07 · Coordinate a major-incident bridge — *(lower-frequency / "rare", in-scope, bias-to-inclusion)*
- **Owner / Stream:** Sage / 05 (major-incident commander). **Archetype:** B2 gated-actuation — but
  the **human is commander (A11 obligation/action separation)**: the agent is scribe + analyst, every
  stakeholder/client comm is `always_gate`.
- **Trigger:** a sev-1 / multi-CI / multi-client major incident is declared (OP-05-04 at top severity).
- **Terminal outcome:** the major incident is **driven to restore under a coordinated bridge** — roles
  assigned, timeline captured, stakeholders updated on cadence — terminating in restore (→ OP-05-05) +
  a **mandatory problem hand-off (OP-05-08)** + PIR trigger.
- **Procedure Steps** (B2 shape; actuation = scribe/timeline only, comms peel to their gate):
  1. `[hybrid]` **Ground / stand up the bridge** — assign incident roles (commander, comms, scribe);
     the agent keeps the **timeline** + work-note scribe role automatically, cited + as-of (A5).
     `[automation]` scribe / `[gui-step]` role assign.
  2. `[automation]` **Maintain** the running timeline + correlation picture; surface CI blast-radius
     (cross-client correlation internal-only, A7).
  3. `[gui-step]` **SEND GATE** — stakeholder/client comms on cadence are **`always_gate`** (A2
     class-2), drafted + parked, human sends; **urgency computed** (sev-1 blocking restore = urgent →
     dedicated chat, A6).
  4. `[automation]` **Reconcile + route** — on restore → OP-05-05; **always** emit problem-candidate
     (**SEAM → OP-05-08**) + flag for PIR.
- **Autonomy ceiling:** **L3.** Scribe/timeline/correlation auto; **all external/stakeholder comms
  `always_gate`** (A2 class-2); role assignment is human-in-loop (judgment) at low dial.
- **Human-in-loop:** human is commander at every level (A11 — owns the bridge clock); agent is scribe +
  analyst, recedes only on the analytical work. Floor: every stakeholder/client communication (A3).
  Pairing: Derek/Mark.
- **Substrate deps:** timeline store (agent_run/work-notes), **#991** cross-agent Handoff, #119. **subject:** both.

## OP-05-08 · Investigate a problem (root-cause → known-error) — *Sage's tracer (`problem-investigation`, #1552)*
- **Owner / Stream:** Sage / 05. **Archetype:** B4 audit-attest (internal — cluster + RCA + record +
  route; the permanent fix is *asserted* to Marshall, never actuated here).
- **Trigger:** a recurring-incident cluster (OP-05-01 problem-candidate), an OP-05-05/06/07 problem
  hand-off, OR a scheduled recurring-incident-pattern scan.
- **Terminal outcome:** a **problem record exists** with a documented **root cause** + a **known-error**
  entry (workaround + permanent-fix recommendation); resolved-by-known-error or **fed to Stream 06
  Change (Marshall)** for the permanent fix. **This is the "eliminate root cause" terminal — distinct
  from any incident restore.**
- **Procedure Steps** (B4: scope → collect-evidence → evaluate → compose → route):
  1. `[automation]` **Scope (cluster)** — gather the incident set sharing a signature/CI/account;
     quantify recurrence, **citing each incident + as-of** (A5). **L2.**
  2. `[automation]` **Collect + evaluate (RCA)** — trace CMDB relationships, change history
     (`` `okf:change_request` ``), config/telemetry, similar past problems (recall **#389-dormant**,
     declaration-pull per A5c); adversarial verifier on the causal claim (refute-by-default); pool-correlate
     similar problems across the base internally only (A7).
  3. `[automation]` **Compose** — record the **problem** + **known-error** (workaround + permanent-fix
     proposal). **⚠ SUBSTRATE GAP: `problem`/`known_error` silver does NOT exist (#1577)** — problem-mgmt
     was *dropped* from #373/ADR-0079 (Change-only). Per A5c this **parks as an internal note/work-note
     only** until that silver lands.
  4. `[hybrid]` **Route (hand-off seams)** — **SEAM → Marshall (Stream 06):** raise a `change_request`
     for the permanent fix (**Sage proposes, Marshall governs** — A11 obligation/action separation: the
     fix's actuation is `always_gate` in Stream 06, never Sage's); **SEAM → Celeste (Stream 08):** emit a
     service-pattern Handoff (recurring problem on an account = relationship/QBR signal, **#991-dormant**);
     **SEAM → Alivia (Stream 10):** document the known-error / runbook (IT Glue SoT, the one uniform
     dual-audience document, A8).
- **Autonomy ceiling:** **L3.** Cluster + RCA + record auto (internal reversible, A10 row 1). The
  permanent-fix change is Marshall's `change_request` → governed in Stream 06 (`always_gate` per
  change-type there); **Sage only proposes** it (A11). **`always_gate`** for any client-facing problem
  communication (A2 class-2).
- **Human-in-loop:** L1 propose problem + RCA; L2–L3 auto cluster/RCA/record, human approves the
  known-error + the change hand-off. Floor: the permanent fix's actuation (Stream 06) + any client comms (A3).
  Pairing: L3/problem engineer (Brandon/Luke; dogfood → Mark).
- **Substrate deps:** **`problem`/`known_error` silver = MISSING (#1577, the headline gap)**; CMDB
  relationships (live), `change_request` (live, Stream 06 seam), recall **#389-dormant**, **#991-dormant**
  Handoff, #119. **subject:** both.

## OP-05-09 · Run a post-incident review (PIR)
- **Owner / Stream:** Sage / 05. **Archetype:** B4 audit-attest (internal — assemble + verify + emit +
  route action items; the review verdict is the human's).
- **Trigger:** an OP-05-07 major incident closes, OR an incident over a severity/duration threshold closes.
- **Terminal outcome:** a **PIR record** exists — timeline, root cause, what-went-well/-wrong, and
  **action items** (each routed: permanent fix → OP-05-08/Marshall; monitoring gap → Ozzie OP-05-02; doc
  → Alivia). Terminal = a reviewed PIR with owned, routed action items.
- **Procedure Steps** (B4: scope → collect-evidence → compose → sign-off → route):
  1. `[automation]` **Scope + collect** — assemble the timeline + facts from `agent_run`/work-notes/
     incident ticket, **citing each source + as-of** (A5). **L2.**
  2. `[automation]` **Compose** — draft the PIR: contributing factors, root cause (from OP-05-08 if run),
     gaps; no fabricated cause on empty recall (A5b).
  3. `[hybrid]` **Sign-off** — human review/edit the PIR (blameless-review judgment — the assertion is
     the human's, A11/B4) `[gui-step]`. Any **client-shared** PIR summary is **`always_gate`** (A2 class-2,
     external-facing attestation per B4).
  4. `[automation]` **Route** — mint + route action items (**SEAM → OP-05-08** problem · **SEAM →
     OP-05-02** monitoring · **SEAM → Marshall** change · **SEAM → Alivia** doc, A8).
- **Autonomy ceiling:** **L3.** Assemble + draft + route auto (internal reversible, A10 row 1); the
  **review verdict is human** (B4 — internal measure auto, the asserted PIR is signed); **client-shared
  summary `always_gate`** (A2 class-2).
- **Human-in-loop:** human owns the review judgment at every level (A11); agent assembles + drafts +
  routes. Floor: anything client-shared (A3). Pairing: Sage's human (Brandon/Luke; Mark for dogfood).
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
Celeste/Stream 08 · OP-05-08/09 → Alivia/Stream 10. **Doctrine inheritance (ADR-0136):** every
procedure names its archetype (B1/B2/B4) and inherits A1–A11; the stream showcases **A10's L4
reversible-auto-behind-an-undo-window** (OP-05-03 — declare the undo + window, halt-no-rollback on
failure) and **A11 obligation/action separation** (Sage owns the problem clock; the permanent fix is
Marshall's governed `change_request` — she proposes, never actuates; the major-incident commander is
human). Headline gaps flagged in-line, propose-only per A5c:
💤 **#1577** `problem`/`known_error` silver missing (OP-05-08 cannot persist a problem record);
💤 **#1578** monitoring/NOC bronze feed missing (OP-05-01/02/03 dormant); L4 undo endpoint (BE#345-class)
load-bearing for OP-05-03; #389/#991/#119 dormancies degrade recall + Handoff + dispatch.

**Count: 9 Operating Procedures** (Ozzie 5: OP-05-01..05 · Sage 4: OP-05-06..09).
