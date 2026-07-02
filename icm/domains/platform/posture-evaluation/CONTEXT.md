# Workflow: posture-evaluation (platform v1 — Bucket B2)

**Job:** score a client's security posture against the **current ratified** client security
standard (#1469) — criterion by criterion over the client's `posture_snapshot`, producing an
`overall_score` + `conformance_status` (`conforming | drifting | critical`) and the
get-back-in-shape evaluation behind it. The verdict's persistence is the backend's
**idempotent INSERT** into `posture_score` (mig 0256 — the UNIQUE
(account, standard version, snapshot) is the arbiter; BE #439, LP #399 on the scheduled
cycle); Vera produces the evaluation, the backend persists. The scoring method is the shared
`domains/platform/skills/posture-scoring-method.md`. References the Vera agent epic
**#1397**.

**Trigger:** a fresh `posture_snapshot` landing for a client, a Mark/Celeste request for a
client evaluation, or the scheduled fleet sweep (LP #399 runs the same method). One run per
(client, snapshot).

**What this is NOT:** no remediation, no client contact, and no DB write — **Vera measures;
Celeste presents to the client; a human/Datto remediates** (the MSSP boundary, vera.md). No
scoring against a draft standard (ratified current only). A not-assessable criterion is
never silently passed. This is the client standard (0256), not the internal
`docs/security/unified-security-standard.md`. And these findings are **client-facing
posture**, routed via **Celeste** — never filed into the A9 deviation queue
(`deviation-lifecycle`, #1467), which handles internal agent-process deviations.
Audit-by-reference: cite snapshot id + criterion id, never posture values.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-standard-and-posture | Load the ratified standard + the client's snapshot + prior verdicts | — |
| 02 | score-posture-vs-standard | Criterion-by-criterion verdicts → overall_score + conformance_status | — |
| 03 | record-posture-verdict | Surface the verdict + evaluation; route to Celeste for presentation | **Celeste seam** |

## Autonomy

**Tops out at L2** (Vera has no L3–L5). Default rung **L1** (draft the evaluation → park).
At **L2**, the evaluation auto-runs on a fresh snapshot, and the verdict + evaluation
auto-surface to the governance dashboard and auto-route to **Celeste** for client
presentation (internal, reversible — a routed evaluation is a recommendation to present,
not a send). Persistence is the backend's idempotent INSERT (BE #439) — never Vera's;
remediation and client contact are never hers at any rung.

## Runtime skills

Domain-shared (Tier 2): `domains/platform/skills/posture-scoring-method.md` (criteria →
checks → overall_score, the conforming/drifting/critical bands — shared with B3 #1470 and
B5 #1472). The signal-vs-inference + audit-by-reference discipline is the shared
`conformance-engine` rubric, cited not restated. The structured manifest is `agent.yaml`;
the composed prose is `prose.md`.
