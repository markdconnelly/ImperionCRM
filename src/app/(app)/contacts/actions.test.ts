import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wiring tests for issue #89 (contact half): manual contact edits nudge the
 * pipeline's bronze→silver merge. Boundaries mocked; real merge-refresh helper.
 */
const h = vi.hoisted(() => ({
  refresh: vi.fn(),
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  createContact: vi.fn(),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("@/lib/services", () => ({ pipelineService: { refresh: h.refresh } }));
vi.mock("@/lib/services/external-client", () => ({
  ServiceNotConfiguredError: class ServiceNotConfiguredError extends Error {},
}));
vi.mock("@/lib/data", () => ({
  getRepositories: () => ({
    contacts: {
      createContact: h.createContact,
      updateContact: h.updateContact,
      deleteContact: h.deleteContact,
    },
  }),
}));

import { createContactAction, updateContactAction } from "./actions";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.refresh.mockResolvedValue({ source: "merge", ran: true });
  h.createContact.mockResolvedValue("c1");
});

describe("createContactAction", () => {
  it("fires a merge refresh after the bronze write, then redirects", async () => {
    await expect(createContactAction(form({ fullName: "Ada Lovelace" }))).rejects.toThrow(
      "NEXT_REDIRECT:/contacts/c1",
    );
    expect(h.createContact).toHaveBeenCalled();
    expect(h.refresh).toHaveBeenCalledWith({ source: "merge" });
    expect(h.createContact.mock.invocationCallOrder[0]).toBeLessThan(
      h.refresh.mock.invocationCallOrder[0],
    );
  });

  it("still saves and redirects when the pipeline call fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.refresh.mockRejectedValue(new Error("pipeline down"));
    await expect(createContactAction(form({ fullName: "Ada Lovelace" }))).rejects.toThrow(
      "NEXT_REDIRECT:/contacts/c1",
    );
    expect(h.createContact).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("updateContactAction", () => {
  it("fires a merge refresh after the bronze write, then redirects", async () => {
    await expect(
      updateContactAction(form({ id: "c1", fullName: "Ada Lovelace" })),
    ).rejects.toThrow("NEXT_REDIRECT:/contacts/c1");
    expect(h.updateContact).toHaveBeenCalled();
    expect(h.refresh).toHaveBeenCalledWith({ source: "merge" });
    expect(h.updateContact.mock.invocationCallOrder[0]).toBeLessThan(
      h.refresh.mock.invocationCallOrder[0],
    );
  });

  it("still saves and redirects when the pipeline call fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.refresh.mockRejectedValue(new Error("pipeline down"));
    await expect(
      updateContactAction(form({ id: "c1", fullName: "Ada Lovelace" })),
    ).rejects.toThrow("NEXT_REDIRECT:/contacts/c1");
    expect(h.updateContact).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
