import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wiring tests for issue #342 (ADR-0066 C2): the calendar drag-to-reschedule
 * server action. Mocked at the boundaries (repos, guard, next/cache); the real
 * action logic runs — the `delivery:write` guard, the ISO-date validation, and
 * the audited `setTaskDue` write.
 */
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  setTaskDue: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/services", () => ({ ticketsService: { createTicket: vi.fn() } }));
// actions.ts now imports @/auth for the watch action (#337); stub it so this suite
// (which doesn't exercise that path) doesn't drag in next-auth's runtime.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/data/app-user", () => ({ resolveAppUserIdByEmail: vi.fn() }));
vi.mock("@/lib/data", () => ({
  getRepositories: () => ({ crm: { setTaskDue: h.setTaskDue } }),
}));

import { moveTaskDueAction } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("moveTaskDueAction", () => {
  it("writes the new due date through the delivery:write-guarded path and audits via revalidate", async () => {
    await moveTaskDueAction("t1", "2026-07-04");
    expect(h.requireCapability).toHaveBeenCalledWith("delivery:write");
    expect(h.setTaskDue).toHaveBeenCalledWith("t1", "2026-07-04");
    expect(h.revalidatePath).toHaveBeenCalledWith("/tasks");
  });

  it("trims surrounding whitespace on id and date", async () => {
    await moveTaskDueAction("  t1  ", "  2026-07-04  ");
    expect(h.setTaskDue).toHaveBeenCalledWith("t1", "2026-07-04");
  });

  it("is a no-op when the id is blank", async () => {
    await moveTaskDueAction("   ", "2026-07-04");
    expect(h.setTaskDue).not.toHaveBeenCalled();
  });

  it("rejects a non-ISO date rather than corrupting due_at", async () => {
    await moveTaskDueAction("t1", "07/04/2026");
    await moveTaskDueAction("t1", "2026-7-4");
    await moveTaskDueAction("t1", "tomorrow");
    await moveTaskDueAction("t1", "");
    expect(h.setTaskDue).not.toHaveBeenCalled();
  });
});
