# Project board — the kanban view

[← User guides](README.md)

The Project board page (left nav → **Projects**) has two views, switchable from
the **List / Board** toggle below the page title. The **Board** is a drag-drop
kanban over the project object (ADR-0052), introduced in #441 (ADR-0066 C1) — the
sibling of the [task board](task-board.md).

## What you see

Four columns, one per project status:

```mermaid
flowchart LR
    N["Not started"] -->|drag| P["In progress"]
    P -->|drag| B["Blocked"]
    P -->|drag| C["Complete"]
    B -.-> P
    C -. drag back .-> P
```

- Each column shows its project count.
- A card shows the project **name** (a link to the project), its **type** chip,
  the **account**, and the **target go-live date** when set.
- The Board spans **all project types at once** — it is a single status view, not
  the per-type sections of the List. Switch to **List** for the type-grouped view
  and the project-type manager.

## Grouping (#443)

The **Group** switch (board view only) changes what the columns represent:

- **Status** (default) — Not started / In progress / Blocked / Complete.
- **Type** — one column per project type (from the live type table).

Dragging a card reassigns whichever dimension you are grouped by: drop a project
in another *Type* lane and it is re-typed (same `delivery:write` gate as a status
move). Grouping by owner waits on the owner reaching the board's read model.

## WIP limits (#445)

Each column header has a small number box — set a **work-in-progress limit**
(blank or `0` = none). When a column holds more cards than its limit, the column
turns **red** and the count shows `count/limit`. The limit is a personal nudge,
**not** a hard stop: you can still drop cards past it. Limits are saved in your
browser (per board, per group-by) and survive a reload — nothing is written to
the server.

## Moving a project

Drag a card to another column. The card jumps immediately (optimistic), and the
new status is saved through the same permission-gated path as the edit form
(`delivery:write`) — a move you are not allowed to make is rejected server-side.
Moving out of *Not started* stamps the project's start time; moving to *Complete*
stamps its completion time — identical to editing the status on the form. The
board then re-reads server state, so what you see always matches the record.

There is no separate "save"; the drop *is* the save.

## Not yet on the board

Tracked as follow-ups, deferred per ADR-0066 (SHOULD/COULD) or pending data:

- **Swimlanes, richer cards** (assignee avatars, tags, subtask progress,
  comment/attachment counts) — #439. (Group-by shipped #443, WIP limits #445.)
- **Activity-feed event on a move** — #438, lands with the ADR-0064 feed.
