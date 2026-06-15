import { beforeEach, describe, expect, it } from "vitest";
import { mockRepositories } from "./mock-repositories";

/**
 * Behaviour tests for the mock notifications repository (ADR-0064 A3, #332): the
 * in-memory bell store used in mock mode. Covers dispatch (self-skip + dedupe),
 * the unread filter/count, and mark-read / mark-all-read. The mock store is
 * module-level singleton state, so each test clears it first.
 */
const repo = mockRepositories.notifications;
const VIEWER = "viewer";

async function clear() {
  await repo.markAllRead(VIEWER);
}

beforeEach(async () => {
  await clear();
});

describe("mock notifications.dispatch", () => {
  it("creates one notification per recipient, skipping the actor", async () => {
    await repo.dispatch(
      { kind: "assigned", parentType: "task", parentId: "t1", actorUserId: "actor", payload: { title: "Assigned" } },
      ["u1", "u2", "actor"],
    );
    const list = await repo.listForUser(VIEWER, { unreadOnly: true });
    // actor is skipped → 2 rows, not 3.
    expect(list).toHaveLength(2);
    expect(list.every((n) => n.kind === "assigned" && n.parentId === "t1")).toBe(true);
    expect(list[0].title).toBe("Assigned");
  });

  it("dedupes a repeated recipient", async () => {
    await repo.dispatch(
      { kind: "mentioned", parentType: "task", parentId: "t1", actorUserId: null, payload: {} },
      ["u1", "u1", "u1"],
    );
    expect(await repo.unreadCount(VIEWER)).toBe(1);
  });
});

describe("mock notifications read state", () => {
  it("unreadOnly trims read rows and unreadCount tracks them", async () => {
    await repo.dispatch(
      { kind: "commented", parentType: "project", parentId: "p1", actorUserId: null, payload: { title: "a" } },
      ["u1"],
    );
    await repo.dispatch(
      { kind: "commented", parentType: "project", parentId: "p1", actorUserId: null, payload: { title: "b" } },
      ["u2"],
    );
    expect(await repo.unreadCount(VIEWER)).toBe(2);

    const unread = await repo.listForUser(VIEWER, { unreadOnly: true });
    await repo.markRead(unread[0].id, VIEWER);
    expect(await repo.unreadCount(VIEWER)).toBe(1);
    expect(await repo.listForUser(VIEWER, { unreadOnly: true })).toHaveLength(1);
  });

  it("markAllRead clears the unread count", async () => {
    await repo.dispatch(
      { kind: "overdue", parentType: "task", parentId: "t9", actorUserId: null, payload: {} },
      ["u1", "u2"],
    );
    await repo.markAllRead(VIEWER);
    expect(await repo.unreadCount(VIEWER)).toBe(0);
  });
});
