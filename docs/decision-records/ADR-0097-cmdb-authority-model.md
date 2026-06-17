---
adr: 0097
title: "CMDB authority model — silver inventory + IT Glue curated layer + gated write-back"
status: accepted
date: 2026-06-17
repo: frontend
summary: "Silver is the CI inventory (what exists, multi-source merged); IT Glue is authoritative for the curated layer (relationships + criticality) via a round-trip; asset lifecycle is derived read-only; write-back to IT Glue is gated on Mark's explicit approval."
tags: [crm-parity]
---
# ADR-0097: CMDB authority model — silver inventory + IT Glue curated layer + gated write-back

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-17 |
| **Relates to** | ADR-0042 (four-repo augment-not-replace contract), ADR-0018 (GUI-only; processes in the backend), ADR-0047 (read-only device/CI inventory), ADR-0077 (premium service-management boundary — the CMDB cluster's parent boundary), ADR-0059 (Defender incident → Autotask ticket linkage), ADR-0062 (BI hub), ADR-0030/ADR-0045/ADR-0095 (RBAC + write-capability gating), ADR-0084 (claim numbers at merge), #371 (premium service-management epic), #372 (CMDB epic), #645 (CI read-model + register — shipped), #647 (CI relationships), #648 (CI criticality), #649 (asset lifecycle — derived), #650 (impact analysis), #651 (IT Glue round-trip + gated write-back), #373 (ITIL change), #320 (incident triage) |

> **Numbering note.** Epic #372 / ADR-0077 reference this as "ADR-0078", but **ADR-0078 was reassigned** (it is now [ADR-0078 — feedback files to the app-dev queue](./ADR-0078-feedback-files-to-app-dev-queue.md), a claim-at-merge collision renumbered per [ADR-0084](./ADR-0084-merge-time-number-assignment.md)). The CMDB authority ADR was never written under that number. This ADR **is** that decision record, authored under the next free number. `0097` is a **placeholder claimed at merge** (ADR-0084 / system CLAUDE.md §10.3) — renumber if it collides at merge.

## Problem

The CMDB cluster (#372, bounded by [ADR-0077](./ADR-0077-premium-service-management-boundary.md)) adds a relationship-aware, impact-capable CMDB on top of the flat read-only CI inventory ([ADR-0047](./ADR-0047-device-inventory.md)). The slices are now scoped — CI register (#645, shipped), relationships (#647), criticality (#648), asset lifecycle (#649), impact analysis (#650), and an IT Glue round-trip (#651) — but they each presume an **authority model that has not been written down**:

- Where does the raw CI *inventory* live, and what is it authoritative for?
- Who owns the *curated* layer (CI relationships, criticality, CMDB attributes) — the app, or an external system of record?
- Is **asset lifecycle** part of that curated, hand-owned layer, or is it a derived signal?
- IT Glue is the MSP's existing documentation hub. If the curated layer is written **back** to IT Glue, that is a live write to an external system of record — what gates it?

Without this recorded, #647–#651 each re-litigate ownership and the #651 write-back risks shipping an ungated live write to a customer-facing documentation system. This ADR records the authority model **grilled and locked with Mark on 2026-06-15**; it documents already-settled decisions rather than reopening them.

## Context

- **Inventory is already multi-source merged and read-only** ([ADR-0047](./ADR-0047-device-inventory.md)): silver `device` + IT Glue configurations + M365/Intune + security-posture company-asset views, surfaced flat with provenance. #645 projected a read-only `cmdb_ci` union (account / client end-user / device) over that silver — **no new ingest**. So the *inventory* question is settled: silver is the CI inventory.
- **Augment-not-replace is the contract** ([ADR-0042](./ADR-0042-division-of-labor-reads-direct-processes-backend.md), [ADR-0018](./ADR-0018-gui-only-frontend-external-functions.md), reaffirmed by [ADR-0077](./ADR-0077-premium-service-management-boundary.md) §2): source systems stay authoritative for CI *facts*; Imperion never forks ownership of the underlying records. The front end is GUI-only — any *process* (including a write to IT Glue) runs in the backend.
- **IT Glue is the MSP's documentation system of record** and supports **Flexible Assets** — typed, schema-defined custom asset records with related-item links. This is the natural home for curated CMDB data (relationships + criticality) that the MSP and its techs already consult. ADR-0077 left CMDB relationships/impact/lifecycle as "Imperion-modelled on top," but the 2026-06-15 grilling **refined** that: for the *curated layer specifically*, IT Glue — not the app — is the long-term authority, reached by round-trip.
- **Lifecycle data is sparse and source-driven.** Warranty / EOL / enrolment / status come from source signals (device last-seen, Intune enrolment, Autotask configuration-item status). Hand-curating lifecycle would fight those signals and drift.
- **Writing to an external SoR is irreversible and customer-facing.** Per system CLAUDE.md §2 and the dormant-write-leg pattern used elsewhere (email/SMS sends behind the consent gate, [ADR-0058](./ADR-0058-composer-sends-via-approval-gated-backend-path.md); DocuSign), anything that mutates an external system of record is built dormant and human-gated.

## Options considered

1. **App-native curated layer, never written back.** The app owns relationships + criticality in its own overlay; IT Glue is read-only input only. Simplest and fully reversible, but the curated knowledge stays trapped in Imperion — techs working in IT Glue never see it, and Imperion silently becomes a *second* CMDB competing with the MSP's documentation SoR. Rejected as the end state (kept as the **interim** state until write-back is approved).
2. **IT Glue authoritative for the curated layer, with ungated live write-back.** Correct authority direction, but ships a live write to a customer-facing SoR without a human gate — violates the irreversibility rule (CLAUDE.md §2) and the dormant-write-leg convention. Rejected.
3. **Silver = inventory; IT Glue = authoritative for the curated layer via round-trip; lifecycle derived read-only; write-back gated on Mark's explicit approval (chosen).** Splits the model cleanly along authority lines, keeps the app working immediately (app-native overlay), and makes the one irreversible leg — the live write to IT Glue — explicitly human-gated and dormant-by-default.

### Tradeoffs

Option 3 carries a **dual-write window**: until write-back is approved, the curated layer lives app-native (Option 1's overlay) *and* IT Glue may hold its own curated data, so the read-in leg (#651) must define conflict handling (IT Glue is authority on conflict for fields it owns). It also depends on IT Glue Flexible-Asset data quality, mitigated by provenance display (per ADR-0047) and by the app-native overlay remaining usable when IT Glue data is sparse or the integration is unconfigured. The benefit is a single long-term home for curated CMDB knowledge that the MSP already trusts, without ever shipping an ungated external write.

## Decision

Adopt the following CMDB authority model for the #372 cluster.

1. **Silver is the CI inventory.** CIs = *what exists*, multi-source merged and read-only (ADR-0047; the #645 `cmdb_ci` union over silver `account` / client end-user / `device`). This is the inventory plane; it is not hand-edited and is not the curated layer.

2. **IT Glue is authoritative for the curated layer.** The **curated layer** = CI **relationships** (#647), CI **criticality** (#648), and CMDB attributes maintained by techs. IT Glue — via Flexible Assets — is the long-term system of record for this layer, reached by **round-trip** (read-in + gated write-back, #651). Imperion does not become a competing CMDB SoR.

3. **Asset lifecycle is DERIVED, read-only, and NOT part of the curated layer.** Lifecycle state (`in-use` / `in-stock` / `retired` / `disposed`, plus warranty/EOL where available) is **computed from source signals** (device last-seen, Intune enrolment, Autotask configuration-item/asset status) per a documented rule set (#649). It is never hand-edited and never written back. Missing signals degrade to an `unknown` state, not a crash.

4. **Write-back to IT Glue is GATED on Mark's explicit approval.** The **read** legs — projecting silver inventory, reading curated data *in* from IT Glue, and round-trip reconciliation — are **not** gated. The **live write** leg (pushing curated relationships/criticality *to* IT Glue Flexible Assets, #651) is built **dormant and disabled by default**, requires explicit enable/approval, is audited, and performs **no live write to IT Glue until Mark approves** (mirrors the [ADR-0058](./ADR-0058-composer-sends-via-approval-gated-backend-path.md) consent-gated send pattern and the DocuSign gate). Per [ADR-0018](./ADR-0018-gui-only-frontend-external-functions.md)/[ADR-0042](./ADR-0042-division-of-labor-reads-direct-processes-backend.md) the write executes in the **backend**, not the GUI.

5. **Augment-not-replace stays; the working overlay is app-native until write-back is approved.** Until the write-back gate is opened, the curated layer is an **app-native overlay** (e.g. `ci_relationship` for #647; a `cmdb_ci_overlay` row carrying `derived_default` + nullable `override` for #648) — fully usable, reversible, and source-system-authoritative for CI *facts* (ADR-0042/ADR-0047/ADR-0077). Opening the gate promotes IT Glue to authority for the curated fields it owns; on read-in conflict, **IT Glue wins for fields it owns**, the app-native value is preserved as history, and manual app edits survive re-derivation (#647/#648 acceptance criteria).

### IT Glue Flexible-Asset mapping (curated layer)

The curated layer maps to one or more IT Glue **Flexible Asset** types (exact type names/IDs resolved at integration time, #651). The conceptual mapping:

| Curated concept (app) | IT Glue Flexible Asset representation | Direction |
|---|---|---|
| CI **relationship** edge (`ci_relationship`: `from_ci`, `to_ci`, `relation_type`, directional) | Flexible Asset **related-items** links between the corresponding IT Glue configurations/assets, typed by `relation_type` | round-trip (read-in always; write-back gated) |
| CI **criticality** (effective = `override ?? derived_default`) | A Flexible Asset **field** (e.g. "Business Criticality") on the CI's asset record | round-trip (read-in always; write-back gated — only the **override**/effective value is a curated fact) |
| CMDB **attributes** (curated, tech-maintained) | Flexible Asset fields on the CI's asset record | round-trip (read-in always; write-back gated) |
| Asset **lifecycle** (derived) | **Not mapped to the curated Flexible Asset** — lifecycle is derived read-only (decision §3) and is never written back | read-only, app-derived |
| CI **facts** (name, type, identifiers) | Existing IT Glue configurations (ADR-0047 inventory) | read-only (source-authoritative, never overwritten) |

**Write-back approval-gate mechanism:** the write leg is a backend process (ADR-0018/ADR-0042) guarded by (a) a feature/config flag that is **off by default** (dormant — degrades to working-copy-only when unconfigured), (b) an explicit Mark-granted enable, and (c) the standard write-capability check (`cmdb:write`, ADR-0045/ADR-0095). Every attempted and executed write is audited. This is the same defence-in-depth shape as the consent-gated send path (ADR-0058) and the dormant DocuSign write.

## Consequences

### Security impact

The one irreversible, externally-visible action in this cluster — writing curated data into the MSP's customer-facing documentation SoR — is **gated three ways** (off-by-default flag + explicit Mark approval + `cmdb:write` capability) and **audited**, with **no live write until Mark approves**. Read legs add no new external write surface (they consume IT Glue read-only, like the existing ADR-0047 inventory). CI facts are never overwritten (source-authoritative). The CMDB surfaces remain admin-gated (`cmdb:read`/`cmdb:write`, ADR-0030/ADR-0045/ADR-0095). IT Glue credentials are custodied in Key Vault by the backend (ADR-0042) — **never commit secrets**. Conforms to [`docs/security/unified-security-standard.md`](../security/unified-security-standard.md).

### Cost impact

Minimal net-new cost: the read-in/round-trip and the dormant write leg reuse the existing IT Glue integration and backend (ADR-0047/ADR-0042). No new provider, no new key. Lifecycle derivation is a read-model over existing silver — compute only.

### Operational impact

- Schema for the app-native overlay (`ci_relationship`, `cmdb_ci_overlay`) lands in `ImperionCRM` (ADR-0042 schema ownership); IT Glue ingest/round-trip enrichment lands in `_Pipeline` / `_LocalPipelineEnrichment`; the gated write process lands in `_Backend`.
- A **dual-write window** exists until the gate opens: the read-in leg (#651) must reconcile IT Glue curated data with the app-native overlay (IT Glue authoritative for its owned fields; app-native preserved as history; manual edits survive re-derivation).
- Opening the write-back gate is a **Mark-gated operational step**, not a deploy default. Until then the system is fully functional on the app-native overlay and degrades gracefully when IT Glue is unconfigured.
- Lifecycle recomputes from current silver; sparse/missing source signals surface as `unknown` with provenance (ADR-0047), never a failure.

## Future considerations

- Promote additional curated CMDB attributes into the Flexible-Asset mapping as the round-trip proves out.
- Feed criticality-weighted impact (#650) into change-risk scoring (#373) and incident triage (#320), and into the BI-hub fleet rollup (ADR-0062).
- Bidirectional relationship inference (heuristic edges from IT Glue config relationships) once the round-trip is stable.
- Revisit the lifecycle rule set as Autotask/Intune lifecycle fidelity improves.
