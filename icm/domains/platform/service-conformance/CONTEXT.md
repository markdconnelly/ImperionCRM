# Workflow: service-conformance (platform v1 — Bucket A8, Felix)

**Job:** the **service-process conformance rulebook** — encode Felix's **Defined Way** as a
machine-checkable ruleset and audit a completed Felix run's process trace against it. The
rules that distinguish this workflow from the shared `conformance-engine` are Felix's:
ticket-anchored work, no-unapproved-time, client-reply-approved, and the escalation path.
Divergences this finds are routed + closed by A9 (`deviation-lifecycle`, #1467). References
the Felix agent epic **#1038**.

**Trigger:** a Felix run completing (a service process trace landing), or an on-demand service
conformance sweep. One run per audited trace (or per sweep batch). Backend-owed: Felix must
emit the process traces Vera audits (the event substrate, #991).

**What this is NOT:** no correction, no re-run, no rewrite, no config change, no re-sending of
a ticket reply. The audit produces a conformance finding (conform / diverged, with the rule +
the evidence by reference); the deviation routing + closure is A9 (#1467); any correction is
`always_gate` to Felix / a human. Audit-by-reference: cite the location, never reproduce the
sensitive value (ticket contents, client PII).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-service-trace | Load the Felix run's process trace + the service Defined-Way ruleset | — |
| 02 | evaluate-service-conformance | Evaluate the trace against the service rules (signal vs inference) | — |
| 03 | record-service-finding | Record the conformance finding (conform / diverged, by reference) | **Mark/Felix loop** |

## Autonomy

Read-only audit; **tops out at L2** (Vera has no L3–L5 — every correction/config change is
`always_gate`). Default rung **L1** (draft the finding → park). At **L2**, the service
conformance audit auto-runs and the finding auto-surfaces to the governance dashboard
(internal, reversible). Routing the divergence to Felix + tracking closure is A9's lifecycle
(#1467); the correction itself is `always_gate` to Felix. Audit-by-reference — never reproduce
a sensitive value in a finding.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `service-defined-way.md` (Felix's Defined Way as a
checkable ruleset — ticket-anchored, no-unapproved-time, client-reply-approved, escalation-
path, sla-tracked — each rule with an id, expectation, and severity). The conform-vs-diverge
call + signal-vs-inference + audit-by-reference discipline is the shared `conformance-engine`
rubric, cited not restated. The structured manifest is `agent.yaml`; the composed prose is
`prose.md`.
