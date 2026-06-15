import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wiring tests for issue #337 (ADR-0065 B3): multiple assignees + watchers server
 * actions. Mocked at the boundaries (repos, guard, auth, app-user resolve, next);
 * the real action logic runs — including the multi-value assignee parse, the
 * primary-promote, and the watch toggle's email→user resolution.
 */
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  setTaskAssignees: vi.fn(),
  setTaskPrimary: vi.fn(),
  setTaskWatch: vi.fn(),
  auth: vi.fn(),
  resolveAppUserIdByEmail: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/services", () => ({ ticketsService: { createTicket: vi.fn() } }));
vi.mock("@/auth", () => ({ auth: h.auth }));
vi.mock("@/lib/data/app-user", () => ({ resolveAppUserIdByEmail: h.resolveAppUserIdByEmail }));
vi.mock("@/lib/data", () => ({
  getRepositories: () => ({
    crm: {
      setTaskAssignees: h.setTaskAssignees,
      setTaskPrimary: h.setTaskPrimary,
      setTaskWatch: h.setTaskWatch,
    },
  }),
}));

import {
  setTaskAssigneesAction,
  setTaskPrimaryAction,
  setTaskWatchAction,
} from "./actions";

function form(entries: [string, string][]): FormData {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setTaskAssigneesAction", () => {
  it("collects every checked assignee id and saves the set", async () => {
    await setTaskAssigneesAction(
      form([
        ["taskId", "t1"],
        ["assignee", "u1"],
        ["assignee", "u2"],
      ]),
    );
    expect(h.requireCapability).toHaveBeenCalledWith("delivery:write");
    expect(h.setTaskAssignees).toHaveBeenCalledWith("t1", ["u1", "u2"]);
    expect(h.revalidatePath).toHaveBeenCalledWith("/tasks/t1/edit");
  });

  it("saves an empty set when no assignee is checked (clears assignees)", async () => {
    await setTaskAssigneesAction(form([["taskId", "t1"]]));
    expect(h.setTaskAssignees).toHaveBeenCalledWith("t1", []);
  });

  it("does nothing without a task id", async () => {
    await setTaskAssigneesAction(form([["assignee", "u1"]]));
    expect(h.setTaskAssignees).not.toHaveBeenCalled();
  });
});

describe("setTaskPrimaryAction", () => {
  it("promotes the picked user to primary", async () => {
    await setTaskPrimaryAction(
      form([
        ["taskId", "t1"],
        ["userId", "u2"],
      ]),
    );
    expect(h.setTaskPrimary).toHaveBeenCalledWith("t1", "u2", "primary");
  });

  it("does nothing without both ids", async () => {
    await setTaskPrimaryAction(form([["taskId", "t1"]]));
    expect(h.setTaskPrimary).not.toHaveBeenCalled();
  });
});

describe("setTaskWatchAction", () => {
  it("resolves the viewer by email and watches", async () => {
    h.auth.mockResolvedValue({ user: { email: "ada@imperionllc.com" } });
    h.resolveAppUserIdByEmail.mockResolvedValue("user-1");
    await setTaskWatchAction(
      form([
        ["taskId", "t1"],
        ["watch", "true"],
      ]),
    );
    expect(h.resolveAppUserIdByEmail).toHaveBeenCalledWith("ada@imperionllc.com");
    expect(h.setTaskWatch).toHaveBeenCalledWith("t1", "user-1", true);
  });

  it("unwatches when watch=false", async () => {
    h.auth.mockResolvedValue({ user: { email: "ada@imperionllc.com" } });
    h.resolveAppUserIdByEmail.mockResolvedValue("user-1");
    await setTaskWatchAction(
      form([
        ["taskId", "t1"],
        ["watch", "false"],
      ]),
    );
    expect(h.setTaskWatch).toHaveBeenCalledWith("t1", "user-1", false);
  });

  it("is a no-op when the viewer can't be resolved", async () => {
    h.auth.mockResolvedValue({ user: { email: "" } });
    h.resolveAppUserIdByEmail.mockResolvedValue(null);
    await setTaskWatchAction(form([["taskId", "t1"], ["watch", "true"]]));
    expect(h.setTaskWatch).not.toHaveBeenCalled();
  });
});
