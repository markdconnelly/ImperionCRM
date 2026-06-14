# Delivery templates

[← User guides](README.md)

A **delivery template** is a reusable provisioning playbook (ADR-0081). When a deal
is won, you provision its delivery work by picking a template on the board — it
instantiates a native project with its phases and tasks, which the backend then
emulates into an Autotask Project + JIT dispatch tickets (ADR-0080). Templates
generalize the onboarding playbook so *any* deal type has a structure to start from.

Find them at **Project board → Delivery templates** (`/projects/templates`).

## What a template holds

```
Template  (name · version · optional project-type binding · active)
  └─ Phase   (name · starts +N days · lasts N days)        → a project milestone
       └─ Task  (title · +N days · N days)                 → a project task
            └─ [optional] dispatch ticket                  → an Autotask queue ticket
                 (queue id · title · fire N days before the task starts)
```

- **Phases** become project milestones; their `start +N / lasts N` days compute
  real dates from the project's start at instantiation (same as onboarding).
- **Tasks** become project tasks under their phase.
- A task that **dispatches a ticket** fires an Autotask project-queue ticket in a
  *just-in-time* window — `N days before the task starts`, not all up front (keeps
  the service desk uncluttered). The queue id is environment config (the
  "Project Management" queue is `29683483` in production).

## Authoring (requires delivery:write)

**New template** → name it, optionally bind it to a project type (so the board
picker can filter), then add phases and, under each, tasks. Tick **dispatches
ticket** on a task to reveal its queue / title / lead-days. Save.

Editing is **delete + recreate** in this version — there is no in-place editor yet.
Bump the **version** when you re-create an evolved template so history stays clear.
Set a template **inactive** to retire it from the picker without deleting it.

## Why it doesn't provision automatically

Provisioning is always **human-triggered** from the board, never automatic on a won
deal (ADR-0081 §2). Autotask records can't be hard-deleted, so an accidental
instantiation is costly — a person confirms the template and the contract gate
(below) before anything is written.

## The contract gate

A delivery project is **not provisioned to Autotask until its contract is signed**
(hard gate, ADR-0081 §3 — via DocuSign, #318). Until DocuSign is wired the gate is
inert and the provision control stays blocked with an "awaiting contract" state.

Once a template is instantiated, steer the resulting delivery from the
[Delivery board](delivery-board.md).

See also [Project board](project-board.md) and [Task board](task-board.md).
