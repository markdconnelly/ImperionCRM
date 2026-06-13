# Task board — the kanban view

[← User guides](README.md)

The Tasks page (left nav → **Tasks**) has two views, switchable from the
**List / Board** toggle in the top-right. The **Board** is a drag-drop kanban
over the one task object (ADR-0052), introduced in #341 (ADR-0066 C1).

## What you see

Three columns, one per task status:

```mermaid
flowchart LR
    O["Open"] -->|drag| P["In progress"] -->|drag| D["Done"]
    D -. drag back .-> O
```

- Each column shows its task count.
- A card shows the task **title**, its **category** chip (Sales / Project /
  Onboarding / General), the **account**, and the **due date** when set.
- The board honours the **category filter** — pick a category and the board
  shows only that category, exactly like the list.

## Grouping (#443)

The **Group** switch (board view only) changes what the columns represent:

- **Status** (default) — Open / In progress / Done.
- **Category** — Sales / Project / Onboarding / General.

Dragging a card reassigns whichever dimension you are grouped by: drop a card in
the *Onboarding* lane while grouped by category and the task's category becomes
Onboarding (same `delivery:write` gate as a status move). Grouping by assignee or
tag waits on that data landing (ADR-0064/0065).

## WIP limits (#445)

Each column header has a small number box — set a **work-in-progress limit**
(blank or `0` = none). When a column holds more cards than its limit, the column
turns **red** and the count shows `count/limit`. The limit is a personal nudge,
**not** a hard stop: you can still drop cards past it. Limits are saved in your
browser (per board, per group-by), so they are yours alone and survive a reload —
nothing is written to the server.

## Moving a task

Drag a card to another column. The card jumps immediately (optimistic), and the
new status is saved through the same permission-gated path as the edit form
(`delivery:write`) — a move you are not allowed to make is rejected server-side.
The board then re-reads server state, so what you see always matches the record.

There is no separate "save"; the drop *is* the save.

## Not yet on the board

Tracked as follow-ups, deferred per ADR-0066 (SHOULD/COULD) or pending data:

- **Swimlanes, richer cards** (assignee avatars, tags, subtask progress,
  comment/attachment counts) — #439. (Group-by shipped #443, WIP limits #445;
  the projects board in #441 — see [Project board](project-board.md).)
- **Activity-feed event on a move** — #438, lands with the ADR-0064 feed.

For sales tasks specifically, see [Sales Activity](sales-activity.md).
