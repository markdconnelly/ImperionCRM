# Stage 03 — brief

**Job:** produce Mark's audit-readiness brief from the synthesis, then park.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Synthesis | stage 02 `synthesis.md` | all | the gap-ranked compliance rollup |

## Process

1. `[sonnet]` Write the brief: a two-minute read leading with the control gaps
   and the evidence debt, then the passing tail — never a vanity score.
2. `[sonnet]` Render the gap list as the brief's action surface — each item the
   gap, the owning report, and the decision or evidence Mark must supply or
   approve. Roman frames; Mark decides — no attestation is made on his behalf.
3. `[script]` Park the brief for Mark. No send, no write, no control change.

## Outputs

`brief.md` — Mark's audit-readiness brief + the gap list, by reference. The run
parks here at the checkpoint; nothing is actuated.

## Audit

- [ ] Brief leads with control gaps and evidence debt; unknowns stated as unknown
- [ ] Gap list present; each item states the owner and the decision/evidence ask
- [ ] No attestation, policy decision, or control change made — every call framed for Mark
- [ ] No client PII, no secret values in the brief (audit by reference)
- [ ] No send, write, or actuation occurred — the run parked

## Checkpoint

The brief parks for **Mark** (the CISO). `auto` may self-approve ONLY publishing
the scheduled rollup when every control state is grounded and cited by
reference; any attestation ask, ambiguous control state, gap, or recall miss
parks for Mark (CONSTITUTION §8). No actuation exists at this tier — control
changes and remediations run inside the owning report under its gauntlet,
always-gated (ADR-0128).
