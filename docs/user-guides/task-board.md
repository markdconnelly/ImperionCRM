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

## Moving a task

Drag a card to another column. The card jumps immediately (optimistic), and the
new status is saved through the same permission-gated path as the edit form
(`delivery:write`) — a move you are not allowed to make is rejected server-side.
The board then re-reads server state, so what you see always matches the record.

There is no separate "save"; the drop *is* the save.

## Not yet on the board

Tracked as follow-ups, deferred per ADR-0066 (SHOULD/COULD) or pending data:

- **Group-by, swimlanes, WIP limits, richer cards** (assignee avatars, tags,
  subtask progress, comment/attachment counts) — #439. (The projects board
  shipped in #441 — see [Project board](project-board.md).)
- **Activity-feed event on a move** — #438, lands with the ADR-0064 feed.

For sales tasks specifically, see [Sales Activity](sales-activity.md).
