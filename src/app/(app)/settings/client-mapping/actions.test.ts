import { beforeEach, describe, expect, it, vi } from "vitest";

// Policy gating + adapter-resolution + backend-proxy tests for the Client Mapping actions
// (ADR-0112, epic #1141 unit E). Mocked at the boundaries (guard, service, next/cache); the
// real actions run. The service is the backend write path — the action must never write directly.
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  link: vi.fn(),
  unlink: vi.fn(),
  upsertTenantMapping: vi.fn(),
  deleteTenantMapping: vi.fn(),
  // A stand-in ServiceNotConfiguredError (a plain 1-arg Error subclass) so the degrade path is
  // exercised faithfully without depending on the real 2-arg constructor signature.
  ServiceNotConfiguredError: class ServiceNotConfiguredError extends Error {},
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/services", () => ({
  clientMappingService: { link: h.link, unlink: h.unlink },
}));
vi.mock("@/lib/services/external-client", () => ({
  ServiceNotConfiguredError: h.ServiceNotConfiguredError,
}));
vi.mock("@/lib/data", () => ({
  getRepositories: () => ({
    security: {
      upsertTenantMapping: h.upsertTenantMapping,
      deleteTenantMapping: h.deleteTenantMapping,
    },
  }),
}));

const TENANT = "11111111-1111-1111-1111-111111111111";

import {
  linkClientMappingAction,
  mapAccountTenantAction,
  unlinkClientMappingAction,
} from "./actions";

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
    h.link.mockRejectedValueOnce(new h.ServiceNotConfiguredError("not configured"));
    await expect(
      linkClientMappingAction(form({ connector: "autotask", sourceKey: "AT-1", accountId: "a1" })),
    ).resolves.toBeUndefined();
    expect(h.revalidatePath).toHaveBeenCalled();
  });

  it("does not dual-write account_tenant for a fan-out connector (autotask)", async () => {
    await linkClientMappingAction(form({ connector: "autotask", sourceKey: "AT-1", accountId: "a1" }));
    expect(h.upsertTenantMapping).not.toHaveBeenCalled();
  });

  it("m365: proxies entity_xref AND dual-writes account_tenant for a valid tenant GUID (#1049)", async () => {
    await linkClientMappingAction(form({ connector: "m365", sourceKey: TENANT, accountId: "a1" }));
    expect(h.link).toHaveBeenCalledWith({
      entityType: "account",
      sourceSystem: "m365",
      sourceKey: TENANT,
      internalEntityId: "a1",
      connectionId: undefined,
    });
    expect(h.upsertTenantMapping).toHaveBeenCalledWith({
      tenantId: TENANT,
      accountId: "a1",
      displayName: null,
    });
  });

  it("m365: carries the bound connectionId through to the backend (bindsConnection)", async () => {
    await linkClientMappingAction(
      form({ connector: "m365", sourceKey: TENANT, accountId: "a1", connectionId: "cn_9" }),
    );
    expect(h.link).toHaveBeenCalledWith(expect.objectContaining({ connectionId: "cn_9" }));
  });

  it("m365: skips the account_tenant dual-write when the sourceKey isn't a tenant GUID", async () => {
    await linkClientMappingAction(form({ connector: "m365", sourceKey: "not-a-guid", accountId: "a1" }));
    expect(h.upsertTenantMapping).not.toHaveBeenCalled();
  });
});

describe("mapAccountTenantAction (account-first, #1371)", () => {
  it("requires settings:write before writing anything", async () => {
    h.requireCapability.mockRejectedValueOnce(new Error("forbidden"));
    await expect(
      mapAccountTenantAction(form({ accountId: "a1", tenantId: TENANT })),
    ).rejects.toThrow("forbidden");
    expect(h.link).not.toHaveBeenCalled();
    expect(h.upsertTenantMapping).not.toHaveBeenCalled();
  });

  it("dual-writes entity_xref (backend) + account_tenant for a valid GUID, lowercased", async () => {
    await mapAccountTenantAction(
      form({ accountId: "a1", tenantId: TENANT.toUpperCase(), displayName: "Acme M365" }),
    );
    expect(h.link).toHaveBeenCalledWith({
      entityType: "account",
      sourceSystem: "m365",
      sourceKey: TENANT,
      internalEntityId: "a1",
    });
    expect(h.upsertTenantMapping).toHaveBeenCalledWith({
      tenantId: TENANT,
      accountId: "a1",
      displayName: "Acme M365",
    });
    expect(h.revalidatePath).toHaveBeenCalledWith("/settings/client-mapping/m365");
  });

  it("normalizes a blank display name to null", async () => {
    await mapAccountTenantAction(form({ accountId: "a1", tenantId: TENANT, displayName: "  " }));
    expect(h.upsertTenantMapping).toHaveBeenCalledWith({
      tenantId: TENANT,
      accountId: "a1",
      displayName: null,
    });
  });

  it("no-ops on a malformed tenant GUID (never seeds a bad row)", async () => {
    await mapAccountTenantAction(form({ accountId: "a1", tenantId: "not-a-guid" }));
    expect(h.link).not.toHaveBeenCalled();
    expect(h.upsertTenantMapping).not.toHaveBeenCalled();
  });

  it("no-ops when the accountId is missing", async () => {
    await mapAccountTenantAction(form({ tenantId: TENANT }));
    expect(h.link).not.toHaveBeenCalled();
    expect(h.upsertTenantMapping).not.toHaveBeenCalled();
  });

  it("degrades quietly when the backend isn't configured (still writes account_tenant)", async () => {
    h.link.mockRejectedValueOnce(new h.ServiceNotConfiguredError("not configured"));
    await expect(
      mapAccountTenantAction(form({ accountId: "a1", tenantId: TENANT })),
    ).resolves.toBeUndefined();
    expect(h.upsertTenantMapping).toHaveBeenCalled();
    expect(h.revalidatePath).toHaveBeenCalledWith("/settings/client-mapping/m365");
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
    expect(h.deleteTenantMapping).not.toHaveBeenCalled();
  });

  it("m365: also drops the legacy account_tenant row for a valid tenant GUID (#1049)", async () => {
    await unlinkClientMappingAction(form({ connector: "m365", sourceKey: TENANT }));
    expect(h.unlink).toHaveBeenCalledWith({
      entityType: "account",
      sourceSystem: "m365",
      sourceKey: TENANT,
    });
    expect(h.deleteTenantMapping).toHaveBeenCalledWith(TENANT);
  });
});
