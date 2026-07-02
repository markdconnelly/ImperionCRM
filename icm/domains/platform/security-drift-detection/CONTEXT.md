# Workflow: security-drift-detection (platform v1 — Bucket B3)

**Job:** detect a client **falling out of alignment** with the client security standard since
its last evaluation (#1470) — compare the client's newest `posture_score` verdict against its
prior verdicts under the same ratified `security_standard_version` (mig 0256) and flag
drift: a status downgrade, a score dropping past a band, or a new criterion failure. What
counts as drift vs noise is the shared method
(`domains/platform/skills/posture-scoring-method.md`). The finding is advisory and routes via
**Celeste** (client-facing posture); a **critical** drift also surfaces to **Mark**.
References the Vera agent epic **#1397**.

**Trigger:** a new `posture_score` verdict landing for a client (B2 / LP #399's scheduled
cycle, persisted by BE #439), or the scheduled fleet drift sweep. One run per client (or per
sweep batch).

**What this is NOT:** no re-scoring (verdicts are read from the append-only ledger, never
recomputed in place — 0256), no remediation, no client contact, no DB write — **Vera
measures; Celeste presents to the client; a human/Datto remediates** (the MSSP boundary,
vera.md). A standard-version change is never counted as drift — that is B5's re-evaluation
(#1472). Not the internal `docs/security/unified-security-standard.md`. And drift findings
are client-facing posture routed via **Celeste** — never filed into the A9 deviation queue
(`deviation-lifecycle`, #1467), which handles internal agent-process deviations.
Audit-by-reference: cite verdict ids + criterion ids, never posture values.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-score-history | Load the client's verdict history + freshest snapshot context | — |
| 02 | detect-drift | Compare newest vs prior verdict: downgrade, band drop, new failures | — |
| 03 | record-drift-finding | Advisory drift finding routed via Celeste; critical drift to Mark | **Celeste/Mark loop** |

## Autonomy

**Tops out at L2** (Vera has no L3–L5). Default rung **L1** (draft the drift finding →
park). At **L2**, the drift sweep auto-runs on a fresh verdict, and the advisory finding
auto-surfaces to the governance dashboard and auto-routes to **Celeste** — internal,
reversible; a **critical** drift additionally auto-surfaces to **Mark**. No re-score, no
remediation, no client contact at any rung — the fix is always a human's/Datto's, presented
by Celeste.

## Runtime skills

Domain-shared (Tier 2): `domains/platform/skills/posture-scoring-method.md` (the drift
definition — downgrade / band drop / new failure — and what is noise, not drift; shared
with B2 #1469 and B5 #1472). The signal-vs-inference + audit-by-reference discipline is the
shared `conformance-engine` rubric, cited not restated. The structured manifest is
`agent.yaml`; the composed prose is `prose.md`.
