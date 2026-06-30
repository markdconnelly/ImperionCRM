# Stage 03 — rights-gate

**Job:** gate any use of the customer's name or logo as a rights commitment,
bounded to the consented scope.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Captured reference | stage 02 output | this reference | the proof + its in-scope attribution |
| Verified consent | stage 01 output | this candidate | the consent_event + scope of use the rights request must fall within |
| Rights rules | `./skills/consent-and-rights.md` | all | name/logo-use is always_gate, human, marketing-owned; scope-bound |

## Process

1. `[sonnet]` Classify the requested use from the captured reference:
   **name use** / **logo use** / **quote**.
2. `[script]` Mark any **name or logo use** `always_gate`, human,
   **MARKETING-owned** (not Legal in v1). Confirm the requested use falls **within
   the consent scope** (stage 01); a use **beyond scope → PARK**.
3. `[script]` Present the easy-button: the classified use + the consent-scope
   evidence (the backing `consent_event` reference) + a one-click **human approve**.

## Outputs

`proposed-rights-use.md` — the classified use (name | logo | quote), the
`always_gate` marking, the consent-scope coverage check, and the gate routing
decision. Reference data by id, no PII.

## Audit

- [ ] Any name or logo use is marked `always_gate`, human, marketing-owned
- [ ] The consent scope (stage 01) covers the requested use (a use beyond scope is
      **parked**)
- [ ] No client-contact / send action is taken here (BO-04 refusal floor)

## Checkpoint

**A human approves the rights use in the cockpit.** This is a **rights
commitment**: it **never** self-approves at any rung, in any mode — `always_gate`,
human, marketing-owned (not Legal in v1). A **quote** use is bounded by the
captured reference's in-scope verbatim; a **use beyond the consented scope** parks
for a human in every mode.
