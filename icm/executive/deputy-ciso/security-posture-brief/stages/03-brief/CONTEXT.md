# Stage 03 — brief

**Job:** produce Mark's security-posture brief plus the escalations, then park.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Synthesis | stage 02 `synthesis.md` | all | the exposure-ranked roll-up |

## Process

1. `[sonnet]` Write the brief: a two-minute read leading with active threats,
   control gaps, and stale access, then the rest of the posture.
2. `[sonnet]` Render the escalation list as the brief's action surface — each item
   the exposure and the decision Mark must make.
3. `[script]` Park the brief for Mark. No send, no delegate, no write. A real
   incident escalates immediately.

## Outputs

`brief.md` — Mark's posture brief + the escalation list, by reference. The run ends
here at the checkpoint; nothing is actuated.

## Audit

- [ ] Brief leads with exposure (threats / gaps / stale access)
- [ ] Escalation list present; each item states the exposure and the decision
- [ ] No client PII, no secrets in the brief (audit by reference)
- [ ] No send, delegate, or write occurred — the run parked

## Checkpoint

The brief parks for **Mark** (the CISO). `auto` may self-approve ONLY publishing
the scheduled brief when every section is grounded and cited by reference; any
active incident, escalation, gap, or recall miss parks for Mark (CONSTITUTION §8).
No actuation exists at this tier — Roman briefs and delegates; containment runs in
the sub-agents under their IR runbooks.
