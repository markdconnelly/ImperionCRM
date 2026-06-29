# Stage 02 — build-checklist

**Job:** turn the offboarding context into one ordered offboarding checklist —
access/asset return (deprovisioning handoff to Osiris), knowledge handoff,
payroll/benefits closeout, exit steps — with owners and dependencies. Names the
steps; actuates nothing.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Context | `offboarding-context.md` (stage 01 output) | all | the confirmed role/access/asset footprint |
| Offboarding playbook | prior offboarding context via `memory.recall` | cited captures | the standard checklist set + ordering |
| Closeout norms | `knowledge.search` (gold, cited) | role/team offboarding norms | scope the access-return + closeout items |

> No OKF entity is grounded here — there are no `okf:` markers. Steps are described
> by reference; no PII enters the checklist (ADR-0060).

## Process

1. `[sonnet]` Assemble the offboarding checklist: the **access/asset return**
   (deprovisioning handoff to Osiris — Osiris executes), the **knowledge handoff**,
   the **payroll/benefits closeout**, and the **exit steps**. One line each.
2. `[script]` Order the items and mark dependencies (e.g. knowledge handoff before
   access revocation; last-day before final closeout) and the owner of each (Osiris,
   manager, payroll, IT).
3. `[script]` Flag any item that deprovisions, sends, or touches employment,
   compensation, or PII as **human-only** — it is named but not actionable by this
   workflow.

## Outputs

`offboarding-checklist.md` — the ordered checklist with owners, dependencies, and
human-only flags. A deprovisioning handoff request to Osiris (by reference). No
actuation occurs in this stage.

## Audit

- [ ] Access/asset return, knowledge handoff, payroll/benefits closeout, and exit steps all present
- [ ] Every item has an owner and its dependencies stated
- [ ] Any deprovisioning/employment/comp/PII item is flagged human-only (not auto-actionable)
