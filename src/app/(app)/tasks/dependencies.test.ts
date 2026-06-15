import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wiring tests for issue #336 (ADR-0065 B2): add / remove task-dependency server
 * actions. Mocked at the boundaries (repos, guard, next); the real action logic
 * runs — including the direction → (predecessor, successor) mapping.
 */
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  addTaskDependency: vi.fn(),
  removeTaskDependency: vi.fn(),
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
      addTaskDependency: h.addTaskDependency,
      removeTaskDependency: h.removeTaskDependency,
    },
  }),
}));

import { addTaskDependencyAction, removeTaskDependencyAction } from "./actions";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addTaskDependencyAction", () => {
  it("blocked-by maps the picked task to predecessor, this task to successor", async () => {
    await addTaskDependencyAction(
      form({ taskId: "this", otherTaskId: "other", direction: "blocked-by" }),
    );
    expect(h.requireCapability).toHaveBeenCalledWith("delivery:write");
    expect(h.addTaskDependency).toHaveBeenCalledWith("other", "this");
  });

  it("blocks maps this task to predecessor, the picked task to successor", async () => {
    await addTaskDependencyAction(
      form({ taskId: "this", otherTaskId: "other", direction: "blocks" }),
    );
    expect(h.addTaskDependency).toHaveBeenCalledWith("this", "other");
  });

  it("does nothing without both task ids", async () => {
    await addTaskDependencyAction(form({ taskId: "this", direction: "blocks" }));
    await addTaskDependencyAction(form({ otherTaskId: "other", direction: "blocks" }));
    expect(h.addTaskDependency).not.toHaveBeenCalled();
  });
});

describe("removeTaskDependencyAction", () => {
  it("removes with the same direction mapping as add (blocks)", async () => {
    await removeTaskDependencyAction(
      form({ taskId: "this", otherTaskId: "other", direction: "blocks" }),
    );
    expect(h.removeTaskDependency).toHaveBeenCalledWith("this", "other");
  });

  it("removes with the blocked-by mapping", async () => {
    await removeTaskDependencyAction(
      form({ taskId: "this", otherTaskId: "other", direction: "blocked-by" }),
    );
    expect(h.removeTaskDependency).toHaveBeenCalledWith("other", "this");
  });

  it("does nothing without both task ids", async () => {
    await removeTaskDependencyAction(form({ taskId: "this" }));
    expect(h.removeTaskDependency).not.toHaveBeenCalled();
  });
});
