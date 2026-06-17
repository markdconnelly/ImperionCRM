---
adr: 0098
title: "Change Enablement — Autotask is the change-record SoR via a gated write; Imperion is an app-native overlay (typed change, CMDB-derived risk, lightweight approval, calendar)"
status: proposed
date: 2026-06-17
repo: frontend
summary: "Imperion models the change (type, affected CIs, CMDB-derived risk, lightweight approval, calendar) and routes it to Autotask change management via a gated write; Autotask is the change-record system of record and Imperion's approval + schedule are an app-native overlay keyed to the Autotask change id. Problem Management is out of scope. v1 = record + approval + calendar only, no automated execution."
tags: [crm-parity]
---
# ADR-0098: Change Enablement — Autotask-SoR-via-gated-write, app-native overlay

| Field | Value |
|---|---|
| **Repo** | frontend (schema owner; the Autotask write *process* lands in the backend per ADR-0042/ADR-0018) |
| **Status** | Proposed |
| **Date** | 2026-06-17 |
| **Relates to** | ADR-0042 (four-repo augment-not-replace contract), ADR-0018 (GUI-only; processes in the backend), ADR-0077 (premium service-management boundary — the parent boundary), ADR-0097 (CMDB authority model — supplies the impact/criticality this ADR's risk consumes), ADR-0058 (composer sends via an approval-gated backend path — the gated-external-write pattern reused here), ADR-0091 (Agent/ICM platform — board/deputy governance + tiered autonomy; **explicitly NOT** the approval model here), ADR-0095 (RBAC + write-capability gating), ADR-0084 (claim numbers at merge), #373 (ITIL Change Enablement epic), #372 (CMDB epic), #650 (CMDB impact analysis), #645 (CI register / affected-CI picker), #426 (Autotask write-back spike), backend #150 (Autotask write-back client — built), #320 (incident/service-desk depth), #656 (change-request core), #658 (CMDB-derived risk + override), #659 (lightweight approval), #660 (change calendar), #661 (route → Autotask, gated write) |

> **Numbering note.** Issue #657 and epic #373 refer to this as "ADR-0079", but **ADR-0079 was never written** — that number was consumed by a claim-at-merge collision and the ADR sequence jumps from ADR-0078 to ADR-0090. The Change Enablement decision record was never authored under any number. This ADR **is** that decision record, authored under the next free number. `0098` is a **placeholder claimed at merge** ([ADR-0084](./ADR-0084-merge-time-number-assignment.md) / system CLAUDE.md §10.3) — renumber if it collides at merge.

## Problem

Epic [#373](https://github.com/markdconnelly/ImperionCRM/issues/373) adds the ITIL 4 **Change Enablement** practice on top of the existing incident flow (`ticket`, Autotask SoR) and the CMDB cluster ([#372](https://github.com/markdconnelly/ImperionCRM/issues/372), bounded by [ADR-0077](./ADR-0077-premium-service-management-boundary.md), authority model in [ADR-0097](./ADR-0097-cmdb-authority-model.md)). The slices are scoped — change-request core (#656), CMDB-derived risk (#658), lightweight approval (#659), change calendar (#660), and route-to-Autotask (#661) — but they each presume an **ownership and routing model that has not been written down**:

- Does Imperion *own* the change record, or does an external system of record?
- The MSP already runs change management in **Autotask**. If Imperion creates changes too, which one is authoritative, and how does an Imperion-created change reach Autotask without forking the SoR?
- What approval shape does a change use — the heavyweight board/deputy governance ([ADR-0091](./ADR-0091-agent-icm-platform-consolidated.md), formerly ADR-0054/0055), or something lighter?
- Where does change **risk** come from, and how does it relate to the CMDB impact analysis (#650)?
- Is **Problem Management** (root-cause of recurring incidents, known errors) part of this, or out of scope?

Without this recorded, #656–#661 each re-litigate ownership, the #661 routing slice risks shipping an ungated live write to the MSP's change-management SoR, and the approval slice risks over-building the board pattern. This ADR records the Change Enablement design **grilled and locked with Mark on 2026-06-15**; it documents already-settled decisions rather than reopening them.

## Context

- **Augment-not-replace is the contract** ([ADR-0042](./ADR-0042-division-of-labor-reads-direct-processes-backend.md), [ADR-0018](./ADR-0018-gui-only-frontend-external-functions.md), reaffirmed by [ADR-0077](./ADR-0077-premium-service-management-boundary.md)): source systems stay authoritative for their records; Imperion never forks ownership. The front end is GUI-only — any *process* (including a write to Autotask) runs in the backend.
- **Autotask already runs change management** for the MSP and is the existing SoR for tickets ([#320](https://github.com/markdconnelly/ImperionCRM/issues/320)) and configuration items. Its change-management module is where techs already work; a second competing change record in Imperion would drift and confuse.
- **An Autotask write capability now exists.** The write-back spike ([#426](https://github.com/markdconnelly/ImperionCRM/issues/426)) and the Autotask write-back client (backend [#150](https://github.com/markdconnelly/ImperionCRM_Backend/issues/150)) are built, so routing an Imperion-created change *into* Autotask change management is feasible — but, like every write to an external SoR, it is irreversible and externally visible.
- **The CMDB now supplies impact.** Per [ADR-0097](./ADR-0097-cmdb-authority-model.md), the CMDB cluster yields n-hop affected-CI sets (#650) weighted by CI criticality (#648). ADR-0097's "Future considerations" already anticipated feeding criticality-weighted impact into change-risk scoring — this ADR consumes it.
- **Writing to an external SoR is irreversible and customer-facing.** Per system CLAUDE.md §2 and the dormant-write-leg pattern (consent-gated sends [ADR-0058](./ADR-0058-composer-sends-via-approval-gated-backend-path.md); the gated IT Glue write-back in ADR-0097; DocuSign), anything that mutates an external system of record is built dormant and human-gated.
- **The board/deputy governance and tiered-autonomy machinery ([ADR-0091](./ADR-0091-agent-icm-platform-consolidated.md), formerly ADR-0054/0055)** is the agent/ICM decision-review pattern. It is deliberately heavyweight (influence personas, packet grounding, recommendation review, earned autonomy tiers) and is **not** the right shape for routine IT change approval.

## Options considered

1. **Imperion is the change-record system of record.** Imperion owns the canonical change record; Autotask is, at most, notified. Gives Imperion full control of the lifecycle but **forks ownership** away from the MSP's existing change-management SoR — violates augment-not-replace ([ADR-0042](./ADR-0042-division-of-labor-reads-direct-processes-backend.md)/[ADR-0077](./ADR-0077-premium-service-management-boundary.md)) and creates a second change board techs must also watch. Rejected.
2. **Pure pass-through to Autotask — Imperion is a thin form over the Autotask change API.** No Imperion-side model at all. Correct authority direction but throws away the value: no CMDB-derived risk, no app-native calendar/approval overlay tied to Imperion's CI graph, and an ungated live write on every create. Rejected.
3. **Autotask is the change-record SoR; Imperion creates the change and routes it via a GATED write; Imperion's approval + schedule are an app-native overlay keyed to the Autotask change id (chosen).** Imperion models the change richly (type, affected CIs, CMDB-derived risk, lightweight approval, calendar), keeps the SoR in Autotask, and makes the one irreversible leg — the live write to Autotask change management — explicitly human-gated and dormant-by-default. Mirrors the ADR-0097 CMDB authority split (app-native overlay + gated external write to the SoR).

### Tradeoffs

Option 3 carries an **overlay-vs-SoR reconciliation surface**: Imperion's approval state and schedule live app-native and are linked to the Autotask change id, so the routing slice (#661) must define what is written on create vs. update and what happens if the Autotask change is edited directly in Autotask (Autotask is authoritative for the change-record fields it owns; Imperion's overlay is authoritative for the approval + schedule it adds). It also depends on the Autotask change-management field schema being mappable from Imperion's change-type model (resolved at routing time, #661). The benefit is a rich, CMDB-aware change experience that never forks the MSP's change SoR and never ships an ungated external write.

## Decision

Adopt the following Change Enablement model for the #373 cluster.

1. **Scope is Change Enablement ONLY — Problem Management is OUT.** This epic implements ITIL 4 Change Enablement (change requests, risk/impact, approval, change calendar). **Problem Management** (root-cause analysis of recurring incidents, known errors, workarounds) is **dropped** from #373; recurring-incident handling stays with **Autotask** / the service-desk depth work ([#320](https://github.com/markdconnelly/ImperionCRM/issues/320)) if pursued at all. #373 is retitled "ITIL Change Enablement".

2. **Autotask is the change-record system of record.** Imperion does **not** own the canonical change record. Imperion **creates** the change (type, affected CIs, risk, approval, calendar) and **routes it to Autotask change management** (#661). The authoritative change record lives in Autotask, where the MSP's techs already work; Imperion never becomes a competing change-management SoR (augment-not-replace, [ADR-0042](./ADR-0042-division-of-labor-reads-direct-processes-backend.md)/[ADR-0077](./ADR-0077-premium-service-management-boundary.md)).

3. **Routing to Autotask is a GATED write.** The route-to-Autotask leg (#661) is a **backend process** ([ADR-0018](./ADR-0018-gui-only-frontend-external-functions.md)/[ADR-0042](./ADR-0042-division-of-labor-reads-direct-processes-backend.md)) over the Autotask write-back client (backend [#150](https://github.com/markdconnelly/ImperionCRM_Backend/issues/150), spike [#426](https://github.com/markdconnelly/ImperionCRM/issues/426)). It is built **dormant and disabled by default**, requires explicit enable/approval, is **audited**, performs **no live write to Autotask until the gate is opened**, and is guarded by the standard write-capability check (`change:write`, [ADR-0095](./ADR-0095-authorization-rbac-consolidated.md)). This is the same defence-in-depth shape as the consent-gated send path ([ADR-0058](./ADR-0058-composer-sends-via-approval-gated-backend-path.md)) and the gated IT Glue write-back ([ADR-0097](./ADR-0097-cmdb-authority-model.md)).

4. **Imperion's approval + schedule are an app-native overlay keyed to the Autotask change id.** Imperion's change record carries the app-native fields it adds — approval state and the calendar/schedule — linked to the Autotask change by **Autotask change id**. On conflict, **Autotask is authoritative for the change-record fields it owns** (status, type mapping, etc.); the Imperion overlay is authoritative for the approval + schedule it contributes. Until the routing gate is opened, the overlay is fully usable on its own (mirrors the ADR-0097 app-native-overlay-until-gated pattern).

5. **Change types are modeled in Imperion and mapped to Autotask on routing.** Three types: **standard** (= pre-approved; no approval step), **normal** (→ approval required), and **emergency** (→ expedited/post-hoc approval). The type drives Imperion's approval behaviour (decision §6) and is **mapped to the corresponding Autotask change-management fields** when the change is routed (#661).

6. **Approval is LIGHTWEIGHT — explicitly NOT the board/deputy pattern.** Change approval is a simple, change-type-driven approval (#659): standard = pre-approved (auto), normal = a single approval step, emergency = expedited. It is **not** the board-of-directors influence-persona / deputy governance or the tiered-autonomy machinery ([ADR-0091](./ADR-0091-agent-icm-platform-consolidated.md), formerly ADR-0054/0055) — that pattern is for agent/ICM decision review and is too heavyweight for routine IT change.

7. **Risk is DERIVED from CMDB impact, with manual override.** Change risk (#658) is computed from the CMDB impact analysis ([#650](https://github.com/markdconnelly/ImperionCRM/issues/650)) — the **n-hop set of affected CIs × their criticality** ([#648](https://github.com/markdconnelly/ImperionCRM/issues/648), authority per [ADR-0097](./ADR-0097-cmdb-authority-model.md)) — over the affected-CI set chosen on the change (picker uses the #645 CI register). A **manual override** is allowed and preserved with provenance, the same `derived_default` + nullable `override` shape ADR-0097 uses for criticality. Missing impact signals degrade to an `unknown`/lowest-confidence risk, not a failure.

8. **v1 scope is RECORD + APPROVAL + CALENDAR only — NO automated execution.** v1 covers creating the typed change record, lightweight approval, the change calendar/schedule, CMDB-derived risk, and the gated route to Autotask. Imperion does **not** automatically *execute* changes (no automated provisioning, no scripted remediation) in v1; execution stays with the MSP's existing tooling/processes.

### Change-type → behaviour → Autotask mapping

| Imperion change type | Approval behaviour (§6) | Risk (§7) | Autotask routing (§3, #661) |
|---|---|---|---|
| **standard** (pre-approved) | none (auto-approved) | CMDB-derived + override | mapped to Autotask "standard"/pre-approved change fields |
| **normal** | single lightweight approval step | CMDB-derived + override | mapped to Autotask "normal" change fields (carries approval state) |
| **emergency** | expedited / post-hoc approval | CMDB-derived + override | mapped to Autotask "emergency" change fields |

## Consequences

### Security impact

The one irreversible, externally-visible action in this cluster — writing a change into the MSP's Autotask change-management SoR — is **gated** (off-by-default dormant write leg + explicit enable/approval + `change:write` capability, [ADR-0095](./ADR-0095-authorization-rbac-consolidated.md)) and **audited**, with **no live write until the gate is opened** (mirrors [ADR-0058](./ADR-0058-composer-sends-via-approval-gated-backend-path.md) and the ADR-0097 IT Glue write-back). Read legs (CMDB impact, CI register) add no new external write surface. Autotask credentials are custodied in Key Vault by the backend ([ADR-0042](./ADR-0042-division-of-labor-reads-direct-processes-backend.md)) — **never commit secrets**. Change-management surfaces are capability-gated (`change:read`/`change:write`, [ADR-0095](./ADR-0095-authorization-rbac-consolidated.md)). Conforms to [`docs/security/unified-security-standard.md`](../security/unified-security-standard.md).

### Cost impact

Minimal net-new cost: routing reuses the existing Autotask write-back client (backend #150) and integration; risk derivation is a read-model over the existing CMDB impact analysis (#650). No new provider, no new key.

### Operational impact

- Schema for the app-native change overlay (`change_request` typed std/normal/emergency, approval state, schedule, affected-CI links, `risk` as `derived_default` + nullable `override`, and the Autotask change-id link) lands in `ImperionCRM` ([ADR-0042](./ADR-0042-division-of-labor-reads-direct-processes-backend.md) schema ownership) — authored against a placeholder migration number, claimed at merge (system CLAUDE.md §10.3). The gated route-to-Autotask **process** lands in `_Backend`.
- An **overlay-vs-SoR reconciliation** exists once the routing gate opens (#661): Autotask is authoritative for change-record fields it owns; the Imperion overlay is authoritative for the approval + schedule it adds; the change id is the join key.
- Opening the route-to-Autotask gate is a **Mark-gated operational step**, not a deploy default. Until then the change overlay is fully functional on its own and degrades gracefully when the Autotask write is unconfigured.
- Risk recomputes from current CMDB impact; sparse/missing CMDB signals surface as `unknown`/lowest-confidence risk with provenance, never a failure.
- Depends on the CMDB cluster (#372): risk consumes #650 impact and #648 criticality; the affected-CI picker uses #645.

## Future considerations

- Pull change *status* back from Autotask (read-in) to close the loop on the overlay, once the gated write proves out.
- Feed change calendar conflicts (overlapping changes on shared CIs) off the CMDB relationship graph (#647).
- Revisit Problem Management as a future epic if recurring-incident root-cause outgrows Autotask + #320.
- Consider tiered autonomy ([ADR-0091](./ADR-0091-agent-icm-platform-consolidated.md)) for *standard* (pre-approved) change auto-routing once track record supports it — a deliberate, separate decision, not part of v1.
