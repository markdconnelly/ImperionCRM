import { beforeEach, describe, expect, it, vi } from "vitest";

// Policy gating + adapter-resolution + backend-proxy tests for the Client Mapping actions
// (ADR-0112, epic #1141 unit E). Mocked at the boundaries (guard, service, next/cache); the
// real actions run. The service is the backend write path — the action must never write directly.
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  link: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/services", () => ({
  clientMappingService: { link: h.link, unlink: h.unlink },
}));
// A stand-in ServiceNotConfiguredError so the degrade path is exercised faithfully. Defined
// inside the factory (vi.mock is hoisted above the file body, so it can't close over a const).
vi.mock("@/lib/services/external-client", () => ({
  ServiceNotConfiguredError: class ServiceNotConfiguredError extends Error {},
}));

import { linkClientMappingAction, unlinkClientMappingAction } from "./actions";
import { ServiceNotConfiguredError } from "@/lib/services/external-client";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.requireCapability.mockResolvedValue(["admin"]);
});

describe("linkClientMappingAction", () => {
  it("requires settings:write before proxying to the backend", async () => {
    h.requireCapability.mockRejectedValueOnce(new Error("forbidden"));
    await expect(
      linkClientMappingAction(form({ connector: "autotask", sourceKey: "AT-1", accountId: "a1" })),
    ).rejects.toThrow("forbidden");
    expect(h.link).not.toHaveBeenCalled();
  });

  it("resolves the adapter server-side and proxies the manual link, then revalidates", async () => {
    await linkClientMappingAction(form({ connector: "autotask", sourceKey: "AT-1", accountId: "a1" }));
    expect(h.link).toHaveBeenCalledWith({
      entityType: "account",
      sourceSystem: "autotask",
      sourceKey: "AT-1",
      internalEntityId: "a1",
    });
    expect(h.revalidatePath).toHaveBeenCalledWith("/settings/client-mapping/autotask");
  });

  it("does nothing for an unmappable connector (never trusts a client source_system)", async () => {
    await linkClientMappingAction(form({ connector: "qbo", sourceKey: "X", accountId: "a1" }));
    expect(h.link).not.toHaveBeenCalled();
  });

  it("does nothing when sourceKey or accountId is missing", async () => {
    await linkClientMappingAction(form({ connector: "autotask", sourceKey: "AT-1" }));
    expect(h.link).not.toHaveBeenCalled();
  });

  it("degrades quietly when the backend isn't configured", async () => {
    h.link.mockRejectedValueOnce(new ServiceNotConfiguredError("not configured"));
    await expect(
      linkClientMappingAction(form({ connector: "autotask", sourceKey: "AT-1", accountId: "a1" })),
    ).resolves.toBeUndefined();
    expect(h.revalidatePath).toHaveBeenCalled();
  });
});

describe("unlinkClientMappingAction", () => {
  it("requires settings:write before proxying", async () => {
    h.requireCapability.mockRejectedValueOnce(new Error("forbidden"));
    await expect(
      unlinkClientMappingAction(form({ connector: "autotask", sourceKey: "AT-1" })),
    ).rejects.toThrow("forbidden");
    expect(h.unlink).not.toHaveBeenCalled();
  });

  it("proxies the unlink and revalidates", async () => {
    await unlinkClientMappingAction(form({ connector: "autotask", sourceKey: "AT-1" }));
    expect(h.unlink).toHaveBeenCalledWith({
      entityType: "account",
      sourceSystem: "autotask",
      sourceKey: "AT-1",
    });
    expect(h.revalidatePath).toHaveBeenCalledWith("/settings/client-mapping/autotask");
  });
});
