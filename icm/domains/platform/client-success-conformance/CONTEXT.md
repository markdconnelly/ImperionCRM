# Workflow: client-success-conformance (platform v1 — Bucket A6, Celeste)

**Job:** the **client-success-process conformance rulebook** — encode Celeste's **Defined Way**
as a machine-checkable ruleset and audit a completed Celeste run's process trace against it.
The rules that distinguish this workflow from the shared `conformance-engine` are Celeste's:
no-commitment (she never commits the company), advisory-only (MSSP-advisory, she presents and
recommends), handoff-consumed (she acts on the `relationship.*` handoff bus she subscribes to),
signal-vs-inference (health signals labeled, never asserted as fact), and no-financials-direct
(margin/finance is Audrey's handoff input, never read directly). Divergences this finds are
routed + closed by A9 (`deviation-lifecycle`, #1467). References the Celeste agent epic
**#1396**.

**Trigger:** a Celeste run completing (a client-success process trace landing), or an
on-demand client-success conformance sweep. One run per audited trace (or per sweep batch).
Backend-owed: Celeste must emit the process traces Vera audits (the event substrate, #991).

**What this is NOT:** no correction, no re-run, no rewrite, no config change, no client-touch,
no commitment. The audit produces a conformance finding (conform / diverged, with the rule +
the evidence by reference); the deviation routing + closure is A9 (#1467); any correction is
`always_gate` to Celeste / a human. Audit-by-reference: cite the location, never reproduce the
sensitive value (client PII, account-plan detail, the financials in a handoff).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-client-success-trace | Load the Celeste run's process trace + the client-success Defined-Way ruleset | — |
| 02 | evaluate-client-success-conformance | Evaluate the trace against the client-success rules (signal vs inference) | — |
| 03 | record-client-success-finding | Record the conformance finding (conform / diverged, by reference) | **Mark/Celeste loop** |

## Autonomy

Read-only audit; **tops out at L2** (Vera has no L3–L5 — every correction/config change is
`always_gate`). Default rung **L1** (draft the finding → park). At **L2**, the client-success
conformance audit auto-runs and the finding auto-surfaces to the governance dashboard
(internal, reversible). Routing the divergence to Celeste + tracking closure is A9's lifecycle
(#1467); the correction itself is `always_gate` to Celeste. Audit-by-reference — never
reproduce a sensitive value in a finding.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `client-success-defined-way.md` (Celeste's Defined Way
as a checkable ruleset — no-commitment, advisory-only, handoff-consumed, signal-vs-inference,
no-financials-direct, scope-stayed — each rule with an id, expectation, and severity). The
conform-vs-diverge call + signal-vs-inference + audit-by-reference discipline is the shared
`conformance-engine` rubric, cited not restated. The structured manifest is `agent.yaml`; the
composed prose is `prose.md`.
