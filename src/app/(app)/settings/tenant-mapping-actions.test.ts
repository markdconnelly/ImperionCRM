import { beforeEach, describe, expect, it, vi } from "vitest";

// Policy gating + validation tests for the Tenant Mapping actions (#150).
// Mocked at the boundaries (guard, repos, next/cache); the real actions run.
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  upsertTenantMapping: vi.fn(),
  deleteTenantMapping: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/data", () => ({
  getRepositories: () => ({
    security: {
      upsertTenantMapping: h.upsertTenantMapping,
      deleteTenantMapping: h.deleteTenantMapping,
    },
  }),
}));

import { deleteTenantMappingAction, saveTenantMappingAction } from "./tenant-mapping-actions";

const GUID = "11111111-AAAA-bbbb-CCCC-222222222222";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.requireCapability.mockResolvedValue(["admin"]);
});

describe("saveTenantMappingAction (ADR-0051 — admin-gated, explicit mapping)", () => {
  it("requires settings:write before touching the repository", async () => {
    h.requireCapability.mockRejectedValueOnce(new Error("forbidden"));
    await expect(
      saveTenantMappingAction(form({ tenantId: GUID, accountId: "acc-1" })),
    ).rejects.toThrow("forbidden");
    expect(h.upsertTenantMapping).not.toHaveBeenCalled();
  });

  it("upserts with the GUID lowercased and revalidates Settings", async () => {
    await saveTenantMappingAction(
      form({ tenantId: GUID, accountId: "acc-1", displayName: "  Contoso prod  " }),
    );
    expect(h.upsertTenantMapping).toHaveBeenCalledWith({
      tenantId: GUID.toLowerCase(),
      accountId: "acc-1",
      displayName: "Contoso prod",
    });
    expect(h.revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("rejects a non-GUID tenant id without writing (mis-paste guard)", async () => {
    await saveTenantMappingAction(form({ tenantId: "contoso.com", accountId: "acc-1" }));
    expect(h.upsertTenantMapping).not.toHaveBeenCalled();
  });

  it("rejects a missing account without writing", async () => {
    await saveTenantMappingAction(form({ tenantId: GUID }));
    expect(h.upsertTenantMapping).not.toHaveBeenCalled();
  });
});

describe("deleteTenantMappingAction", () => {
  it("requires settings:write before touching the repository", async () => {
    h.requireCapability.mockRejectedValueOnce(new Error("forbidden"));
    await expect(deleteTenantMappingAction(form({ tenantId: GUID }))).rejects.toThrow(
      "forbidden",
    );
    expect(h.deleteTenantMapping).not.toHaveBeenCalled();
  });

  it("deletes by tenant id and revalidates Settings", async () => {
    await deleteTenantMappingAction(form({ tenantId: GUID }));
    expect(h.deleteTenantMapping).toHaveBeenCalledWith(GUID);
    expect(h.revalidatePath).toHaveBeenCalledWith("/settings");
  });
});
