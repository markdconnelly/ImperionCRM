import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wiring tests for issue #89: manual account edits nudge the pipeline's
 * bronze→silver merge so the edit is visible before the 5-minute sweep.
 * Mocked at the boundaries (repos, guard, next, pipeline service); the real
 * merge-refresh helper runs.
 */
const h = vi.hoisted(() => ({
  refresh: vi.fn(),
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`); // the real redirect() throws too
  }),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("@/lib/services", () => ({ pipelineService: { refresh: h.refresh } }));
vi.mock("@/lib/services/external-client", () => ({
  ServiceNotConfiguredError: class ServiceNotConfiguredError extends Error {},
  ServiceCallError: class ServiceCallError extends Error {
    constructor(
      name: string,
      public status: number,
    ) {
      super(`${name} returned ${status}`);
    }
  },
}));
vi.mock("@/lib/data", () => ({
  getRepositories: () => ({
    crm: {
      createAccount: h.createAccount,
      updateAccount: h.updateAccount,
      deleteAccount: h.deleteAccount,
    },
  }),
}));

import { ServiceNotConfiguredError } from "@/lib/services/external-client";
import { createAccountAction, refreshPostureAction, updateAccountAction } from "./actions";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.refresh.mockResolvedValue({ source: "merge", ran: true });
});

describe("createAccountAction", () => {
  it("fires a merge refresh after the bronze write, then redirects", async () => {
    await expect(createAccountAction(form({ name: "Acme" }))).rejects.toThrow(
      "NEXT_REDIRECT:/accounts",
    );
    expect(h.createAccount).toHaveBeenCalled();
    expect(h.refresh).toHaveBeenCalledWith({ source: "merge" });
    expect(h.createAccount.mock.invocationCallOrder[0]).toBeLessThan(
      h.refresh.mock.invocationCallOrder[0],
    );
  });

  it("still saves and redirects when the pipeline call fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.refresh.mockRejectedValue(new Error("pipeline down"));
    await expect(createAccountAction(form({ name: "Acme" }))).rejects.toThrow(
      "NEXT_REDIRECT:/accounts",
    );
    expect(h.createAccount).toHaveBeenCalled();
    expect(h.refresh).toHaveBeenCalledWith({ source: "merge" }); // the nudge was attempted
    await new Promise((r) => setTimeout(r, 0)); // let the swallowed rejection settle
    errorSpy.mockRestore();
  });
});

describe("refreshPostureAction (#155 — account-scoped posture refresh, ADR-0051 §2)", () => {
  it("awaits the account-scoped posture refresh, then revalidates the account page", async () => {
    await refreshPostureAction(form({ accountId: "acc-1" }));
    expect(h.requireCapability).toHaveBeenCalledWith("crm:write");
    expect(h.refresh).toHaveBeenCalledWith({ source: "posture", accountId: "acc-1" });
    expect(h.revalidatePath).toHaveBeenCalledWith("/accounts/acc-1");
  });

  it("does nothing without an accountId (posture is the only account-scoped source)", async () => {
    await refreshPostureAction(form({}));
    expect(h.refresh).not.toHaveBeenCalled();
    expect(h.revalidatePath).not.toHaveBeenCalled();
  });

  it("degrades silently when the pipeline is unconfigured", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.refresh.mockRejectedValueOnce(
      new ServiceNotConfiguredError("pipeline", "PIPELINE_SERVICE_URL"),
    );
    await refreshPostureAction(form({ accountId: "acc-1" }));
    expect(errorSpy).not.toHaveBeenCalled(); // unconfigured → quiet no-op
    expect(h.revalidatePath).toHaveBeenCalledWith("/accounts/acc-1");
    errorSpy.mockRestore();
  });

  it("logs but never throws on other pipeline failures", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.refresh.mockRejectedValueOnce(new Error("pipeline down"));
    await expect(refreshPostureAction(form({ accountId: "acc-1" }))).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    expect(h.revalidatePath).toHaveBeenCalledWith("/accounts/acc-1");
    errorSpy.mockRestore();
  });
});

describe("updateAccountAction", () => {
  it("fires a merge refresh after the bronze write, then redirects", async () => {
    await expect(updateAccountAction(form({ id: "a1", name: "Acme" }))).rejects.toThrow(
      "NEXT_REDIRECT:/accounts",
    );
    expect(h.updateAccount).toHaveBeenCalled();
    expect(h.refresh).toHaveBeenCalledWith({ source: "merge" });
    expect(h.updateAccount.mock.invocationCallOrder[0]).toBeLessThan(
      h.refresh.mock.invocationCallOrder[0],
    );
  });

  it("still saves and redirects when the pipeline call fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.refresh.mockRejectedValue(new Error("pipeline down"));
    await expect(updateAccountAction(form({ id: "a1", name: "Acme" }))).rejects.toThrow(
      "NEXT_REDIRECT:/accounts",
    );
    expect(h.updateAccount).toHaveBeenCalled();
    expect(h.refresh).toHaveBeenCalledWith({ source: "merge" }); // the nudge was attempted
    await new Promise((r) => setTimeout(r, 0)); // let the swallowed rejection settle
    errorSpy.mockRestore();
  });
});
