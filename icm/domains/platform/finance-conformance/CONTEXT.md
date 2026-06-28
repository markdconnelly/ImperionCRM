# Workflow: finance-conformance (platform v1 — Bucket A5, Audrey)

**Job:** the **finance-process conformance rulebook** — encode Audrey's **Defined Way** as a
machine-checkable ruleset and audit a completed Audrey run's process trace against it. The
rules that distinguish this workflow from the shared `conformance-engine` are Audrey's:
read-only (QBO is system-of-record), the salary-gag, the attestation chain, and no money
movement. Divergences this finds are routed + closed by A9 (`deviation-lifecycle`, #1467).
References the Audrey agent epic **#1394**.

**Trigger:** an Audrey run completing (a finance process trace landing), or an on-demand
finance conformance sweep. One run per audited trace (or per sweep batch). Backend-owed:
Audrey must emit the process traces Vera audits (the event substrate, #991).

**What this is NOT:** no correction, no re-run, no rewrite, no config change, no money
movement. The audit produces a conformance finding (conform / diverged, with the rule + the
evidence by reference); the deviation routing + closure is A9 (#1467); any correction is
`always_gate` to Audrey / a human. Audit-by-reference: cite the location, never reproduce the
sensitive value (salary/comp, invoice amounts, account numbers).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-finance-trace | Load the Audrey run's process trace + the finance Defined-Way ruleset | — |
| 02 | evaluate-finance-conformance | Evaluate the trace against the finance rules (signal vs inference) | — |
| 03 | record-finance-finding | Record the conformance finding (conform / diverged, by reference) | **Mark/Audrey loop** |

## Autonomy

Read-only audit; **tops out at L2** (Vera has no L3–L5 — every correction/config change is
`always_gate`). Default rung **L1** (draft the finding → park). At **L2**, the finance
conformance audit auto-runs and the finding auto-surfaces to the governance dashboard
(internal, reversible). Routing the divergence to Audrey + tracking closure is A9's lifecycle
(#1467); the correction itself is `always_gate` to Audrey. Audit-by-reference — never
reproduce a sensitive value in a finding.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `finance-defined-way.md` (Audrey's Defined Way as a
checkable ruleset — read-only, salary-gag, attestation-chain, qbo-precheck, no-money-move —
each rule with an id, expectation, and severity). The conform-vs-diverge call +
signal-vs-inference + audit-by-reference discipline is the shared `conformance-engine` rubric,
cited not restated. The structured manifest is `agent.yaml`; the composed prose is `prose.md`.
