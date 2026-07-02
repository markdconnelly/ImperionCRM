# Workflow: remediation-recommendation (platform v1 — Bucket B4)

**Job:** produce the **advisory remediation plan** that closes a client's gap to the client
security standard (#1471) — read the client's latest `posture_score` verdict (the failing
criteria + band), and for each failing criterion assemble a get-back-in-shape step: the gap
to the criterion's bar, the target from the `posture_policy` golden baseline, and a
recommended remediation, ordered severity-first. **Advisory only** — the plan is delivered
via **Celeste** and remediated by a **human / Datto**; Vera never actuates remediation, never
opens a ticket, never touches a client tenant (the MSSP boundary, ADR-0124). The plan shape
is `./skills/remediation-planning.md`. References the Vera agent epic **#1397**.

**Trigger:** a `posture_score` verdict of `drifting` or `critical` landing for a client (from
B2 #1469 / B3 #1470 / the LP #399 sweep), or a Mark/Celeste request for a client's
get-back-in-shape plan. One run per (client, verdict).

**What this is NOT:** no remediation actuation, no ticket, no client contact, no DB write —
**Vera measures + plans; Celeste presents to the client; a human/Datto remediates** (the MSSP
boundary, vera.md). The plan is a **recommendation**, never a work order Vera executes. No
re-scoring (the verdict is read from the append-only 0256 ledger, never recomputed — that is
B2). A gap the snapshot cannot evidence is a stated data gap, never a fabricated step. This is
the **client** standard (0256), not the internal `docs/security/unified-security-standard.md`.
And the plan is **client-facing posture** routed via **Celeste** — never filed into the A9
deviation queue (`deviation-lifecycle`, #1467), which handles internal agent-process
deviations. Audit-by-reference: cite verdict id + criterion id + policy id, never posture
values.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-gap | Load the client's latest verdict + the failing criteria + the golden-baseline targets | — |
| 02 | draft-remediation-plan | Per failing criterion: gap → target → recommended step, severity-first | — |
| 03 | record-remediation-recommendation | Assemble the advisory plan; route to Celeste for client presentation | **Celeste seam** |

## Autonomy

**Tops out at L2** (Vera has no L3–L5). Default rung **L1** (draft the plan → park). At
**L2**, the plan auto-builds from a fresh `drifting`/`critical` verdict and auto-surfaces to
the governance dashboard + auto-routes to **Celeste** for client presentation (internal,
reversible — a routed plan is a recommendation to present, not a send, not a work order).
Remediation actuation, ticketing, and client contact are never Vera's at any rung — the fix
is always a human's/Datto's, presented by Celeste.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `remediation-planning.md` (the get-back-in-shape plan
shape, severity-first ordering, the advisory-only + MSSP boundary, and the NOT-a-work-order
discipline). The conforming/drifting/critical bands + the criterion verdicts are the shared
`posture-scoring-method.md` (cited, not restated); the signal-vs-inference + audit-by-reference
discipline is the shared `conformance-engine` rubric. The structured manifest is `agent.yaml`;
the composed prose is `prose.md`.
