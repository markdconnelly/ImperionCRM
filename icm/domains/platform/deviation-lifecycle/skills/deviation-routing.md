# Deviation routing map (Mark-editable — severity → action, domain → owner, the closure bar)

> DEFAULTS authored by the agent 2026-07-01. How the `deviation-lifecycle` workflow (A9,
> #1467) triages, routes, and closes the `conformance_deviation` rows the A1–A8 audits file
> (0257 store). The signal-vs-inference + audit-by-reference discipline is the shared
> `conformance-engine` rubric — this file supplies only the lifecycle rules. Mark: edit
> freely; stages cite this, nothing restates it.

## Severity → action map

Severity is copied from the violated rule at filing time (`info | warn | critical`, 0257).

| severity | action on triage |
|---|---|
| `info` | Route to the owner as an advisory packet; no quarantine; batch into the owner's next digest. |
| `warn` | Route to the owner as an actionable packet; no quarantine by default; escalate if a second `warn` fires on the same rule + agent inside the tracking window. |
| `critical` | **Request the reversible quarantine hold first** (framework-executed, room.md), then route to the owner AND surface to Mark/Jessica immediately. A critical deviation is a guardrail/ceiling violation — the highest-priority routing. |

## Domain → owner routing table

The owner of a deviation is the **agent that owns the deviating workflow's domain**, with its
`human_manager` as the human escalation path — both sourced from `icm/org.yaml` (the org SoT;
this table is a cached read, org.yaml wins on conflict). Route to the agent; escalate to the
human when the agent cannot act (a persona/ceiling problem, not a run problem) or the window
lapses.

| deviation domain | owning agent | human escalation |
|---|---|---|
| sales | Chase | derek |
| marketing | Belle | derek |
| client-success | Celeste | caity |
| finance | Audrey | nick |
| procurement | Vance | nick |
| service | Felix | brandon |
| delivery (projects) | Pierce | anna |
| partnerships | Bridget | nick |
| platform (self) | **never self-routed** — a deviation in Vera's own domain goes straight to Mark (she never marks her own homework, vera.md §2) | mark |
| any other / unresolvable | escalate to Jessica (CRO) + Mark | mark |

## The closure-verification bar

A deviation is recommended `closed` ONLY when resolution is **verified against the record**:

1. **Re-check the evidence** — a fresh `process_trace` for the same agent + workflow no longer
   violates the rule, OR the owner's fix reconciles against the original trace evidence
   (the specific step/fact that violated now conforms).
2. **The owner acted** — the routing packet was acknowledged/acted on by the owner; Vera's own
   hold lifting is not resolution.
3. **By reference** — the verification cites the fresh trace id / the reconciled location,
   never the sensitive value.

Failing any of the three: the deviation **stays open** (stated plainly, "unverified — pending
owner action"), and past the tracking window (default: 7 days `warn`+, 30 days `info`) it
escalates to Mark/Jessica. Age, inconvenience, or an unowned queue never close a deviation.

## What this map never asserts

It never authorizes a correction, a re-run, a rewrite, or a config change — the fix is
`always_gate` to the owner (vera.md), and the state transitions execute in the backend
lifecycle engine (BE #440). It only encodes who gets the packet, when a hold is requested,
and what "resolved" must show.
