import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Wiring tests for the gated dunning SEND (#679, the SEND leg over the #678 panel).
 *
 * The send reuses the EXISTING ADR-0058 approval-gated path (`agentService.executeAction`)
 * — same seam as the contacts composer (#183). These tests pin: the human-gated real send
 * as the acting user's own M365 mailbox, the consent pre-check + the backend 403 authority,
 * the never-fake-success rule on a real failure, the honest logged-stub degradation, and
 * the recording contract (overlay reminder via upsertCollectionsActivity + an account
 * timeline entry). Boundaries mocked; the real call-guard seam runs.
 */
const h = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  getProfile: vi.fn(),
  canSend: vi.fn(),
  createInteraction: vi.fn(),
  listUserConnections: vi.fn(),
  executeAction: vi.fn(),
  resolveActingUser: vi.fn(),
  getCollectionsActivity: vi.fn(),
  upsertCollectionsActivity: vi.fn(),
  listInvoices: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireCapability: h.requireCapability }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/data/app-user", () => ({ resolveAppUserIdByEmail: vi.fn() }));
vi.mock("@/lib/services", () => ({ agentService: { executeAction: h.executeAction } }));
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
    crm: {
      getCollectionsActivity: h.getCollectionsActivity,
      upsertCollectionsActivity: h.upsertCollectionsActivity,
      listInvoices: h.listInvoices,
    },
    comms: { createInteraction: h.createInteraction },
    consent: { canSend: h.canSend },
    contacts: { getProfile: h.getProfile },
    connections: { listUserConnections: h.listUserConnections },
  }),
}));

import { ServiceCallError, ServiceNotConfiguredError } from "@/lib/services/external-client";
import { sendDunningReminderAction } from "./actions";

const INV = "qbo-inv-77";
const CONTACT = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const CONN = "33333333-3333-4333-8333-333333333333";
const ACCOUNT = "acc-1";

function form(fields: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    qboInvoiceId: INV,
    recipientContactId: CONTACT,
    subject: "Payment reminder",
    body: "Please pay.",
  };
  for (const [k, v] of Object.entries({ ...base, ...fields })) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.canSend.mockResolvedValue(true);
  h.getProfile.mockResolvedValue({ id: CONTACT, email: "ap@acme.com", phone: null });
  h.resolveActingUser.mockResolvedValue({ ok: true, id: USER, email: "me@imperionllc.com" });
  h.listUserConnections.mockResolvedValue([{ id: CONN, provider: "m365", status: "active" }]);
  h.executeAction.mockResolvedValue({ channel: "email", interactionId: "i1" });
  h.getCollectionsActivity.mockResolvedValue({ status: "reminded", escalationLevel: 1, notes: null });
  h.listInvoices.mockResolvedValue([{ qboInvoiceId: INV, accountId: ACCOUNT }]);
});

