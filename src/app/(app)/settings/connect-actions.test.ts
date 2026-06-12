import { beforeEach, describe, expect, it, vi } from "vitest";

// Validation tests for connectAction (#194): allowlisted provider/scope only, and a
// user-scope row must resolve to a real app_user (fail closed — never owner NULL).
// Mocked at the boundaries (guard, auth, repos, services, next/*); the real action runs.
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  auth: vi.fn(),
  connect: vi.fn(),
  startOAuth: vi.fn(),
  resolveAppUserIdByEmail: vi.fn(),
}));

// next/navigation's redirect never returns — model that or the action would run on.
class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`redirect:${url}`);
  }
}

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: h.redirect.mockImplementation((url: string) => {
    throw new RedirectSignal(url);
  }),
}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/auth", () => ({ auth: h.auth }));
vi.mock("@/lib/data", () => ({
  getRepositories: () => ({ connections: { connect: h.connect } }),
}));
vi.mock("@/lib/data/app-user", () => ({
  resolveAppUserIdByEmail: h.resolveAppUserIdByEmail,
}));
vi.mock("@/lib/services", () => ({
  connectionsService: { startOAuth: h.startOAuth },
  credentialsService: {},
  pipelineService: {},
}));
vi.mock("@/lib/services/external-client", () => {
  class ServiceNotConfiguredError extends Error {}
  class ServiceCallError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
    }
  }
  return { ServiceNotConfiguredError, ServiceCallError };
});

import { connectAction } from "./actions";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

async function runExpectingRedirect(fd: FormData): Promise<string> {
  try {
    await connectAction(fd);
  } catch (err) {
    if (err instanceof RedirectSignal) return err.url;
    throw err;
  }
  throw new Error("expected connectAction to redirect");
}

beforeEach(() => {
  vi.clearAllMocks();
  h.requireCapability.mockResolvedValue(["admin"]);
  h.auth.mockResolvedValue({ user: { email: "mark@imperion.com" } });
  h.resolveAppUserIdByEmail.mockResolvedValue("user-1");
});

describe("connectAction (#194 — allowlist + fail-closed owner resolution)", () => {
  it("requires settings:write before anything else", async () => {
    h.requireCapability.mockRejectedValueOnce(new Error("forbidden"));
    await expect(connectAction(form({ provider: "plaud", scope: "user" }))).rejects.toThrow(
      "forbidden",
    );
    expect(h.connect).not.toHaveBeenCalled();
    expect(h.startOAuth).not.toHaveBeenCalled();
  });

  it("rejects a provider outside the allowlist without any DB write", async () => {
    const url = await runExpectingRedirect(form({ provider: "autotask", scope: "user" }));
    expect(url).toContain("connect=error");
    expect(h.connect).not.toHaveBeenCalled();
    expect(h.startOAuth).not.toHaveBeenCalled();
  });

  it("rejects a tampered scope without any DB write", async () => {
    const url = await runExpectingRedirect(form({ provider: "m365", scope: "company" }));
    expect(url).toContain("connect=error");
    expect(h.connect).not.toHaveBeenCalled();
    expect(h.startOAuth).not.toHaveBeenCalled();
  });

  it("fails closed when the session email resolves to no app_user (never owner NULL)", async () => {
    h.resolveAppUserIdByEmail.mockResolvedValue(null);
    const url = await runExpectingRedirect(form({ provider: "plaud", scope: "user" }));
    expect(url).toContain("connect=error");
    expect(h.connect).not.toHaveBeenCalled();
  });

  it("fails closed when the session has no email", async () => {
    h.auth.mockResolvedValue({ user: {} });
    const url = await runExpectingRedirect(form({ provider: "plaud", scope: "user" }));
    expect(url).toContain("connect=error");
    expect(h.connect).not.toHaveBeenCalled();
    expect(h.resolveAppUserIdByEmail).not.toHaveBeenCalled();
  });

  it("records the stub row for key-based Plaud with a resolved owner", async () => {
    const url = await runExpectingRedirect(form({ provider: "plaud", scope: "user" }));
    expect(url).toContain("connect=stubbed");
    expect(h.startOAuth).not.toHaveBeenCalled();
    expect(h.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "user",
        provider: "plaud",
        ownerEmail: "mark@imperion.com",
      }),
    );
  });

  it("redirects to the provider consent URL for a live OAuth provider", async () => {
    h.startOAuth.mockResolvedValue({ authorizationUrl: "https://login.example/consent" });
    const url = await runExpectingRedirect(form({ provider: "m365", scope: "user" }));
    expect(url).toBe("https://login.example/consent");
    expect(h.connect).not.toHaveBeenCalled();
  });
});
