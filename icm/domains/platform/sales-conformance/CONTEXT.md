# Workflow: sales-conformance (platform v1 — Bucket A2, Chase)

**Job:** the **sales-process conformance rulebook** — encode Chase's **Defined Way** as a
machine-checkable ruleset and audit a completed Chase run's process trace against it. The
rules that distinguish this workflow from the shared `conformance-engine` are Chase's: the
opportunity-first SOP, the lead-response SLA, the no-commit guardrail, and the MQL handoff.
Divergences this finds are routed + closed by A9 (`deviation-lifecycle`, #1467). References
the Chase agent epic **#1392**.

**Trigger:** a Chase run completing (a sales process trace landing), or an on-demand sales
conformance sweep. One run per audited trace (or per sweep batch). Backend-owed: Chase must
emit the process traces Vera audits (the event substrate, #991).

**What this is NOT:** no correction, no re-run, no rewrite, no config change, no re-sending
of a sales message. The audit produces a conformance finding (conform / diverged, with the
rule + the evidence by reference); the deviation routing + closure is A9 (#1467); any
correction is `always_gate` to Chase / a human. Audit-by-reference: cite the location, never
reproduce the sensitive value (lead PII, deal terms).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-sales-trace | Load the Chase run's process trace + the sales Defined-Way ruleset | — |
| 02 | evaluate-sales-conformance | Evaluate the trace against the sales rules (signal vs inference) | — |
| 03 | record-sales-finding | Record the conformance finding (conform / diverged, by reference) | **Mark/Chase loop** |

## Autonomy

Read-only audit; **tops out at L2** (Vera has no L3–L5 — every correction/config change is
`always_gate`). Default rung **L1** (draft the finding → park). At **L2**, the sales
conformance audit auto-runs and the finding auto-surfaces to the governance dashboard
(internal, reversible). Routing the divergence to Chase + tracking closure is A9's lifecycle
(#1467); the correction itself is `always_gate` to Chase. Audit-by-reference — never
reproduce a sensitive value in a finding.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `sales-defined-way.md` (Chase's Defined Way as a
checkable ruleset — opportunity-first, lead-response SLA, no-commit, MQL handoff — each rule
with an id, expectation, and severity). The conform-vs-diverge call + signal-vs-inference +
audit-by-reference discipline is the shared `conformance-engine` rubric, cited not restated.
The structured manifest is `agent.yaml`; the composed prose is `prose.md`.
