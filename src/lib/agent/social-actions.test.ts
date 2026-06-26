import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the Social Action propose path (ADR-0124 #4, epic #1338 slice B #1358). The inbox
 * reply box + the post detail page build a `social_reply_*` / `social_publish_*` /
 * `social_boost_post` envelope and forward it through the shared `approveProposedAction` choke
 * point. Here we assert the local guards (empty/missing input refused before any round-trip),
 * the channel → seeded `action_kind` mapping, and the verbatim envelope; the forward-verbatim
 * + catalog-validation path is covered by ask-action.test / action-catalog.test. The backend
 * boundary is mocked.
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

import {
  proposeSocialReplyAction,
  proposeSocialPublishAction,
  proposeSocialBoostAction,
} from "./social-actions";

const USER = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
  h.resolveActingUser.mockResolvedValue({ ok: true, id: USER, email: "me@imperionllc.com" });
  h.executeProposedAction.mockResolvedValue({ ok: true });
});

describe("proposeSocialReplyAction", () => {
  it("refuses missing target or empty body — never forwarded", async () => {
    expect((await proposeSocialReplyAction({ engagementId: "", channel: "facebook", text: "hi" })).ok).toBe(false);
    expect((await proposeSocialReplyAction({ engagementId: "e1", channel: "facebook", text: "  " })).ok).toBe(false);
    expect(h.executeProposedAction).not.toHaveBeenCalled();
  });

  it("refuses a channel with no seeded reply kind — never forwarded", async () => {
    const r = await proposeSocialReplyAction({ engagementId: "e1", channel: "linkedin", text: "hi" });
    expect(r.ok).toBe(false);
    expect(h.executeProposedAction).not.toHaveBeenCalled();
  });

  it("maps each channel to its seeded reply kind", async () => {
    await proposeSocialReplyAction({ engagementId: "e1", channel: "facebook", text: "a" });
    await proposeSocialReplyAction({ engagementId: "e2", channel: "instagram", text: "b" });
    await proposeSocialReplyAction({ engagementId: "e3", channel: "threads", text: "c" });
    const kinds = h.executeProposedAction.mock.calls.map((c) => c[0].action.kind);
    expect(kinds).toEqual(["social_reply_fb_comment", "social_reply_ig_comment", "social_reply_threads"]);
  });

  it("routes an instagram DM (isDirect) to the direct-message reply kind", async () => {
    const r = await proposeSocialReplyAction({
      engagementId: "dm1",
      channel: "instagram",
      text: "thanks!",
      isDirect: true,
    });
    expect(r.ok).toBe(true);
    expect(h.executeProposedAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { kind: "social_reply_ig_direct", engagementId: "dm1", text: "thanks!" },
        approval: { approvedByUserId: USER, approved: true },
      }),
    );
  });
});

describe("proposeSocialPublishAction", () => {
  it("refuses a missing post id or an unpublishable channel — never forwarded", async () => {
    expect((await proposeSocialPublishAction({ socialPostId: "", channel: "facebook" })).ok).toBe(false);
    expect((await proposeSocialPublishAction({ socialPostId: "p1", channel: "linkedin" })).ok).toBe(false);
    expect(h.executeProposedAction).not.toHaveBeenCalled();
  });

  it("forwards the per-channel publish envelope verbatim", async () => {
    const r = await proposeSocialPublishAction({ socialPostId: "p1", channel: "instagram" });
    expect(r.ok).toBe(true);
    expect(h.executeProposedAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { kind: "social_publish_ig_media", socialPostId: "p1" },
      }),
    );
  });
});

describe("proposeSocialBoostAction", () => {
  it("refuses a missing post id or non-positive budget — never forwarded", async () => {
    expect((await proposeSocialBoostAction({ socialPostId: "", budgetUsd: 50 })).ok).toBe(false);
    expect((await proposeSocialBoostAction({ socialPostId: "p1", budgetUsd: 0 })).ok).toBe(false);
    expect(h.executeProposedAction).not.toHaveBeenCalled();
  });

  it("forwards the social_boost_post envelope verbatim", async () => {
    const r = await proposeSocialBoostAction({ socialPostId: "p1", budgetUsd: 100 });
    expect(r.ok).toBe(true);
    expect(h.executeProposedAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: { kind: "social_boost_post", socialPostId: "p1", budgetUsd: 100 },
      }),
    );
  });
});
