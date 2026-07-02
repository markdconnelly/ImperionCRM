# Workflow: standard-reevaluation (platform v1 — Bucket B5)

**Job:** when the client security standard **evolves** — a new version is ratified (B1,
#1468, Mark-gated) — **re-score the whole fleet** against the new baseline and flag the
**newly-non-compliant** (#1472): clients that were `conforming` under the superseded version
but are `drifting`/`critical` under the new one. The scoring + the newly-non-compliant
definition are the shared `domains/platform/skills/posture-scoring-method.md`. The impact is
presented as **the standard moving, not the client slipping** — routed via **Celeste** for
client presentation, with the fleet impact surfaced to **Mark**. References the Vera agent
epic **#1397**.

**Trigger:** a **new ratified** `security_standard_version` (B1's ratify, the prior version
now superseded — mig 0256). One run per ratification event (a fleet sweep).

**What this is NOT:** no ratification (that is B1 — Vera never ratifies; the ratify is
Mark-gated), no re-scoring against a **draft** (the newly ratified current only), no
remediation, no client contact, no DB write — **Vera measures; Celeste presents to the
client; a human/Datto remediates** (the MSSP boundary, vera.md). Newly-non-compliant is
**never counted as client drift** — that is B3 (`security-drift-detection`, #1470), which
compares a client against itself under the **same** version; here the version changed, so the
cause is the standard, presented as the ratification's impact, never client fault. This is the
**client** standard (0256), not the internal `docs/security/unified-security-standard.md`. And
the impact is **client-facing posture** routed via **Celeste/Mark** — never filed into the A9
deviation queue (`deviation-lifecycle`, #1467). Audit-by-reference: cite version ids +
snapshot id + criterion id, never posture values.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-ratification-event | Load the newly-ratified + superseded versions + the fleet to re-score | — |
| 02 | rescore-fleet-vs-new-standard | Re-score each client's latest snapshot vs the new baseline; identify newly-non-compliant | — |
| 03 | record-reevaluation-impact | Assemble the ratification impact; route per-client via Celeste, fleet impact to Mark | **Celeste/Mark loop** |

## Autonomy

**Tops out at L2** (Vera has no L3–L5). Default rung **L1** (draft the impact → park). At
**L2**, on a new ratified version the fleet re-score auto-runs, the ratification impact
auto-surfaces to the governance dashboard, the newly-non-compliant are flagged, and per-client
evaluations auto-route to **Celeste** (internal, reversible); the fleet impact surfaces to
**Mark**. Each re-score verdict's persistence is the backend's idempotent INSERT (BE #439) —
never Vera's; remediation and client contact are never hers at any rung.

## Runtime skills

Domain-shared (Tier 2): `domains/platform/skills/posture-scoring-method.md` (criteria →
checks → score, the bands, and **the newly-non-compliant definition** — shared with B2 #1469
and B3 #1470). The signal-vs-inference + audit-by-reference discipline is the shared
`conformance-engine` rubric, cited not restated. The structured manifest is `agent.yaml`; the
composed prose is `prose.md`.