describe("sendDunningReminderAction (#679 — gated dunning send via ADR-0058)", () => {
  it("sends a REAL reminder as the acting user's M365 mailbox, then records overlay + timeline", async () => {
    await expect(sendDunningReminderAction(form())).rejects.toThrow(
      `NEXT_REDIRECT:/collections?invoice=${INV}&sent=email&mode=real`,
    );
    expect(h.executeAction).toHaveBeenCalledWith({
      action: {
        kind: "send_email",
        contactId: CONTACT,
        channel: "email",
        subject: "Payment reminder",
        body: "Please pay.",
      },
      approval: { approvedByUserId: USER, approved: true },
      to: "ap@acme.com",
      fromConnectionId: CONN,
    });
    // Overlay reminder appended (channel email), timeline entry on the resolved account.
    expect(h.upsertCollectionsActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        qboInvoiceId: INV,
        status: "reminded",
        appendReminder: expect.objectContaining({ channel: "email", kind: "standard" }),
      }),
    );
    expect(h.createInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: ACCOUNT,
        contactId: CONTACT,
        source: "email",
        direction: "outbound",
      }),
    );
  });

  it("bumps escalation and sets demand tone when 'escalate' is checked", async () => {
    await expect(sendDunningReminderAction(form({ escalate: "on" }))).rejects.toThrow(
      `NEXT_REDIRECT:/collections?invoice=${INV}&sent=email&mode=real`,
    );
    expect(h.upsertCollectionsActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "escalated",
        escalationLevel: 2, // current 1 → 2
        appendReminder: expect.objectContaining({ kind: "demand" }),
      }),
    );
  });

  it("refuses before any send when the consent pre-check fails", async () => {
    h.canSend.mockResolvedValue(false);
    await expect(sendDunningReminderAction(form())).rejects.toThrow(
      `NEXT_REDIRECT:/collections?invoice=${INV}&blocked=email`,
    );
    expect(h.executeAction).not.toHaveBeenCalled();
    expect(h.upsertCollectionsActivity).not.toHaveBeenCalled();
    expect(h.createInteraction).not.toHaveBeenCalled();
  });

  it("surfaces the backend consent gate's 403 as blocked — the authoritative refusal", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.executeAction.mockRejectedValue(new ServiceCallError("agent", 403, "consent_denied"));
    await expect(sendDunningReminderAction(form())).rejects.toThrow(
      `NEXT_REDIRECT:/collections?invoice=${INV}&blocked=email`,
    );
    expect(h.upsertCollectionsActivity).not.toHaveBeenCalled();
    expect(h.createInteraction).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("never fakes success: a failed REAL attempt → error notice, nothing recorded", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.executeAction.mockRejectedValue(new ServiceCallError("agent", 500, "boom"));
    await expect(sendDunningReminderAction(form())).rejects.toThrow(
      `NEXT_REDIRECT:/collections?invoice=${INV}&error=email`,
    );
    expect(h.upsertCollectionsActivity).not.toHaveBeenCalled();
    expect(h.createInteraction).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("degrades to the honest logged-stub when the send backend isn't configured", async () => {
    h.executeAction.mockRejectedValue(new ServiceNotConfiguredError("agent", "AGENT_SERVICE_URL"));
    await expect(sendDunningReminderAction(form())).rejects.toThrow(
      `NEXT_REDIRECT:/collections?invoice=${INV}&sent=email&mode=logged&reason=backend_unconfigured`,
    );
    // The reminder is still recorded (overlay + timeline) and honestly labeled.
    expect(h.upsertCollectionsActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        appendReminder: expect.objectContaining({
          channel: "email",
          note: expect.stringContaining("not sent"),
        }),
      }),
    );
    expect(h.createInteraction).toHaveBeenCalled();
  });

  it("degrades to the stub (reason no_connection) when the sender has no active M365 connection", async () => {
    h.listUserConnections.mockResolvedValue([{ id: "x", provider: "m365", status: "revoked" }]);
    await expect(sendDunningReminderAction(form())).rejects.toThrow(
      `NEXT_REDIRECT:/collections?invoice=${INV}&sent=email&mode=logged&reason=no_connection`,
    );
    expect(h.executeAction).not.toHaveBeenCalled();
    expect(h.upsertCollectionsActivity).toHaveBeenCalled();
  });

  it("degrades to the stub (reason no_address) when the recipient has no email", async () => {
    h.getProfile.mockResolvedValue({ id: CONTACT, email: null, phone: null });
    await expect(sendDunningReminderAction(form())).rejects.toThrow(
      `NEXT_REDIRECT:/collections?invoice=${INV}&sent=email&mode=logged&reason=no_address`,
    );
    expect(h.executeAction).not.toHaveBeenCalled();
    expect(h.upsertCollectionsActivity).toHaveBeenCalled();
  });

  it("is a no-op when required fields are missing (no guard bypass, no send)", async () => {
    await sendDunningReminderAction(form({ body: "" }));
    expect(h.requireCapability).toHaveBeenCalledWith("collections:write");
    expect(h.executeAction).not.toHaveBeenCalled();
    expect(h.upsertCollectionsActivity).not.toHaveBeenCalled();
    expect(h.createInteraction).not.toHaveBeenCalled();
  });
});
