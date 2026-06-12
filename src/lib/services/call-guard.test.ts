import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The call-guard seam IS the test surface for every backend-calling action
 * (#190): one taxonomy, one user-message composition, one logging rule.
 * external-client is mocked the way every caller test mocks it.
 */
vi.mock("@/lib/services/external-client", () => {
  class ServiceNotConfiguredError extends Error {}
  class ServiceCallError extends Error {
    constructor(
      name: string,
      public status: number,
      body: string,
    ) {
      super(`${name} returned ${status}: ${body}`);
    }
  }
  return { ServiceNotConfiguredError, ServiceCallError };
});

import { ServiceCallError, ServiceNotConfiguredError } from "@/lib/services/external-client";
import {
  callServiceWithFallback,
  classifyServiceError,
  isBackendNotConfigured,
} from "./call-guard";

const MESSAGES = {
  label: "testAction",
  notConfigured: "Backend not wired up yet.",
  failed: "Something went wrong — try again.",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("classifyServiceError", () => {
  it("maps an unset base URL to not_configured", () => {
    expect(classifyServiceError(new ServiceNotConfiguredError("agent", "AGENT_SERVICE_URL"))).toBe(
      "not_configured",
    );
  });

  it("maps a clean backend 501 to not_configured — the 501 ambiguity, resolved once", () => {
    expect(classifyServiceError(new ServiceCallError("agent", 501, "not implemented"))).toBe(
      "not_configured",
    );
  });

  it("maps any other non-2xx to rejected", () => {
    for (const status of [400, 401, 403, 404, 409, 500, 503]) {
      expect(classifyServiceError(new ServiceCallError("agent", status, "nope"))).toBe("rejected");
    }
  });

  it("maps network/timeout/unknown errors to unreachable", () => {
    expect(classifyServiceError(new Error("fetch failed"))).toBe("unreachable");
    expect(classifyServiceError(new DOMException("aborted", "AbortError"))).toBe("unreachable");
    expect(classifyServiceError("string throw")).toBe("unreachable");
  });
});

describe("isBackendNotConfigured", () => {
  it("is true for the unset-env error and the 501, false otherwise", () => {
    expect(isBackendNotConfigured(new ServiceNotConfiguredError("a", "B"))).toBe(true);
    expect(isBackendNotConfigured(new ServiceCallError("a", 501, ""))).toBe(true);
    expect(isBackendNotConfigured(new ServiceCallError("a", 500, ""))).toBe(false);
    expect(isBackendNotConfigured(new Error("down"))).toBe(false);
  });
});

describe("callServiceWithFallback", () => {
  it("passes the value through on success", async () => {
    const outcome = await callServiceWithFallback(async () => ({ saved: true }), MESSAGES);
    expect(outcome).toEqual({ ok: true, value: { saved: true } });
  });

  it("returns the not-configured message WITHOUT logging (expected deployment state)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const outcome = await callServiceWithFallback(async () => {
      throw new ServiceNotConfiguredError("agent", "AGENT_SERVICE_URL");
    }, MESSAGES);
    expect(outcome).toEqual({
      ok: false,
      kind: "not_configured",
      message: MESSAGES.notConfigured,
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns the failed message and logs under the label for a backend rejection", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const outcome = await callServiceWithFallback(async () => {
      throw new ServiceCallError("agent", 500, "boom");
    }, MESSAGES);
    expect(outcome).toEqual({ ok: false, kind: "rejected", message: MESSAGES.failed });
    expect(errorSpy).toHaveBeenCalledWith("testAction failed:", expect.anything());
  });

  it("returns the failed message and logs for an unreachable backend", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const outcome = await callServiceWithFallback(async () => {
      throw new Error("fetch failed");
    }, MESSAGES);
    expect(outcome).toEqual({ ok: false, kind: "unreachable", message: MESSAGES.failed });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("never throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      callServiceWithFallback(async () => {
        throw "string throw";
      }, MESSAGES),
    ).resolves.toMatchObject({ ok: false, kind: "unreachable" });
  });
});
