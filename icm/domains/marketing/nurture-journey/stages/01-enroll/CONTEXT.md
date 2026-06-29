# Stage 01 — enroll

**Job:** enroll the triggering contact on the `workflow` journey substrate, capturing
its enrollment basis (segment / source) and its entry step.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Enrollment trigger | trigger payload | the one contact | who is enrolling and why (segment / lead / event / manual) |
| Contact | `` `okf:contact` `` | the enrolling contact | the kernel record the journey runs against |
| Journey definition | `` `okf:workflow` `` | the target journey | step graph + entry point (ADR-0073) |
| Current score | `` `okf:lead_score` `` | this contact | start state; below-MQL is the nurture precondition |

## Process

1. `[script]` Resolve the enrollment basis from the trigger: segment membership,
   sub-MQL captured lead (01-F), event follow-up (01-K), or manual. Dedupe against an
   existing active enrollment of this contact on this `workflow` — a re-enroll is a
   no-op, not a duplicate.
2. `[script]` Confirm the contact is below the MQL threshold (`lead_score`); an
   already-qualified contact does not nurture — route straight to progress (stage 04).
3. `[script]` Record the enrollment on the `workflow` substrate: the entry step, the
   segment/source basis, and the as-of (internal, reversible — L2).

## Outputs

`enrollment.md` — the contact id, the journey id, the enrollment basis (segment /
lead / event / manual), the entry step, and the start score, each with as-of.

## Audit

- [ ] Enrollment basis resolved and recorded (segment | lead | event | manual)
- [ ] Not a duplicate of an existing active enrollment for this contact/journey
- [ ] Contact confirmed below MQL (or routed straight to progress)
- [ ] Entry step + start score stamped with as-of
