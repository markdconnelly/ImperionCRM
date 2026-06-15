import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wiring tests for issue #335 (ADR-0065 B1): subtask add + re-parent server
 * actions. Mocked at the boundaries (repos, guard, next); the real action logic
 * runs — including the "inherit parent context" and "promote to top-level" paths.
 */
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  getTask: vi.fn(),
  createTask: vi.fn(),
  reparentTask: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/services", () => ({ ticketsService: { createTicket: vi.fn() } }));
vi.mock("@/lib/data", () => ({
  getRepositories: () => ({
    crm: {
      getTask: h.getTask,
      createTask: h.createTask,
      reparentTask: h.reparentTask,
    },
  }),
}));

import { addSubtaskAction, reparentTaskAction } from "./actions";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addSubtaskAction", () => {
  it("creates a child inheriting the parent's account/project/category", async () => {
    h.getTask.mockResolvedValue({
      id: "p1",
      accountId: "acc-1",
      projectId: "proj-1",
      category: "project",
    });
    await addSubtaskAction(form({ parentTaskId: "p1", title: "Wire up DNS", dueAt: "2026-07-01" }));
    expect(h.requireCapability).toHaveBeenCalledWith("delivery:write");
    expect(h.createTask).toHaveBeenCalledWith({
      accountId: "acc-1",
      title: "Wire up DNS",
      detail: null,
      status: "open",
      category: "project",
      dueAt: "2026-07-01",
      projectId: "proj-1",
      parentTaskId: "p1",
    });
    expect(h.revalidatePath).toHaveBeenCalledWith("/tasks");
  });

  it("does nothing without a parent id or title", async () => {
    await addSubtaskAction(form({ title: "orphan" }));
    await addSubtaskAction(form({ parentTaskId: "p1" }));
    expect(h.createTask).not.toHaveBeenCalled();
  });

  it("does nothing when the parent task is missing", async () => {
    h.getTask.mockResolvedValue(null);
    await addSubtaskAction(form({ parentTaskId: "ghost", title: "x" }));
    expect(h.createTask).not.toHaveBeenCalled();
  });
});

describe("reparentTaskAction", () => {
  it("promotes to top-level when parentTaskId is empty", async () => {
    await reparentTaskAction(form({ id: "c1", parentTaskId: "" }));
    expect(h.requireCapability).toHaveBeenCalledWith("delivery:write");
    expect(h.reparentTask).toHaveBeenCalledWith("c1", null);
  });

  it("demotes under a new parent", async () => {
    await reparentTaskAction(form({ id: "c1", parentTaskId: "p2" }));
    expect(h.reparentTask).toHaveBeenCalledWith("c1", "p2");
  });

  it("does nothing without an id", async () => {
    await reparentTaskAction(form({ parentTaskId: "p2" }));
    expect(h.reparentTask).not.toHaveBeenCalled();
  });
});
