import { beforeEach, describe, expect, it, vi } from "vitest";

/** The shared acting-user resolver (#190) — all four resolution paths. */
const h = vi.hoisted(() => ({
  auth: vi.fn(),
  getPool: vi.fn(),
  resolveAppUserIdByEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: h.auth }));
vi.mock("@/lib/db/client", () => ({ getPool: h.getPool }));
vi.mock("@/lib/data/app-user", () => ({ resolveAppUserIdByEmail: h.resolveAppUserIdByEmail }));

import { resolveActingUser } from "./acting-user";

beforeEach(() => {
  vi.clearAllMocks();
  h.auth.mockResolvedValue({ user: { email: "ada@imperionllc.com" } });
  h.getPool.mockReturnValue({}); // any truthy pool
  h.resolveAppUserIdByEmail.mockResolvedValue("user-1");
});

describe("resolveActingUser", () => {
  it("resolves the signed-in employee's app_user.id (and carries the email)", async () => {
    await expect(resolveActingUser()).resolves.toEqual({
      ok: true,
      id: "user-1",
      email: "ada@imperionllc.com",
    });
    expect(h.resolveAppUserIdByEmail).toHaveBeenCalledWith("ada@imperionllc.com");
  });

  it("reports no_session when the session carries no email", async () => {
    h.auth.mockResolvedValue(null);
    await expect(resolveActingUser()).resolves.toEqual({
      ok: false,
      reason: "no_session",
      email: null,
    });
    expect(h.resolveAppUserIdByEmail).not.toHaveBeenCalled();
  });

  it("reports no_database in mock mode (no pool)", async () => {
    h.getPool.mockReturnValue(null);
    await expect(resolveActingUser()).resolves.toEqual({
      ok: false,
      reason: "no_database",
      email: "ada@imperionllc.com",
    });
  });

  it("reports not_provisioned when no app_user row exists yet", async () => {
    h.resolveAppUserIdByEmail.mockResolvedValue(null);
    await expect(resolveActingUser()).resolves.toEqual({
      ok: false,
      reason: "not_provisioned",
      email: "ada@imperionllc.com",
    });
  });
});
