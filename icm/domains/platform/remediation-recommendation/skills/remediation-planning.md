# Remediation planning rules (Mark-editable — the get-back-in-shape plan shape, severity-first, advisory-only)

> DEFAULTS authored by the agent 2026-07-01. How the `remediation-recommendation` workflow
> (B4, #1471) turns a client's failing `posture_score` criteria into an **advisory**
> get-back-in-shape plan. The bands + per-criterion verdicts are the shared
> `domains/platform/skills/posture-scoring-method.md`; the signal-vs-inference +
> audit-by-reference discipline is the shared `conformance-engine` rubric — this file supplies
> only the plan shape. Mark: edit freely; stages cite this, nothing restates it.

## What a remediation step contains

One step **per failing criterion** (a `pass` or `not-assessable` criterion yields no step —
not-assessable is a **data gap**, surfaced as such, never a fabricated remediation):

- **The gap** — the criterion's bar (from the ratified `security_standard_version` criteria)
  vs what the snapshot measured, cited **by reference** (criterion id, snapshot id) — never
  the posture value itself.
- **The target** — the defined-good from the `posture_policy` golden baseline the criterion
  tracks. The plan aims the client at the golden baseline, not at some invented ideal.
- **The recommended action** — the remediation that would close the gap, **labeled
  inference** where it is a judgment (there is usually more than one path; the plan
  recommends, it does not dictate). Never estimate an action into a data gap.

## Severity-first ordering

Steps are ordered by the harm they address, not by ease:

1. **Critical first** — a criterion the standard **designates critical**, or a failure that
   drove the band to `critical`, leads the plan.
2. Then the remaining `drifting`-band failures, worst gap first.
3. Data gaps (not-assessable criteria) are listed **last, as gaps to close**, distinct from
   remediation steps — closing the visibility gap is itself a recommendation, not a fix.

The plan states the **band** it is closing (`drifting` / `critical`) and what a fully-actioned
plan would move the client to (labeled inference — the authoritative re-score is B2's, after
the client acts).

## Advisory only — NOT a work order

The plan is a **recommendation for a human/Datto to actuate** (the MSSP boundary, ADR-0124;
vera.md *measure → present → remediate*). It is **not** a work order Vera executes, **not** a
ticket she opens, and **not** an action against a client tenant. Vera never actuates
remediation at any rung. The plan carries no "done" state — Vera does not track remediation to
closure the way she tracks an internal deviation (that A9 lane, #1467, is internal
agent-process deviations, not client posture). She hands the plan to **Celeste to present**;
the client (via a human/Datto) acts; the next `posture_snapshot` + B2 re-score is what confirms
the gap closed — never Vera's assertion.

## Report by reference

Every gap, target, and action cites the verdict id, criterion id, and policy id — never the
posture value, never a client identifier, never a secret (CS-08 Data Classification §5;
vera.md). A remediation plan is a governance artifact; it names locations, not values.
