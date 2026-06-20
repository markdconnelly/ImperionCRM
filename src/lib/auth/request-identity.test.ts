import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * requestIdentity (#975) bridges the session → the withIdentity context:
 * userId = acting app_user.id, groups = session roles, oid left unset.
 */
const h = vi.hoisted(() => ({
  auth: vi.fn(),
  resolveActingUser: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: h.auth }));
vi.mock("@/lib/services/acting-user", () => ({ resolveActingUser: h.resolveActingUser }));
vi.mock("server-only", () => ({}));

import { requestIdentity } from "./request-identity";

beforeEach(() => vi.clearAllMocks());

describe("requestIdentity", () => {
  it("carries the resolved app_user.id as userId and session roles as groups", async () => {
    h.auth.mockResolvedValue({ user: { roles: ["admin", "finance"] } });
    h.resolveActingUser.mockResolvedValue({ ok: true, id: "uid-1", email: "a@b.com" });
    const ctx = await requestIdentity();
    expect(ctx).toEqual({ userId: "uid-1", groups: ["admin", "finance"] });
    expect(ctx.oid).toBeUndefined();
  });

  it("fails closed — userId null — when the user is unresolved", async () => {
    h.auth.mockResolvedValue({ user: { roles: ["support"] } });
    h.resolveActingUser.mockResolvedValue({ ok: false, reason: "not_provisioned", email: "a@b.com" });
    const ctx = await requestIdentity();
    expect(ctx.userId).toBeNull();
    expect(ctx.groups).toEqual(["support"]);
  });

  it("tolerates a missing session (no roles → empty groups)", async () => {
    h.auth.mockResolvedValue(null);
    h.resolveActingUser.mockResolvedValue({ ok: false, reason: "no_session", email: null });
    const ctx = await requestIdentity();
    expect(ctx).toEqual({ userId: null, groups: [] });
  });
});
