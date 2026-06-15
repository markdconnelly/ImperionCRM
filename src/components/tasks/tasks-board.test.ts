import { describe, expect, it } from "vitest";
import { taskCardMeta } from "./tasks-board";
import type { AppliedTag, TaskRow } from "@/types";

/**
 * Rich-card derivation for the tasks kanban (#439 C1-F4, ADR-0066). Pure shaping
 * of the data already on the list read — the subtask rollup (ADR-0065 B1) and the
 * tag chips (ADR-0065 B6). No DOM, no pg.
 */
function task(over: Partial<TaskRow> & { id: string }): TaskRow {
  return {
    title: "Task",
    status: "open",
    category: "general",
    due: null,
    account: null,
    projectId: null,
    childCount: 0,
    childDoneCount: 0,
    ...over,
  };
}

const tag = (id: string, label: string): AppliedTag => ({ id, label, color: "accent" });

describe("taskCardMeta", () => {
  it("hides the subtask rollup for a leaf task", () => {
    const meta = taskCardMeta(task({ id: "t1" }), {});
    expect(meta.showSubtasks).toBe(false);
    expect(meta.subtaskComplete).toBe(false);
  });

  it("shows an in-progress rollup as not-complete", () => {
    const meta = taskCardMeta(task({ id: "t1", childCount: 3, childDoneCount: 1 }), {});
    expect(meta.showSubtasks).toBe(true);
    expect(meta.subtaskLabel).toBe("1/3");
    expect(meta.subtaskComplete).toBe(false);
  });

  it("marks an all-done rollup complete", () => {
    const meta = taskCardMeta(task({ id: "t1", childCount: 2, childDoneCount: 2 }), {});
    expect(meta.subtaskComplete).toBe(true);
  });

  it("maps the category to its display label, falling back to the raw key", () => {
    expect(taskCardMeta(task({ id: "t1", category: "sales" }), {}).categoryLabel).toBe("Sales");
    expect(taskCardMeta(task({ id: "t1", category: "weird" as never }), {}).categoryLabel).toBe(
      "weird",
    );
  });

  it("returns the task's tag chips and an empty array when none apply", () => {
    const tags = { t1: [tag("a", "urgent"), tag("b", "client")] };
    expect(taskCardMeta(task({ id: "t1" }), tags).tags).toHaveLength(2);
    expect(taskCardMeta(task({ id: "t2" }), tags).tags).toEqual([]);
  });
});
