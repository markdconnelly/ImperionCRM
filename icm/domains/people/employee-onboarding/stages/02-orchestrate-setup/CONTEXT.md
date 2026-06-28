# Stage 02 — orchestrate-setup

**Job:** turn the confirmed intake into one sequenced onboarding plan — provisioning
handoff to Osiris, per-employee-brain spin-up, IT setup — with owners and
dependencies. Names the steps; actuates nothing.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Intake | `intake.md` (stage 01 output) | all | the confirmed role context |
| Onboarding playbook | prior onboarding context via `memory.recall` | cited captures | the standard step set + ordering |
| Setup norms | `knowledge.search` (gold, cited) | role/team setup norms | scope the IT-setup + access requests |

> No OKF entity is grounded here — there are no `okf:` markers. Steps are described
> by reference; no PII enters the plan (ADR-0060).

## Process

1. `[sonnet]` Assemble the onboarding step set: the **provisioning handoff to
   Osiris** (accounts/access — Osiris executes), the **per-employee-brain spin-up
   request**, and the **IT-setup requests** (device/software). One line each.
2. `[script]` Order the steps and mark dependencies (e.g. provisioning before
   first-day IT setup) and the owner of each (Osiris, platform, IT).
3. `[script]` Flag any step that touches employment, compensation, or PII as
   **human-only** — it is named but not actionable by this workflow.

## Outputs

`onboarding-plan.md` — the ordered step set with owners, dependencies, and
human-only flags. A handoff request to Osiris for provisioning (by reference). No
actuation occurs in this stage.

## Audit

- [ ] Provisioning handoff to Osiris, brain spin-up, and IT setup all present
- [ ] Every step has an owner and its dependencies stated
- [ ] Any employment/comp/PII step is flagged human-only (not auto-actionable)
