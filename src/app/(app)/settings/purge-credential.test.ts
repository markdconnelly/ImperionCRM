import { beforeEach, describe, expect, it, vi } from "vitest";

// Tests for purgeCredentialAction (#1282). Real action runs; only the boundaries are mocked
// (guard, next/cache, the connections repo, the credentials service). Backend-first then
// local-fallback semantics + idempotency are the contract under test.
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  purgeCredential: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/data", () => ({ getRepositories: () => ({ connections: { disconnect: h.disconnect } }) }));
vi.mock("@/lib/data/app-user", () => ({ resolveAppUserIdByEmail: vi.fn() }));
vi.mock("@/lib/services", () => ({
  connectionsService: {},
  credentialsService: { purgeCredential: h.purgeCredential },
  pipelineService: {},
}));
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

import { purgeCredentialAction } from "./actions";

const ID = "11111111-1111-1111-1111-111111111111";

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.requireCapability.mockResolvedValue(undefined);
  h.purgeCredential.mockResolvedValue({ deleted: true, connectionId: ID, keyvaultSecretRef: null });
  h.disconnect.mockResolvedValue(undefined);
});

describe("purgeCredentialAction", () => {
  it("requires the settings:write capability", async () => {
    await purgeCredentialAction(fd({ id: ID }));
    expect(h.requireCapability).toHaveBeenCalledWith("settings:write");
  });

  it("no-ops on a missing id (no backend call)", async () => {
    await purgeCredentialAction(fd({ id: "" }));
    expect(h.purgeCredential).not.toHaveBeenCalled();
    expect(h.disconnect).not.toHaveBeenCalled();
  });

  it("purges via the backend then revalidates — and NEVER deletes the row client-side", async () => {
    await purgeCredentialAction(fd({ id: ID }));
    expect(h.purgeCredential).toHaveBeenCalledWith({ connectionId: ID });
    // The backend owns the DELETE (the web role has none, ADR-0042) — the action must not.
    expect(h.disconnect).not.toHaveBeenCalled();
    expect(h.revalidatePath).toHaveBeenCalledWith("/settings/connections");
  });

  it("also revalidates the client-mapping page when a connector is supplied", async () => {
    await purgeCredentialAction(fd({ id: ID, connector: "m365" }));
    expect(h.revalidatePath).toHaveBeenCalledWith("/settings/client-mapping/m365");
  });

  it("leaves the row (never throws, never client-deletes) when the backend is not configured", async () => {
    const { ServiceCallError } = await import("@/lib/services/external-client");
    h.purgeCredential.mockRejectedValueOnce(new ServiceCallError("integration", 501, "not built"));
    await expect(purgeCredentialAction(fd({ id: ID }))).resolves.toBeUndefined();
    expect(h.disconnect).not.toHaveBeenCalled();
    expect(h.revalidatePath).toHaveBeenCalledWith("/settings/connections");
  });

  it("swallows an unexpected backend error (no throw, no client-delete) so the action never 503s", async () => {
    const { ServiceCallError } = await import("@/lib/services/external-client");
    h.purgeCredential.mockRejectedValueOnce(new ServiceCallError("integration", 500, "boom"));
    await expect(purgeCredentialAction(fd({ id: ID }))).resolves.toBeUndefined();
    expect(h.disconnect).not.toHaveBeenCalled();
    expect(h.revalidatePath).toHaveBeenCalledWith("/settings/connections");
  });
});
