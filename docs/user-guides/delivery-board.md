# Delivery board

[← User guides](README.md)

The **delivery board** is where you see and steer provisioned delivery projects
(ADR-0080 §4/§7). Once you [instantiate a delivery template](delivery-templates.md),
the board shows the resulting project, its contract gate, and each ticket-dispatching
task's fire-state — and lets you schedule (or fire-now) those tickets.

Find it at **Project board → Delivery board** (`/projects/delivery`).

## What you see

Projects are grouped into columns by **provisioning state** — the state the backend
executor advances:

| Column | Meaning |
|---|---|
| **Pending** | Instantiated; waiting on the contract gate / executor pickup. |
| **Provisioning** | The executor is creating the Autotask Project. |
| **Provisioned** | The Autotask Project exists (its id is shown). |
| **Failed** | The executor hit an error (shown inline). |

Each project card shows its **account**, the **template** it came from, the
**Autotask project id** (once created), the **contract gate** (No contract / sent /
signed), and a per-project fire summary (fired · scheduled · idle · failed). Below
that, every **ticket-dispatching task** with its fire-state badge:

| Badge | Meaning |
|---|---|
| **Not scheduled** | The task has a ticket spec but no fire requested yet. |
| **Scheduled** | A fire is requested for the shown date — the executor will fire it. |
| **Fired** | The Autotask Ticket exists; its id (and a drill-in link) is shown. |
| **Failed** | The executor failed to fire; the error is shown — re-schedule to retry. |

## Steering firing (requires delivery:write)

The board writes only the **intent** to fire — it never creates the Autotask Ticket
itself. The backend executor does that (ADR-0042 boundary). Two controls per task:

- **Schedule** — pick/edit the just-in-time fire date (pre-filled with the date the
  template precomputed). Sets the task to *Scheduled*; the executor fires it when the
  date arrives.
- **Fire now** — schedule for immediate pickup (date = now). The executor fires it on
  its next pass.

A **fired** task can't be re-steered (the ticket already exists). A **failed** task
can be re-scheduled to retry.

## The contract gate

The executor **refuses to provision or fire until the project's contract reads
`signed`** (hard gate, ADR-0081 §3 — via DocuSign, #391-395). You can still schedule
a fire before then, but it stays **inert** until the gate flips — the board warns you
of this. This is the same gate the [delivery templates](delivery-templates.md) guide
describes.

## Autotask drill-in

Once a ticket is fired, its Autotask id is shown. It becomes a clickable deep-link
only when the Autotask base URL is configured (`NEXT_PUBLIC_AUTOTASK_BASE_URL`);
otherwise the bare id is shown.

See also [Delivery templates](delivery-templates.md), [Project board](project-board.md).
