import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wiring tests for issue #89 (contact half: merge nudges) and #183 (real 1:1
 * sends from the composer via the backend's approval-gated send path).
 * Boundaries mocked; real merge-refresh + call-guard seam run.
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
  getProfile: vi.fn(),
  canSend: vi.fn(),
  createInteraction: vi.fn(),
  listUserConnections: vi.fn(),
  executeAction: vi.fn(),
  resolveActingUser: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("@/lib/services", () => ({
  pipelineService: { refresh: h.refresh },
  agentService: { executeAction: h.executeAction },
}));
vi.mock("@/lib/services/acting-user", () => ({ resolveActingUser: h.resolveActingUser }));
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
    contacts: {
      createContact: h.createContact,
      updateContact: h.updateContact,
      deleteContact: h.deleteContact,
      getProfile: h.getProfile,
    },
    consent: { canSend: h.canSend },
    comms: { createInteraction: h.createInteraction },
    connections: { listUserConnections: h.listUserConnections },
  }),
}));

import { ServiceCallError, ServiceNotConfiguredError } from "@/lib/services/external-client";
import { createContactAction, sendMessageAction, updateContactAction } from "./actions";

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
    expect(h.refresh).toHaveBeenCalledWith({ source: "merge" }); // the nudge was attempted
    await new Promise((r) => setTimeout(r, 0)); // let the swallowed rejection settle
    errorSpy.mockRestore();
  });
});

describe("sendMessageAction (#183 — real 1:1 sends via the backend)", () => {
  const CONTACT = "11111111-1111-4111-8111-111111111111";
  const USER = "22222222-2222-4222-8222-222222222222";
  const CONN = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    h.canSend.mockResolvedValue(true);
    h.getProfile.mockResolvedValue({ id: CONTACT, email: "ada@acme.com", phone: "+15555550100" });
    h.resolveActingUser.mockResolvedValue({ ok: true, id: USER, email: "me@imperionllc.com" });
    h.listUserConnections.mockResolvedValue([
      { id: CONN, provider: "m365", status: "active" },
      { id: "x", provider: "linkedin", status: "active" },
    ]);
    h.executeAction.mockResolvedValue({ channel: "email", interactionId: "i1" });
  });

  function sendForm(fields: Record<string, string> = {}): FormData {
    return form({ contactId: CONTACT, channel: "email", subject: "Hi", body: "Hello", ...fields });
  }

  it("executes a REAL email send through the backend as the acting user's M365 mailbox", async () => {
    await expect(sendMessageAction(sendForm())).rejects.toThrow(
      `NEXT_REDIRECT:/contacts/${CONTACT}?sent=email&mode=real`,
    );
    expect(h.executeAction).toHaveBeenCalledWith({
      action: { kind: "send_email", contactId: CONTACT, channel: "email", subject: "Hi", body: "Hello" },
      approval: { approvedByUserId: USER, approved: true },
      to: "ada@acme.com",
      fromConnectionId: CONN,
    });
    expect(h.createInteraction).not.toHaveBeenCalled(); // the backend logs the interaction
  });

  it("sends SMS to the contact's phone without needing a connection", async () => {
    h.executeAction.mockResolvedValue({ channel: "sms", interactionId: "i2" });
    await expect(sendMessageAction(sendForm({ channel: "sms" }))).rejects.toThrow(
      `NEXT_REDIRECT:/contacts/${CONTACT}?sent=sms&mode=real`,
    );
    expect(h.executeAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.objectContaining({ kind: "send_sms" }), to: "+15555550100" }),
    );
    expect(h.listUserConnections).not.toHaveBeenCalled();
  });

  it("refuses before any send when the pre-check finds no consent", async () => {
    h.canSend.mockResolvedValue(false);
    await expect(sendMessageAction(sendForm())).rejects.toThrow(
      `NEXT_REDIRECT:/contacts/${CONTACT}?blocked=email`,
    );
    expect(h.executeAction).not.toHaveBeenCalled();
    expect(h.createInteraction).not.toHaveBeenCalled();
  });

  it("surfaces the backend consent gate's 403 as blocked — the authoritative refusal", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.executeAction.mockRejectedValue(new ServiceCallError("agent", 403, "consent_denied"));
    await expect(sendMessageAction(sendForm())).rejects.toThrow(
      `NEXT_REDIRECT:/contacts/${CONTACT}?blocked=email`,
    );
    expect(h.createInteraction).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("never fakes success: a failed REAL attempt redirects to an error, no stub log", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.executeAction.mockRejectedValue(new ServiceCallError("agent", 500, "boom"));
    await expect(sendMessageAction(sendForm())).rejects.toThrow(
      `NEXT_REDIRECT:/contacts/${CONTACT}?error=email`,
    );
    expect(h.createInteraction).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("falls back to the logged-to-timeline stub when the backend isn't configured", async () => {
    h.executeAction.mockRejectedValue(new ServiceNotConfiguredError("agent", "AGENT_SERVICE_URL"));
    await expect(sendMessageAction(sendForm())).rejects.toThrow(
      `NEXT_REDIRECT:/contacts/${CONTACT}?sent=email&mode=logged&reason=backend_unconfigured`,
    );
    expect(h.createInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: CONTACT, direction: "outbound", body: "Hello" }),
    );
  });

  it("falls back to the stub (with the reason) when the sender has no active M365 connection", async () => {
    h.listUserConnections.mockResolvedValue([{ id: "x", provider: "m365", status: "revoked" }]);
    await expect(sendMessageAction(sendForm())).rejects.toThrow(
      `NEXT_REDIRECT:/contacts/${CONTACT}?sent=email&mode=logged&reason=no_connection`,
    );
    expect(h.executeAction).not.toHaveBeenCalled();
    expect(h.createInteraction).toHaveBeenCalled();
  });

  it("falls back to the stub when the contact has no address for the channel", async () => {
    h.getProfile.mockResolvedValue({ id: CONTACT, email: null, phone: null });
    await expect(sendMessageAction(sendForm())).rejects.toThrow(
      `NEXT_REDIRECT:/contacts/${CONTACT}?sent=email&mode=logged&reason=no_address`,
    );
    expect(h.executeAction).not.toHaveBeenCalled();
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
    expect(h.refresh).toHaveBeenCalledWith({ source: "merge" }); // the nudge was attempted
    await new Promise((r) => setTimeout(r, 0)); // let the swallowed rejection settle
    errorSpy.mockRestore();
  });
});
