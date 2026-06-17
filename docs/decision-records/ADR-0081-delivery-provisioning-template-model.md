---
adr: 0081
title: "Delivery provisioning — template model, human-triggered bridge, contract gate"
status: proposed
date: 2026-06-13
repo: frontend
summary: "Data-driven delivery templates. New frontend-owned schema (migration 0084)"
tags: [sale-delivery]
consolidated_into: ADR-0096
---
# ADR-0081: Delivery provisioning — template model, human-triggered bridge, contract gate

> Carried in the consolidated dossier [ADR-0096](ADR-0096-sale-delivery-consolidated.md) for zero-loss; retained for history. **Status preserved as Proposed — this decision is NOT yet ratified; consolidation did not promote it to accepted/consolidated.**

| Field | Value |
|---|---|
| **Repo** | frontend (schema + GUI); backend (executor consumes); local-pipeline / pipeline (reconcile) |
| **Status** | Proposed |
| **Date** | 2026-06-13 |
| **Cross-references** | ADR-0080 (sale→delivery orchestration), ADR-0052 (one project/task model), ADR-0037 (onboarding template), ADR-0071 (#318 DocuSign), ADR-0042 (four-repo contract), ADR-0039 (per-source bronze) |

## Problem

ADR-0080 settled the orchestration *spine*: a won KQM quote becomes an Autotask
Project (template-emulated) + JIT dispatch tickets, with `project_provisioning`
and `task_ticket_fire` (migration 0082) owning idempotency. But the executor has
**no input**. Nothing turns a won opportunity into an Imperion delivery
`project` + tasks, nothing writes a `project_provisioning` row, and the only
project template that exists is the **hardcoded onboarding playbook**
(`ONBOARDING_TEMPLATE` / `applyOnboardingTemplate`, ADR-0037) — onboarding-only,
not selectable, not data-driven. A won deal of any other type has nothing to
instantiate. This ADR fills that gap: how a won opportunity becomes a
provisioned delivery project, and what "a predefined template" actually is.

## Context

- **Autotask has no template-instantiate endpoint** (spike #426). A template is
  emulated client-side: create Project → child Phases → child Tasks → JIT
  Tickets. The *source* of that structure must therefore live in Imperion.
- **Creates are non-idempotent and `canDelete=False`** (spike #426). Undo is
  Inactive/Complete only. So an instantiation mistake is expensive — provisioning
  must be **conservative on create** (ADR-0080 §8).
- **KQM's own wizard already creates the Autotask opportunity.** The executor
  must NOT create opportunities — only the Project + dispatch tickets that KQM
  does not create (clarified by Mark, 2026-06-13).
- The onboarding playbook is the proven shape to generalize: phases carry
  `offsetDays`/`durationDays`; steps carry a title, a "send" flag, and an
  optional deploy/verify key. A delivery template needs the same skeleton plus a
  **dispatch-ticket spec** per task (queue, title, JIT lead time).
- ADR-0080 §3 puts a **DocuSign-signed contract between won and provisioning**.
  DocuSign (#318/ADR-0071) is not yet wired (no creds).

## Options considered

1. **Auto-provision on won.** A won event instantiates a mapped template and the
   executor fires unattended.
2. **Human-triggered from the board (chosen).** A won opportunity surfaces as
   "ready to provision"; a human picks/confirms a delivery template; the project +
   tasks instantiate; the row goes `pending`; the executor provisions — but only
   once the contract gate is satisfied.
3. **Auto-draft, human-confirm.** Won auto-creates a *draft* project from a mapped
   template; a human reviews then confirms.

Template model: **(a) data-driven `delivery_template` (chosen)** vs (b) seed-only
config vs (c) generalize the onboarding playbook in place.

Contract gate: **hard (chosen)** vs soft/advisory vs none.

### Tradeoffs

- Auto-provision is fastest but commits an irreversible Autotask create with no
  human check — unacceptable given `canDelete=False`. Auto-draft is a reasonable
  middle ground but adds draft-lifecycle complexity before the model is trusted;
  deferred to a future iteration.
- A data-driven model costs an authoring surface (schema + manager GUI) but is the
  only option that lets the team run *many* delivery playbooks without a code
  change, and keeps the executor a pure consumer of data.
- A hard contract gate couples go-live to DocuSign being wired (#318). Accepted
  deliberately (Mark): provisioning client delivery work before a signed contract
  is a business risk worse than the schedule coupling. The gate is built now and
  enforced, but **inert** (provision blocked, "awaiting contract") until DocuSign
  lands — pieces upstream (ingest, merge, template authoring) proceed regardless.

## Decision

1. **Data-driven delivery templates.** New frontend-owned schema (migration 0084):
   - `delivery_template` (key, name, version, project_type_id?, active) — a
     reusable playbook, optionally bound to a `project_type` so the board can
     filter the picker.
   - `delivery_template_phase` (template_id, ordinal, name, offset_days,
     duration_days) — mirrors `OnboardingPhaseDef`.
   - `delivery_template_task` (phase_id, ordinal, title, offset_days,
     duration_days, **dispatches_ticket** bool, **ticket_queue_id**,
     **ticket_title**, **ticket_lead_days**) — a task optionally fires a
     project-queue ticket `ticket_lead_days` before its scheduled start (JIT,
     ADR-0080 §7). Maps 1:1 to `task_ticket_fire` at instantiation.
2. **Human-triggered provisioning from the board.** A won silver `opportunity`
   surfaces on the delivery board as *ready to provision*. A human picks a
   `delivery_template` (filtered by the deal's project type when bound), names the
   project, sets a start date, and confirms. Instantiation creates one native
   `project`, its `project_milestone`s (from phases) and `task`s (from template
   tasks) — the **same instantiation contract as `applyOnboardingTemplate`**,
   generalized — and a `project_provisioning` row (`provision_state='pending'`,
   `delivery_template_id`, `source_kqm_quote_id`, `autotask_opportunity_id` from
   the won quote seam). Ticket-dispatching tasks get a `task_ticket_fire` row
   (`fire_state='none'`, `scheduled_for` derived from offsets, or NULL = manual).
3. **Hard contract gate.** `project_provisioning` gains `contract_state`
   (`none|sent|signed`), `contract_signed_at`, and `contract_envelope_ref` (the
   DocuSign envelope id, ADR-0071). The executor MUST NOT provision a row whose
   `contract_state <> 'signed'`. The board shows the gate and blocks the fire
   control until signed. Until DocuSign is wired the state stays `none` and
   provisioning is inert by design.
4. **Executor stays a pure consumer** (separate issue, backend repo): reads
   `pending` + `signed` rows, emulates the template into Autotask, JIT-fires
   tickets, never touches opportunities, checks `idempotency_key`/state before
   every write (ADR-0080 §4).
5. **Onboarding playbook is untouched.** Its easy-mode deploy/verify machinery
   (ADR-0052 §3) stays on `ONBOARDING_TEMPLATE`. Migrating onboarding onto
   `delivery_template` is explicitly deferred — the two converge later, not now.

## Consequences

### Security impact

No secrets. Schema is additive/idempotent (ADR-0042 — frontend owns it). The
contract gate is a **safety control**: it prevents the executor writing client
delivery work into the production PSA before a contract is signed. Provisioning
remains an admin/`delivery:write` action; the executor's Autotask writes keep the
ADR-0080 posture (KV creds per call, conservative-on-create, `ZZ-`-marked test
writes on My Company). `Never commit secrets.`

### Cost impact

No new SaaS spend — reuses KQM, Autotask, and (pending) DocuSign licences. JIT
firing keeps Autotask ticket volume and the documented rate budget in check.

### Operational impact

The team gains a template-authoring surface and a board provisioning flow. Go-live
of the *executor* is gated on DocuSign (#318) by the hard contract gate; ingest,
merge, template authoring, and the board flow ship and are usable before that.
The "Project Management" queue id (`29683483`) remains environment config
(`ticket_queue_id`), not a constant.

## Future considerations

- Auto-draft-on-won (option 3) once templates are trusted.
- Deal-type → template auto-mapping (from KQM line items / product) to pre-select
  the picker.
- Unifying the onboarding playbook onto `delivery_template`.
- Promoting `task_ticket_fire.scheduled_for` derivation into a backend scheduler
  rather than instantiation-time computation.
