# Workflow: conformance-engine (platform v1)

**Job:** the foundational **process-conformance audit** — evaluate an agent run's
process trace against that domain's encoded **Defined Way** (the SOP + guardrails as a
machine-checkable ruleset) and flag where the run **diverged**. This is the shared
substrate the per-domain rulebooks (A2–A8, #1460–#1466) hang off; A9 (#1467) routes the
deviations this finds. Vera flags divergence — she does **not** re-run the work.

**Trigger:** an agent run completing (a process trace landing), or an on-demand audit
sweep. One run per audited trace (or per sweep batch). Backend-owed: each agent must emit
the process traces Vera audits (the event substrate, #991).

**What this is NOT:** no correction, no re-run, no rewrite, no config change. The audit
produces a conformance finding (conform / diverged, with the rule + the evidence by
reference); the deviation routing + closure is A9 (#1467); any correction is `always_gate`
to the owner. Audit-by-reference: cite the location, never reproduce the sensitive value.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-trace-rulebook | Load the run's process trace + the domain's Defined-Way ruleset | — |
| 02 | evaluate-conformance | Evaluate the trace against the rules; identify divergence (signal vs inference) | — |
| 03 | record-finding | Record the conformance finding (conform / diverged, by reference) | **Mark/owner loop** |

## Autonomy

Read-only audit; **tops out at L2** (Vera has no L3–L5 — every correction/config change is
`always_gate`). Default rung **L1** (draft the finding → park). At **L2**, the conformance
audit auto-runs and the finding auto-surfaces to the dashboard (internal, reversible). A
**quarantine** of a suspect output (reversible protective hold) and the deviation routing
are A9's lifecycle; the correction itself is `always_gate` to the owner. Audit-by-reference
— never reproduce a sensitive value in a finding.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `conformance-rubric.md` (how a Defined-Way ruleset is
shaped, the conform-vs-diverge call, the signal-vs-inference + audit-by-reference
discipline). Mark-editable; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose is
`prose.md`.
