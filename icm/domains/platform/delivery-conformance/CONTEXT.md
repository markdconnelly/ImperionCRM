# Workflow: delivery-conformance (platform v1 — Bucket A4, Pierce)

**Job:** the **delivery/PM-process conformance rulebook** — encode Pierce's **Defined Way** as
a machine-checkable ruleset and audit a completed Pierce run's process trace against it. The
rules that distinguish this workflow from the shared `conformance-engine` are Pierce's:
plan-anchored work, milestone-gate integrity, no-unapproved-provisioning, and change-control.
Divergences this finds are routed + closed by A9 (`deviation-lifecycle`, #1467). References
the Pierce agent epic **#1395**.

**Trigger:** a Pierce run completing (a delivery/PM process trace landing), or an on-demand
delivery conformance sweep. One run per audited trace (or per sweep batch). Backend-owed:
Pierce must emit the process traces Vera audits (the event substrate, #991).

**What this is NOT:** no correction, no re-run, no rewrite, no config change, no re-provisioning.
The audit produces a conformance finding (conform / diverged, with the rule + the evidence by
reference); the deviation routing + closure is A9 (#1467); any correction is `always_gate` to
Pierce / a human. Audit-by-reference: cite the location, never reproduce the sensitive value
(client PII, project financials).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-delivery-trace | Load the Pierce run's process trace + the delivery Defined-Way ruleset | — |
| 02 | evaluate-delivery-conformance | Evaluate the trace against the delivery rules (signal vs inference) | — |
| 03 | record-delivery-finding | Record the conformance finding (conform / diverged, by reference) | **Mark/Pierce loop** |

## Autonomy

Read-only audit; **tops out at L2** (Vera has no L3–L5 — every correction/config change is
`always_gate`). Default rung **L1** (draft the finding → park). At **L2**, the delivery
conformance audit auto-runs and the finding auto-surfaces to the governance dashboard
(internal, reversible). Routing the divergence to Pierce + tracking closure is A9's lifecycle
(#1467); the correction itself is `always_gate` to Pierce. Audit-by-reference — never
reproduce a sensitive value in a finding.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `delivery-defined-way.md` (Pierce's Defined Way as a
checkable ruleset — plan-anchored, milestone-integrity, no-unapproved-provision, change-
control, raid-tracked — each rule with an id, expectation, and severity). The conform-vs-
diverge call + signal-vs-inference + audit-by-reference discipline is the shared
`conformance-engine` rubric, cited not restated. The structured manifest is `agent.yaml`; the
composed prose is `prose.md`.
