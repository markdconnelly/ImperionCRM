# ADR-0057: v1 is the complete product — version recut (v1 Complete / v2 Refined / v3 TBD)

| Field | Value |
|---|---|
| **Repo** | frontend (recut applies to all four repos) |
| **Status** | Accepted |
| **Date** | 2026-06-11 |
| **Cross-references** | ADR-0056 (versioning standard — unchanged) · `docs/architecture/product-roadmap-v1-v3.md` (rewritten by this ADR) · ADR-0054 (board governance) · ADR-0055 (autonomy tiers) · issue #179 |

## Problem

The 2026-06-10 roadmap split the product into three thin capability waves: v1
"Operational" (go-live + board upgrade, ~2–3 wk), v2 "Automated" (sub-agents, real
sends, lead loop, ~+4–6 wk), v3 "Refined" (feedback-driven). During the 2026-06-11
grilling session Mark rejected that split: employees' first touch must be a complete,
AI-first product, not an operational core that automates later. The wave model also
created contradictions the session surfaced — ACS config sat in v1 while its send
executor sat in v2; vectorization was a documented v1 gate while informally deferred
"later".

## Context

- ADR-0056's mechanics (3-digit semver, coordinated human-declared majors,
  release-please everywhere) are settled and **not** changed here; only what the v1
  milestone *means* changes.
- ADR-0056 defined v1.0.0 = "employees use the product for real". With a larger v1
  the open question was whether employees start earlier on 0.x. They do not.
- Parts of the old v2/v3 logically require operating history (earned-autonomy
  graduation, trend-aware board, feedback review) and cannot be in any first release.

## Options considered

1. **Keep the three thin waves** — fastest first cut, but employees' first impression
   is an incomplete product, contradicting the stated goal.
2. **v1 absorbs only client comms** — fixes the ACS contradiction but leaves
   sub-agents/lead loop/ingestion in v2; v2 stops being a coherent theme.
3. **v1 = complete product; v2 = refinement; v3 = TBD** — v1 absorbs all of old v2
   plus the entire filed build-tail; v2 takes old v3's content; v3 is defined by the
   v2 feedback review.

### Tradeoffs

Option 3 makes v1 roughly 3× larger (~10–14 wk of capability gates vs ~2–3 wk) and
delays employee feedback until the cut. In exchange: first impressions are of a
finished, AI-first product; v2 "Refined" gets real usage data to refine against; and
the version story is simple — v1 complete, v2+ major iterations.

## Decision

Option 3. The recut, locked 2026-06-11:

1. **v1.0 "Complete"** — every feature filed as of 2026-06-11 across the four repos
   is v1 scope ("if it's filed today, it's v1"). That includes all six old-v2 gates
   (sub-agents, real sends, lead loop, M365 ingestion + enrichment, agent memory,
   deputy pause flow, cost telemetry), all four client-comms capabilities (1:1 sends,
   campaign blasts, Meta ads, workflow automation — ACS config moves back into v1
   with its executor), and the filed build-tail (Plaud, UniFi, posture UI +
   snapshots, Sentinel/KQM/DocuSign collectors, events, projects/meetings,
   tasks→tickets).
2. **v1 ships AI-first.** Vectorization + semantic search are confirmed v1 gates. New
   explicit gate: a **scripted agent-quality eval** (orchestrator answers across all
   nine gold entity types, a board session over a real packet, RAG citation
   spot-checks) run green, plus Mark's hands-on UX sign-off, before the cut.
3. **Go-live = v1.0.0 = first employee touch.** No 0.x soft launch, no per-module
   rollout. The go-live roadmap's phases remain the *internal sequencing* of v1's
   operational track.
4. **v2.0 "Refined"** absorbs old v3's content: structured business-feedback review,
   earned-autonomy graduation (`agent_tool_grant` enforcement), trend-aware board,
   persona editing UI, cost-effectiveness gate.
5. **v3.0** is deliberately undefined: the next major iteration, named and scoped by
   the v2 feedback review (productization for other MSPs is the standing candidate).
6. **Tracking:** one v1 epic per repo (existing mechanic) plus a `v1.0` GitHub
   milestone per repo holding every open feature issue. Frontend's legacy phase epics
   (#5–#14) close as superseded.

## Consequences

- The roadmap doc is rewritten around the recut; the four v1 epics and the milestone
  assignments are the live work ledger.
- Capability gates still beat dates (unchanged); the honest cadence estimate for v1
  is now ~10–14 weeks.
- "v2 Automated" no longer exists as a wave; automation is v1 scope. Documents that
  referenced it are updated by this PR; stragglers should be read through this ADR.

### Security impact

None direct. The autonomy-tier policy (ADR-0055) is unchanged — pulling sends and
automation into v1 pulls their T2 propose-only defaults in with them, so client-visible
actions remain human-approved regardless of version.

### Cost impact

The $250/mo AI budget ceiling and balanced-preset defaults are unchanged. A longer v1
means the budget gate operates for months before any earned-autonomy expansion (v2).

### Operational impact

Employees stay off the product until v1.0.0, so operational support burden stays at
zero during the build; in exchange the v1 cut is a true launch event (comms, training)
rather than a version bump.

## Future considerations

- If v1's size proves unmanageable, the escape hatch is descoping *specific filed
  issues* out of the milestone with Mark's sign-off — never reintroducing a wave model
  silently.
- The v2 feedback review should explicitly revisit whether v3 = productization.
