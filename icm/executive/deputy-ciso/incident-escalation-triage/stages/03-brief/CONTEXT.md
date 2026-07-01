# Stage 03 — brief

**Job:** produce Mark's escalation brief from the triage, then park.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Synthesis | stage 02 `synthesis.md` | all | the triaged incident list + escalations |

## Process

1. `[sonnet]` Write the brief: a two-minute read leading with the active
   incidents and their blast radius, then the contained-but-unverified tail.
   Cadence short; no theater.
2. `[sonnet]` Render the Mark-now escalation list as the brief's action surface —
   each item the exposure, the blast radius, and the decision Mark must make.
   Roman frames the decision; he never makes the security-policy call.
3. `[script]` Park the brief for Mark. No send, no write, no containment. A real
   active incident escalates immediately.

## Outputs

`brief.md` — Mark's escalation brief + the Mark-now list, by reference. The run
parks here at the checkpoint; nothing is actuated.

## Audit

- [ ] Brief leads with active incidents and blast radius
- [ ] Escalation list present; each item states the exposure and the decision
- [ ] No security-policy decision made — every call framed for Mark
- [ ] No client PII, no secret values in the brief (audit by reference)
- [ ] No send, containment, or write occurred — the run parked

## Checkpoint

The brief parks for **Mark** (the CISO). `auto` may self-approve ONLY publishing
the scheduled triage brief when every item is grounded and cited by reference;
any active incident, ambiguous severity call, gap, or recall miss parks for Mark
(CONSTITUTION §8). No actuation exists at this tier — containment runs inside
Cyrus under his IR runbook and gauntlet, always-gated (CS-IR §5).
