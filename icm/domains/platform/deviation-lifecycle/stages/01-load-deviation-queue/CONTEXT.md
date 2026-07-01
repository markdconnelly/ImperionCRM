# Stage 01 — load-deviation-queue

**Job:** load the open + in-flight deviations from the queue and resolve each one's owner and
subject.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Deviation queue | governance substrate `conformance_deviation` + violated `conformance_rule` + evidencing `process_trace` (0257, IKF n/a, read via pg.read) | `open` rows + `routed`/`verifying` rows in the tracking window | the lifecycle's work queue |
| Routing map | `./skills/deviation-routing.md` | severity → action, domain → owner, closure bar | who owns each deviation and what happens next |
| Org SoT | `icm/org.yaml` | the domain-agent + human_manager entries | authority for the owner resolution (the routing map caches it) |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | the client/agent a deviation references | resolve who each finding concerns |

## Process

1. `[script]` Read the queue: `open` deviations (new triage work), plus `routed` and
   `verifying` deviations still inside the tracking window (closure tracking). Empty queue →
   a clean sweep, recorded as such.
2. `[script]` For each deviation, read its violated rule (id, severity, assertion kind) and
   its trace evidence **by reference** (trace id + step/fact key) — never the values.
3. `[script]` Resolve each deviation's owner from the routing map (domain → owning agent +
   human escalation); resolve the client/agent subject via `entity_xref`. An unresolvable
   owner is flagged for escalation — never silently dropped.

## Outputs

`queue.md` — the sweep manifest: each deviation (id, rule id, severity, status, evidence by
reference, resolved owner, subject by reference), plus any owner-resolution gaps. No
sensitive values reproduced.

## Audit

- [ ] Queue read (open + in-window routed/verifying; an empty queue recorded as clean)
- [ ] Every deviation carries rule id + severity + evidence by reference
- [ ] Every deviation has a resolved owner or an explicit escalation flag
