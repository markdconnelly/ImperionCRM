import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the live agent-reply seam (#1130): surfacing the generalized
 * `proposedActions[]` envelope from the orchestrator and approving a single action by
 * forwarding its `input` VERBATIM to the backend's approval-gated executor. Boundaries
 * mocked; the real `toProposedActions` normalization + the call-guard seam run.
 */
const h = vi.hoisted(() => ({
  ask: vi.fn(),
  executeProposedAction: vi.fn(),
  resolveActingUser: vi.fn(),
}));

vi.mock("@/lib/services", () => ({
  agentService: { ask: h.ask, executeProposedAction: h.executeProposedAction },
}));
vi.mock("@/lib/services/acting-user", () => ({ resolveActingUser: h.resolveActingUser }));
vi.mock("@/lib/services/external-client", () => ({
  ServiceNotConfiguredError: class ServiceNotConfiguredError extends Error {
    constructor(name: string, envVar: string) {
      super(`${name} not configured (${envVar})`);
    }
  },
  ServiceCallError: class ServiceCallError extends Error {
    constructor(
      name: string,
      public status: number,
      detail: string,
    ) {
      super(`${name} returned ${status} ${detail}`);
    }
  },
}));

import { ServiceCallError, ServiceNotConfiguredError } from "@/lib/services/external-client";
import { approveProposedAction, askAgentAction } from "./ask-action";

const USER = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  h.resolveActingUser.mockResolvedValue({ ok: true, id: USER, email: "me@imperionllc.com" });
});

describe("askAgentAction — proposedActions[] surfacing", () => {
  it("passes the generalized envelope through verbatim", async () => {
    const proposedActions = [
      {
        kind: "update_ticket",
        input: { kind: "update_ticket", ticketId: "T-1", status: "in_progress" },
        tier: "T1" as const,
        dataClass: "operational",
        rationale: "Move to in-progress per the triage.",
      },
    ];
    h.ask.mockResolvedValue({ text: "Proposed an update.", routedTo: "felix", routingReason: "svc", proposedActions });

    const result = await askAgentAction("triage T-1");
    expect(result.text).toBe("Proposed an update.");
    expect(result.proposedActions).toEqual(proposedActions);
  });

  it("projects the legacy single comms projection into a one-element envelope (back-compat)", async () => {
    h.ask.mockResolvedValue({
      text: "Drafted a reply.",
      routedTo: "felix",
      routingReason: "svc",
      requiresApproval: true,
      proposedAction: { kind: "send_email", contactId: "c1", channel: "email", body: "Hi" },
    });

    const result = await askAgentAction("reply to c1");
    expect(result.proposedActions).toHaveLength(1);
    const [a] = result.proposedActions!;
    expect(a.kind).toBe("send_email");
    // `input` is the verbatim execute payload — no remapping.
    expect(a.input).toEqual({ kind: "send_email", contactId: "c1", channel: "email", body: "Hi" });
    expect(a.tier).toBe("T2");
    expect(a.dataClass).toBe("client_pii");
    expect(a.targetContactId).toBe("c1");
  });

  it("prefers proposedActions[] over the legacy projection when both are present", async () => {
    h.ask.mockResolvedValue({
      text: "x",
      routedTo: "felix",
      routingReason: "svc",
      proposedActions: [{ kind: "log_time", input: { kind: "log_time", hours: 1 }, tier: "T2", dataClass: "financial" }],
      proposedAction: { kind: "send_email", contactId: "c1", channel: "email", body: "Hi" },
    });
    const result = await askAgentAction("log time");
    expect(result.proposedActions).toHaveLength(1);
    expect(result.proposedActions![0].kind).toBe("log_time");
  });

  it("omits proposedActions when the reply carries none", async () => {
    h.ask.mockResolvedValue({ text: "Just info.", routedTo: "jarvis", routingReason: "chat" });
    const result = await askAgentAction("what's up");
    expect(result.proposedActions).toBeUndefined();
  });
});

describe("approveProposedAction — verbatim submit", () => {
  const ACTION = { kind: "send_email", contactId: "c1", channel: "email", body: "Hi" };

  it("submits the envelope input VERBATIM as `action`, recording the acting approver", async () => {
    h.executeProposedAction.mockResolvedValue({ channel: "email", interactionId: "i1" });
    const result = await approveProposedAction(ACTION);
    expect(result.ok).toBe(true);
    expect(h.executeProposedAction).toHaveBeenCalledWith({
      action: ACTION, // forwarded untouched — no field remapping
      approval: { approvedByUserId: USER, approved: true },
    });
  });

  it("works for a non-comms action payload unchanged", async () => {
    h.executeProposedAction.mockResolvedValue({});
    const ticket = { kind: "update_ticket", ticketId: "T-1", status: "resolved" };
    await approveProposedAction(ticket);
    expect(h.executeProposedAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: ticket }),
    );
  });

  it("surfaces the backend's 403 consent gate as a blocked notice", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.executeProposedAction.mockRejectedValue(new ServiceCallError("agent", 403, "consent_denied"));
    const result = await approveProposedAction(ACTION);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/consent/i);
    errorSpy.mockRestore();
  });

  it("degrades to a clear notice when the backend isn't configured", async () => {
    h.executeProposedAction.mockRejectedValue(
      new ServiceNotConfiguredError("agent", "AGENT_SERVICE_URL"),
    );
    const result = await approveProposedAction(ACTION);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/wired up|unset/i);
  });

  it("refuses when the acting user can't be resolved (no send recorded)", async () => {
    h.resolveActingUser.mockResolvedValue({ ok: false, reason: "no_session" });
    const result = await approveProposedAction(ACTION);
    expect(result.ok).toBe(false);
    expect(h.executeProposedAction).not.toHaveBeenCalled();
  });

  it("passes an UNREGISTERED action kind through to the backend (forward-verbatim, #994/#1130)", async () => {
    // The front end hasn't cataloged this kind; the backend is the authoritative dispatcher,
    // so the action is forwarded untouched rather than dropped.
    h.executeProposedAction.mockResolvedValue({});
    const action = { kind: "update_ticket", ticketId: "T-9", status: "resolved" };
    const result = await approveProposedAction(action);
    expect(result.ok).toBe(true);
    expect(h.executeProposedAction).toHaveBeenCalledWith(
      expect.objectContaining({ action }),
    );
  });

  it("refuses a registered action with an INVALID payload — never forwarded (#994)", async () => {
    // send_email without contactId/body fails the catalog schema.
    const result = await approveProposedAction({ kind: "send_email", channel: "email" });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/validation/i);
    expect(h.executeProposedAction).not.toHaveBeenCalled();
  });

  it("forwards a registered, valid action and still defers consent to the backend (#994)", async () => {
    // Catalog passes a well-formed send_email, but the backend's authoritative consent gate
    // refuses — proving the pre-flight tightens, never replaces, the consent re-check (ADR-0058).
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.executeProposedAction.mockRejectedValue(new ServiceCallError("agent", 403, "consent_denied"));
    const valid = { kind: "send_email", contactId: "c1", channel: "email", body: "Hi" };
    const result = await approveProposedAction(valid);
    expect(h.executeProposedAction).toHaveBeenCalledWith({
      action: valid,
      approval: { approvedByUserId: USER, approved: true },
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/consent/i);
    errorSpy.mockRestore();
  });
});
