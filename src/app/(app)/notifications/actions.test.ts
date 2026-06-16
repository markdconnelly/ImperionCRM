import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wiring tests for issue #332 (ADR-0064 A3): notification bell server actions.
 * Mocked at the boundaries (repos, acting-user resolve); the real action logic
 * runs — including the recipient-scoping and the unresolved-user no-op.
 */
const h = vi.hoisted(() => ({
  resolveActingUser: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  setPref: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/services/acting-user", () => ({ resolveActingUser: h.resolveActingUser }));
vi.mock("@/lib/data", () => ({
  getRepositories: () => ({
    notifications: { markRead: h.markRead, markAllRead: h.markAllRead, setPref: h.setPref },
  }),
}));

import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  setNotificationPrefAction,
} from "./actions";

function prefForm(kind: string, channel: string, enabled: string): FormData {
  const fd = new FormData();
  fd.set("kind", kind);
  fd.set("channel", channel);
  fd.set("enabled", enabled);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.resolveActingUser.mockResolvedValue({ ok: true, id: "user-1", email: "ada@imperionllc.com" });
});

describe("markNotificationReadAction", () => {
  it("marks one notification read scoped to the acting user", async () => {
    await markNotificationReadAction("n1");
    expect(h.markRead).toHaveBeenCalledWith("n1", "user-1");
  });

  it("trims the id and does nothing when it is empty", async () => {
    await markNotificationReadAction("   ");
    expect(h.markRead).not.toHaveBeenCalled();
  });

  it("is a no-op when the acting user can't be resolved", async () => {
    h.resolveActingUser.mockResolvedValue({ ok: false, reason: "no_session", email: null });
    await markNotificationReadAction("n1");
    expect(h.markRead).not.toHaveBeenCalled();
  });
});

describe("markAllNotificationsReadAction", () => {
  it("clears the whole inbox for the acting user", async () => {
    await markAllNotificationsReadAction();
    expect(h.markAllRead).toHaveBeenCalledWith("user-1");
  });

  it("is a no-op when the acting user can't be resolved", async () => {
    h.resolveActingUser.mockResolvedValue({ ok: false, reason: "no_database", email: "x@y.z" });
    await markAllNotificationsReadAction();
    expect(h.markAllRead).not.toHaveBeenCalled();
  });
});

describe("setNotificationPrefAction (#601)", () => {
  it("upserts a valid (kind × channel) pref enabled for the acting user", async () => {
    await setNotificationPrefAction(prefForm("assigned", "email", "true"));
    expect(h.setPref).toHaveBeenCalledWith("user-1", "assigned", "email", true);
    expect(h.revalidatePath).toHaveBeenCalledWith("/notifications/preferences");
  });

  it("mutes a trigger (enabled=false) when the toggle is unchecked", async () => {
    await setNotificationPrefAction(prefForm("mentioned", "in_app", "false"));
    expect(h.setPref).toHaveBeenCalledWith("user-1", "mentioned", "in_app", false);
  });

  it("rejects a kind outside the schema CHECK set", async () => {
    await setNotificationPrefAction(prefForm("hacked", "in_app", "true"));
    expect(h.setPref).not.toHaveBeenCalled();
  });

  it("rejects a channel outside the schema CHECK set", async () => {
    await setNotificationPrefAction(prefForm("assigned", "sms", "true"));
    expect(h.setPref).not.toHaveBeenCalled();
  });

  it("is a no-op when the acting user can't be resolved (own-prefs gate)", async () => {
    h.resolveActingUser.mockResolvedValue({ ok: false, reason: "no_session", email: null });
    await setNotificationPrefAction(prefForm("assigned", "teams", "true"));
    expect(h.setPref).not.toHaveBeenCalled();
  });
});
