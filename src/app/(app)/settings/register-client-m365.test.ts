import { beforeEach, describe, expect, it, vi } from "vitest";

// Validation + custody-proxy tests for registerClientM365Action (#950). The real action
// runs; only the boundaries are mocked (guard, next/cache, the connections service). The
// secret value must reach the backend exactly once and never appear in the rendered result.
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  registerClientM365: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
// actions.ts imports `auth` from @/auth (next-auth) at module load; next-auth fails to
// resolve under vitest, so stub it — registerClientM365Action never calls it.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/data", () => ({ getRepositories: () => ({}) }));
vi.mock("@/lib/data/app-user", () => ({ resolveAppUserIdByEmail: vi.fn() }));
vi.mock("@/lib/services", () => ({
  connectionsService: { registerClientM365: h.registerClientM365 },
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

import { registerClientM365Action } from "./actions";

const TENANT = "11111111-1111-1111-1111-111111111111";
const APP = "22222222-2222-2222-2222-222222222222";
const ACCOUNT = "33333333-3333-3333-3333-333333333333";
const THUMB = "0123456789ABCDEF0123456789ABCDEF01234567";

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const validSecret = {
  accountId: ACCOUNT,
  tenantId: TENANT,
  clientAppId: APP,
  authMethod: "secret",
  clientSecret: "s3cr3t-value",
};

beforeEach(() => {
  vi.clearAllMocks();
  h.requireCapability.mockResolvedValue(undefined);
  h.registerClientM365.mockResolvedValue({ connectionId: "conn-1" });
});

describe("registerClientM365Action", () => {
  it("requires the settings:write capability", async () => {
    await registerClientM365Action(fd(validSecret));
    expect(h.requireCapability).toHaveBeenCalledWith("settings:write");
  });

  it("rejects a missing account without calling the backend", async () => {
    const r = await registerClientM365Action(fd({ ...validSecret, accountId: "" }));
    expect(r).toMatchObject({ ok: false, tone: "red" });
    expect(h.registerClientM365).not.toHaveBeenCalled();
  });

  it("rejects a non-GUID tenant id", async () => {
    const r = await registerClientM365Action(fd({ ...validSecret, tenantId: "not-a-guid" }));
    expect(r.ok).toBe(false);
    expect(h.registerClientM365).not.toHaveBeenCalled();
  });

  it("rejects a non-GUID app (client) id", async () => {
    const r = await registerClientM365Action(fd({ ...validSecret, clientAppId: "nope" }));
    expect(r.ok).toBe(false);
    expect(h.registerClientM365).not.toHaveBeenCalled();
  });

  it("rejects secret auth with no secret", async () => {
    const r = await registerClientM365Action(fd({ ...validSecret, clientSecret: "" }));
    expect(r.ok).toBe(false);
    expect(h.registerClientM365).not.toHaveBeenCalled();
  });

  it("rejects certificate auth with a malformed thumbprint", async () => {
    const r = await registerClientM365Action(
      fd({
        accountId: ACCOUNT,
        tenantId: TENANT,
        clientAppId: APP,
        authMethod: "certificate",
        certThumbprint: "TOOSHORT",
      }),
    );
    expect(r.ok).toBe(false);
    expect(h.registerClientM365).not.toHaveBeenCalled();
  });

  it("proxies a valid secret registration and never echoes the secret", async () => {
    const r = await registerClientM365Action(fd(validSecret));
    expect(r).toMatchObject({ ok: true, tone: "green" });
    expect(h.registerClientM365).toHaveBeenCalledTimes(1);
    expect(h.registerClientM365).toHaveBeenCalledWith({
      accountId: ACCOUNT,
      tenantId: TENANT,
      clientAppId: APP,
      authMethod: "secret",
      clientSecret: "s3cr3t-value",
      certThumbprint: undefined,
      displayName: undefined,
    });
    expect(JSON.stringify(r)).not.toContain("s3cr3t-value");
    expect(h.revalidatePath).toHaveBeenCalledWith("/settings/client-mapping/m365");
  });

  it("sends only the thumbprint for certificate auth (no secret)", async () => {
    const r = await registerClientM365Action(
      fd({
        accountId: ACCOUNT,
        tenantId: TENANT,
        clientAppId: APP,
        authMethod: "certificate",
        certThumbprint: THUMB,
        displayName: "Contoso — M365",
      }),
    );
    expect(r.ok).toBe(true);
    expect(h.registerClientM365).toHaveBeenCalledWith({
      accountId: ACCOUNT,
      tenantId: TENANT,
      clientAppId: APP,
      authMethod: "certificate",
      clientSecret: undefined,
      certThumbprint: THUMB,
      displayName: "Contoso — M365",
    });
  });

  it("degrades to an amber notice when the backend isn't configured (501)", async () => {
    const { ServiceCallError } = await import("@/lib/services/external-client");
    h.registerClientM365.mockRejectedValueOnce(
      new ServiceCallError("integration", 501, "not built"),
    );
    const r = await registerClientM365Action(fd(validSecret));
    expect(r).toMatchObject({ ok: false, tone: "amber" });
  });
});
