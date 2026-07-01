# Stage 02 — triage-and-route

**Job:** apply the severity → action map to each open deviation: request quarantine where
warranted, and draft the routing packet to the resolved owner.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Sweep manifest | `queue.md` (stage 01) | the open deviations + resolved owners | the triage material |
| Routing map | `./skills/deviation-routing.md` | severity → action map + routing table | what each severity gets |
| Conformance rubric | the shared `conformance-engine/skills/conformance-rubric.md` | signal-vs-inference + audit-by-reference | how to state the packet |

## Process

1. `[script]` For each **critical** deviation: request the reversible **quarantine** hold on
   the suspect output (framework-owned, room.md — Vera requests, the framework executes) and
   mark it for immediate Mark/Jessica surfacing alongside the owner routing.
2. `[haiku]` For every open deviation, draft the **routing packet**: deviation id, rule id +
   severity, the evidence **by reference** (trace id + location), the resolved owner, and
   what "resolved" must show (the closure bar). Label measured divergence vs inference.
3. `[script]` Never estimate a severity into a gap: a deviation whose rule/evidence cannot be
   read is flagged "not triageable — escalate," never guessed. Self-domain (platform)
   deviations route straight to Mark, never to Vera herself.

## Outputs

`routing.md` — per-deviation: the action taken (quarantine requested / advisory / actionable),
the routing packet, and the escalations. No sensitive values reproduced; no correction
proposed as Vera's own act.

## Audit

- [ ] Every critical deviation has a quarantine request + immediate Mark/Jessica surfacing
- [ ] Every open deviation has a routing packet (owner + evidence by reference + closure bar)
- [ ] No severity guessed into a gap; no self-routed platform deviation; no sensitive value reproduced
