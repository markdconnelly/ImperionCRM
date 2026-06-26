import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the Threads propose path (epic #1334 S5, ADR-0125 D3). The compose box + reply
 * queue build a `publish_threads` / `reply_threads` envelope and forward it through the shared
 * `approveProposedAction` choke point. Here we assert the local guards (empty text / no target
 * refused before any round-trip) and the Belle grant contract; the forward-verbatim path is
 * covered by ask-action.test. The backend boundary is mocked.
 */
const h = vi.hoisted(() => ({
  executeProposedAction: vi.fn(),
  resolveActingUser: vi.fn(),
}));

vi.mock("@/lib/services", () => ({
  agentService: { executeProposedAction: h.executeProposedAction },
}));
vi.mock("@/lib/services/acting-user", () => ({ resolveActingUser: h.resolveActingUser }));
vi.mock("@/lib/services/external-client", () => ({
  ServiceNotConfiguredError: class extends Error {},
  ServiceCallError: class extends Error {
    constructor(
      name: string,
      public status: number,
    ) {
      super(name);
    }
  },
}));

import { BELLE_THREADS_GRANT } from "./threads-grant";
import { proposeThreadsPostAction, proposeThreadsReplyAction } from "./threads-actions";

const USER = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  h.resolveActingUser.mockResolvedValue({ ok: true, id: USER, email: "me@imperionllc.com" });
  h.executeProposedAction.mockResolvedValue({ ok: true });
});

describe("BELLE_THREADS_GRANT — customer-facing HARD ceiling (ADR-0125 D3)", () => {
  it("grants Belle the two Threads kinds, mark-gated, T3 customer-facing", () => {
    expect(BELLE_THREADS_GRANT.agentKey).toBe("marketing");
    expect([...BELLE_THREADS_GRANT.tools]).toEqual(["publish_threads", "reply_threads"]);
    expect(BELLE_THREADS_GRANT.tier).toBe("T3");
    expect(BELLE_THREADS_GRANT.hardCeiling).toBe("customer_facing");
    expect(BELLE_THREADS_GRANT.markGated).toBe(true);
  });
});

describe("proposeThreadsPostAction", () => {
  it("refuses an empty post locally — never forwarded", async () => {
    const r = await proposeThreadsPostAction("   ");
    expect(r.ok).toBe(false);
    expect(h.executeProposedAction).not.toHaveBeenCalled();
  });

  it("forwards a publish_threads envelope verbatim", async () => {
    const r = await proposeThreadsPostAction("Hello Threads");
    expect(r.ok).toBe(true);
    expect(h.executeProposedAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { kind: "publish_threads", text: "Hello Threads" },
        approval: { approvedByUserId: USER, approved: true },
      }),
    );
  });
});

describe("proposeThreadsReplyAction", () => {
  it("refuses with no target or empty body — never forwarded", async () => {
    expect((await proposeThreadsReplyAction("", "hi")).ok).toBe(false);
    expect((await proposeThreadsReplyAction("ext-1", "  ")).ok).toBe(false);
    expect(h.executeProposedAction).not.toHaveBeenCalled();
  });

  it("forwards a reply_threads envelope verbatim", async () => {
    const r = await proposeThreadsReplyAction("ext-1", "thanks for the shout-out!");
    expect(r.ok).toBe(true);
    expect(h.executeProposedAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { kind: "reply_threads", replyToId: "ext-1", text: "thanks for the shout-out!" },
      }),
    );
  });
});
