# Conformance rubric (Mark-editable — Defined-Way ruleset shape + conform-vs-diverge + audit-by-reference)

> DEFAULTS authored by the agent 2026-06-28. The rubric for `conformance-engine`: how a
> domain's Defined-Way is shaped as a checkable ruleset, how to make the conform-vs-diverge
> call, and the signal-vs-inference + audit-by-reference discipline. Mark: edit freely;
> stages cite this, nothing restates it.

## What a "Defined-Way ruleset" is

Every domain has a *defined way* — the SOP + guardrails of how that domain works (clients
marketed a defined way, sales sells a defined way, delivery delivers a defined way, finance
reads a defined way). The conformance engine reads that defined way as a **machine-checkable
ruleset**: a list of rules, each one a single observable expectation about a run's process
trace. A rule has:

- an **id** (stable, citable in a finding — e.g. `sales.no-send-without-consent`),
- an **expectation** (what the trace must show — a stage reached, a checkpoint hit, an
  `always_gate` honored, a tool stayed within scope, a value labeled signal-vs-inference),
- a **severity** (advisory · standard · hard) — a hard rule is a guardrail/ceiling
  violation, the highest-priority divergence.

The per-domain rulebooks (A2–A8, #1460–#1466) supply the rules for each domain. This engine
is domain-agnostic: it evaluates whatever ruleset it is handed against whatever trace it is
handed.

## The conform-vs-diverge call

Per rule, exactly one verdict:

| Verdict | When |
|---|---|
| **conform** | the trace shows the expectation was met (measured evidence present). |
| **diverged** | the trace shows the expectation was NOT met (measured counter-evidence present). |
| **not-assessable** | the trace lacks the evidence to decide either way. **Never default to conform.** A missing trace field is an honest "can't tell," recorded as such and surfaced as a data gap. |

A run is **conform** overall only when every hard + standard rule conforms; any hard-rule
divergence makes the overall finding **diverged** regardless of the rest.

## Signal vs inference (always label)

- **Measured divergence** — the trace itself shows the violation (a send with no prior
  `consent.check`, a stage skipped, an `always_gate` action auto-executed). State it as fact.
- **Inference** — you reason a divergence is *likely* from indirect signals but the trace
  doesn't show it directly. Label it inference and lower your confidence. Never present an
  inference as a measured finding.
- **Never estimate into a gap.** If the trace can't tell you, the rule is not-assessable —
  do not guess a verdict to make the audit look complete.

## Audit-by-reference (hard — peer of Audrey's salary gag)

Vera's audit read scope crosses `financial` / `pii` / `sec` / `credential` data (the
audit-exemption read, vera.md). The discipline that makes that safe:

- **Cite the location, never the value.** A finding says "PII leak in run X, field Y" or
  "send at stage 04 with no consent basis in run Z" — it **never reproduces** the leaked
  value, the credential, the salary, or the client PII.
- **By reference means rule id + trace location + as-of trace id.** That is enough for the
  owner to act; the raw value never enters a finding, a dashboard row, an issue, or a PR.

## What this engine NEVER does

- **No correction, no re-run, no rewrite, no config change.** The engine produces a finding;
  the correction is `always_gate` to the owning agent / human (vera.md). Vera audits the
  levers; she never holds them.
- **No deviation routing or closure here** — that is A9 (#1467). This engine flags; A9 routes
  the flag to the owner and tracks it to closure.
- **No promotion / demotion of autonomy** — the earned-autonomy state machine is
  framework-owned + deterministic (ADR-0121); Vera observes it, never runs it.
