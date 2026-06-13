# ADR-0077: Premium service-management boundary — CMDB, ITIL, and asset lifecycle on top of Autotask SoR

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0042 (four-repo augment-not-replace contract), ADR-0044 (Autotask tickets/contracts silver), ADR-0047 (read-only device inventory), ADR-0059 (Defender incident → Autotask ticket), ADR-0062 (BI hub), #314 (CRM-parity initiative + portal exclusion), #320 / ADR-0074 (service-desk depth + Autotask-SoR decision), #371 (premium service-management epic), #372 (CMDB), #373 (ITIL), ICM #280 |

## Problem

Imperion augments Autotask well on the sales/delivery and AI-native axes, but the
**service-management depth** that premium ITSM/PSA players (ServiceNow, HaloPSA,
ConnectWise) charge for is missing or thin: a relationship-aware CMDB with impact
analysis, ITIL problem + change management, and asset lifecycle. Without a stated
boundary, building these risks (a) **duplicating** the service-desk-depth work already
owned by #320 / ADR-0074, and (b) **drifting into a PSA rebuild** that violates the
augment-not-replace contract (ADR-0042).

## Context

- Autotask is **system-of-record for tickets/contracts** (ADR-0044); #320 / ADR-0074
  already settled that Imperion *layers intelligence + customer-facing surfaces on
  top* rather than forking ticket ownership.
- The device/CI inventory is **flat and read-only** today (ADR-0047): merged from IT
  Glue + M365 + Intune + security-posture company-asset views (#258 / #259 / #261),
  with no relationships and no lifecycle.
- #314 (CRM-parity, locked with Mark 2026-06-12) closes **table-stakes** gaps and
  explicitly excludes **portals** as off-strategy. The premium cluster here is a
  **different axis** (beyond-par ITSM depth), so it lives under its own epic (#371).

## Options considered

1. **Fold everything into #320.** Rejected — #320 is scoped to service-desk depth
   (SLA / CSAT / chat / routing); CMDB / ITIL / lifecycle are a separate concern and
   would bloat it.
2. **Treat as PSA replacement (own ticketing/CMDB as SoR).** Rejected — violates
   ADR-0042 augment-not-replace; Autotask + source systems stay authoritative.
3. **Augment layer on top of Autotask SoR + read-only source inventory (chosen).**
   Imperion owns the *modelling* (relationships, impact, lifecycle, problem/change
   records) but never the underlying CI/ticket facts.

### Tradeoffs

Option 3 keeps the contract clean and reuses existing inventory + AI primitives, at
the cost of depending on source-system data quality (warranty/relationship fields may
be sparse — handled by showing provenance/staleness, per ADR-0047).

## Decision

Adopt a **premium service-management layer** under epic #371, governed by these
boundaries:

1. **Autotask stays SoR for tickets/contracts** (reaffirms #320 / ADR-0074).
   Service-desk depth (SLA / CSAT / chat / deflection / routing) is owned by **#320 and
   is NOT re-decided here** — this ADR only adds the *predictive-breach* and *triage
   co-pilot* emphasis as notes on #320's existing slices.
2. **Source systems stay authoritative for CI facts** (ADR-0047). Imperion adds
   **relationships, impact, and lifecycle** as its own modelling on top; it never
   writes CI facts back to source.
3. **Problem and change records are Imperion-owned** (Autotask is not their SoR); only
   resulting tickets write back to Autotask.
4. Cluster scope = **CMDB relationships + impact** (#372 / ADR-0078), **ITIL problem +
   change** (#373 / ADR-0079), **asset lifecycle** (folded into #372 / ADR-0078). Each
   gets its own review-gated ADR.
5. **Client / QBR portal is deferred.** It collides with #314's portal exclusion and is
   the cluster's largest architectural decision (first external auth surface). It
   requires an explicit in/off-strategy call from Mark and a dedicated ADR + grill
   before any issue; it is **not** scoped by this ADR.
6. **Deliberately not built:** PSA ticket editing / workflow engine, native billing,
   RMM agents, and full ITIL ceremony beyond MSP-relevant problem/change.

## Consequences

### Security impact

No new external attack surface in this cluster — the one feature that would add one
(the client portal) is explicitly deferred. CMDB/impact data inherits the read-only
source posture (ADR-0047); problem/change records are internal, Entra-gated like the
rest of the app. Conforms to `docs/security/unified-security-standard.md`. Never commit
secrets.

### Cost impact

Reuses existing inventory ingestion + AI stack (semantic search / board runtime); the
net-new cost is schema + compute for impact analysis and AI incident clustering —
modest.

### Operational impact

Schema changes land in `ImperionCRM` (ADR-0042); ingestion in `_Pipeline` /
`_LocalPipelineEnrichment`; orchestration in `_Backend`. Each feature ships as its own
epic with review-gated ADRs.

## Future considerations

- Client / QBR portal, pending Mark's scope decision (would be ADR-0080 if scoped in).
- Cross-CI impact could later feed proactive maintenance / SBR health (ADR-0062 BI hub).
- AI-driven change-risk scoring once change history accumulates.
