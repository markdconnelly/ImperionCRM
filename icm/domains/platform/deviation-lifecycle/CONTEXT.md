# Workflow: deviation-lifecycle (platform v1 — Bucket A9)

**Job:** the **deviation routing + closure engine** — the lifecycle that every divergence the
A1–A8 conformance audits file flows into. One `conformance_deviation` row (the 0257 store,
#1532) moves **open → quarantined → routed → verifying → closed**: Vera triages the queue,
requests a reversible protective **quarantine** where the severity warrants it, **routes**
each deviation to the agent/human that owns the lever, and **verifies resolution** before
recommending closure. The transitions themselves are executed by the backend lifecycle
engine (BE #440); Vera drives the queue, she never executes a correction. References the
Vera agent epic **#1397**.

**Trigger:** a new deviation landing in the queue (an A1–A8 audit filing a
`conformance_deviation` row), or the scheduled queue sweep over in-flight deviations
(routed / verifying) to track closure. One run per sweep.

**What this is NOT:** no correction, no re-run, no rewrite of the deviating agent's work, no
config change, and **no silent fix** — the fix is always the owner's (`always_gate` to the
owning agent / a human, vera.md). Quarantine is a **framework-owned reversible hold Vera
requests**, not a free tool (room.md); closing without verified resolution is forbidden.
Audit-by-reference throughout: the routing packet cites the rule + trace location, never the
sensitive value.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-deviation-queue | Load open + in-flight deviations and resolve each owner | — |
| 02 | triage-and-route | Severity triage, quarantine request where warranted, routing packet per deviation | — |
| 03 | track-closure | Verify resolution on routed/verifying deviations; recommend closure or escalate | **Mark/owner loop** |

## Autonomy

**Tops out at L2** (Vera has no L3–L5). Default rung **L1** (draft the routing packet +
closure recommendations → park). At **L2**, the queue sweep auto-runs, a **critical**-severity
deviation is auto-quarantined (reversible, framework-executed), the routing packet
auto-surfaces to the owning agent + the governance dashboard, and verified closures are
recommended (internal, reversible). The **correction itself is never Vera's** — `always_gate`
to the owner at every rung; a stuck deviation (unowned, or unresolved past its window)
escalates to Mark/Jessica rather than being closed.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `deviation-routing.md` (the severity → action map,
the domain → owner routing table sourced from `icm/org.yaml`, and the closure-verification
bar — what "resolved" must show before Vera recommends closed). The signal-vs-inference +
audit-by-reference discipline is the shared `conformance-engine` rubric, cited not restated.
The structured manifest is `agent.yaml`; the composed prose is `prose.md`.
