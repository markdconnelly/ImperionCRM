# Workflow: procurement-conformance (platform v1 — Bucket A7, Vance)

**Job:** the **procurement-process conformance rulebook** — encode Vance's **Defined Way** as
a machine-checkable ruleset and audit a completed Vance run's process trace against it. The
rules that distinguish this workflow from the shared `conformance-engine` are Vance's:
approve-once-at-the-money-gate, no-unapproved-order, governed-sequence, and no-rollback-
assumed. Divergences this finds are routed + closed by A9 (`deviation-lifecycle`, #1467).
References the Vance agent epic **#1398**.

**Trigger:** a Vance run completing (a procurement process trace landing), or an on-demand
procurement conformance sweep. One run per audited trace (or per sweep batch). Backend-owed:
Vance must emit the process traces Vera audits (the event substrate, #991).

**What this is NOT:** no correction, no re-run, no rewrite, no config change, no re-ordering.
The audit produces a conformance finding (conform / diverged, with the rule + the evidence by
reference); the deviation routing + closure is A9 (#1467); any correction is `always_gate` to
Vance / a human. Audit-by-reference: cite the location, never reproduce the sensitive value
(vendor pricing, order amounts, license counts).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-procurement-trace | Load the Vance run's process trace + the procurement Defined-Way ruleset | — |
| 02 | evaluate-procurement-conformance | Evaluate the trace against the procurement rules (signal vs inference) | — |
| 03 | record-procurement-finding | Record the conformance finding (conform / diverged, by reference) | **Mark/Vance loop** |

## Autonomy

Read-only audit; **tops out at L2** (Vera has no L3–L5 — every correction/config change is
`always_gate`). Default rung **L1** (draft the finding → park). At **L2**, the procurement
conformance audit auto-runs and the finding auto-surfaces to the governance dashboard
(internal, reversible). Routing the divergence to Vance + tracking closure is A9's lifecycle
(#1467); the correction itself is `always_gate` to Vance. Audit-by-reference — never
reproduce a sensitive value in a finding.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `procurement-defined-way.md` (Vance's Defined Way as a
checkable ruleset — approve-once-money-gate, no-unapproved-order, sequence-governed,
right-sizing-evidence, no-rollback-assumed — each rule with an id, expectation, and severity).
The conform-vs-diverge call + signal-vs-inference + audit-by-reference discipline is the
shared `conformance-engine` rubric, cited not restated. The structured manifest is
`agent.yaml`; the composed prose is `prose.md`.
