# Workflow: marketing-conformance (platform v1 — Bucket A3, Belle)

**Job:** the **marketing-process conformance rulebook** — encode Belle's **Defined Way** as a
machine-checkable ruleset and audit a completed Belle run's process trace against it. The
rules that distinguish this workflow from the shared `conformance-engine` are Belle's: the
all-social-approved guardrail, compose-once/fan-out, the public-vs-DM path split, and the
ad-budget ceiling. Divergences this finds are routed + closed by A9 (`deviation-lifecycle`,
#1467). References the Belle agent epic **#1393**.

**Trigger:** a Belle run completing (a marketing process trace landing), or an on-demand
marketing conformance sweep. One run per audited trace (or per sweep batch). Backend-owed:
Belle must emit the process traces Vera audits (the event substrate, #991).

**What this is NOT:** no correction, no re-run, no rewrite, no config change, no re-sending
of a social post / comment / DM. The audit produces a conformance finding (conform /
diverged, with the rule + the evidence by reference); the deviation routing + closure is A9
(#1467); any correction is `always_gate` to Belle / a human. Audit-by-reference: cite the
location, never reproduce the sensitive value (audience PII, ad spend, campaign terms).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-marketing-trace | Load the Belle run's process trace + the marketing Defined-Way ruleset | — |
| 02 | evaluate-marketing-conformance | Evaluate the trace against the marketing rules (signal vs inference) | — |
| 03 | record-marketing-finding | Record the conformance finding (conform / diverged, by reference) | **Mark/Belle loop** |

## Autonomy

Read-only audit; **tops out at L2** (Vera has no L3–L5 — every correction/config change is
`always_gate`). Default rung **L1** (draft the finding → park). At **L2**, the marketing
conformance audit auto-runs and the finding auto-surfaces to the governance dashboard
(internal, reversible). Routing the divergence to Belle + tracking closure is A9's lifecycle
(#1467); the correction itself is `always_gate` to Belle. Audit-by-reference — never
reproduce a sensitive value in a finding.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `marketing-defined-way.md` (Belle's Defined Way as a
checkable ruleset — all-social-approved, compose-once/fan-out, public-vs-DM, ad-budget
ceiling, brand-voice, no-PII-in-public — each rule with an id, expectation, and severity).
The conform-vs-diverge call + signal-vs-inference + audit-by-reference discipline is the
shared `conformance-engine` rubric, cited not restated. The structured manifest is
`agent.yaml`; the composed prose is `prose.md`.
