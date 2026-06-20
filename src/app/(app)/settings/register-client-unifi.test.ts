import { beforeEach, describe, expect, it, vi } from "vitest";

// Validation + custody-proxy tests for registerClientUnifiAction (#964). The real action
// runs; only the boundaries are mocked (guard, next/cache, the connections service). The API
// key must reach the backend exactly once and never appear in the rendered result.
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  registerClientUnifi: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
// actions.ts imports `auth` from @/auth (next-auth) at module load; next-auth fails to
// resolve under vitest, so stub it — registerClientUnifiAction never calls it.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/data", () => ({ getRepositories: () => ({}) }));
vi.mock("@/lib/data/app-user", () => ({ resolveAppUserIdByEmail: vi.fn() }));
vi.mock("@/lib/services", () => ({
  connectionsService: { registerClientUnifi: h.registerClientUnifi },
  credentialsService: {},
  pipelineService: {},
}));
// external-client imports `server-only`, which vitest can't resolve — stub the error
// classes locally (instanceof still works because call-guard imports the same mock).
vi.mock("@/lib/services/external-client", () => {
  class ServiceNotConfiguredError extends Error {}
  class ServiceCallError extends Error {
    constructor(
      serviceName: string,
      public readonly status: number,
      body = "",
    ) {
      super(`${serviceName} ${status} ${body}`);
    }
  }
  return { ServiceNotConfiguredError, ServiceCallError };
});

import { registerClientUnifiAction } from "./actions";

const ACCOUNT = "33333333-3333-3333-3333-333333333333";
const CONSOLE = "default-site-01";

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const validConsole = {
  accountId: ACCOUNT,
  consoleId: CONSOLE,
  apiKey: "unifi-api-key-value",
  connectionType: "console",
  controllerHost: "unifi.contoso.local",
};

const validCloud = {
  accountId: ACCOUNT,
  consoleId: CONSOLE,
  apiKey: "unifi-api-key-value",
  connectionType: "cloud",
};

beforeEach(() => {
  vi.clearAllMocks();
  h.requireCapability.mockResolvedValue(undefined);
  h.registerClientUnifi.mockResolvedValue({ connectionId: "conn-u1" });
});

describe("registerClientUnifiAction", () => {
  it("requires the settings:write capability", async () => {
    await registerClientUnifiAction(fd(validConsole));
    expect(h.requireCapability).toHaveBeenCalledWith("settings:write");
  });

  it("rejects a missing account without calling the backend", async () => {
    const r = await registerClientUnifiAction(fd({ ...validConsole, accountId: "" }));
    expect(r).toMatchObject({ ok: false, tone: "red" });
    expect(h.registerClientUnifi).not.toHaveBeenCalled();
  });

  it("rejects a console id with disallowed characters", async () => {
    const r = await registerClientUnifiAction(fd({ ...validConsole, consoleId: "bad/id$" }));
    expect(r.ok).toBe(false);
    expect(h.registerClientUnifi).not.toHaveBeenCalled();
  });

  it("rejects an unknown connection type", async () => {
    const r = await registerClientUnifiAction(fd({ ...validConsole, connectionType: "satellite" }));
    expect(r.ok).toBe(false);
    expect(h.registerClientUnifi).not.toHaveBeenCalled();
  });

  it("rejects a console connection with no controller host", async () => {
    const r = await registerClientUnifiAction(fd({ ...validConsole, controllerHost: "" }));
    expect(r.ok).toBe(false);
    expect(h.registerClientUnifi).not.toHaveBeenCalled();
  });

  it("rejects a missing API key", async () => {
    const r = await registerClientUnifiAction(fd({ ...validCloud, apiKey: "" }));
    expect(r.ok).toBe(false);
    expect(h.registerClientUnifi).not.toHaveBeenCalled();
  });

  it("proxies a valid console registration and never echoes the key", async () => {
    const r = await registerClientUnifiAction(fd(validConsole));
    expect(r).toMatchObject({ ok: true, tone: "green" });
    expect(h.registerClientUnifi).toHaveBeenCalledTimes(1);
    expect(h.registerClientUnifi).toHaveBeenCalledWith({
      accountId: ACCOUNT,
      consoleId: CONSOLE,
      apiKey: "unifi-api-key-value",
      connectionType: "console",
      controllerHost: "unifi.contoso.local",
      displayName: undefined,
    });
    expect(JSON.stringify(r)).not.toContain("unifi-api-key-value");
    expect(h.revalidatePath).toHaveBeenCalledWith("/settings/credentials");
  });

  it("drops the controller host for a cloud console", async () => {
    const r = await registerClientUnifiAction(
      fd({ ...validCloud, controllerHost: "should-be-ignored", displayName: "Contoso — UniFi" }),
    );
    expect(r.ok).toBe(true);
    expect(h.registerClientUnifi).toHaveBeenCalledWith({
      accountId: ACCOUNT,
      consoleId: CONSOLE,
      apiKey: "unifi-api-key-value",
      connectionType: "cloud",
      controllerHost: undefined,
      displayName: "Contoso — UniFi",
    });
  });

  it("degrades to an amber notice when the backend isn't configured (501)", async () => {
    const { ServiceCallError } = await import("@/lib/services/external-client");
    h.registerClientUnifi.mockRejectedValueOnce(
      new ServiceCallError("integration", 501, "not built"),
    );
    const r = await registerClientUnifiAction(fd(validConsole));
    expect(r).toMatchObject({ ok: false, tone: "amber" });
  });
});
