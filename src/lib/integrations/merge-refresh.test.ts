import { beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("@/lib/services", () => ({ pipelineService: { refresh } }));
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

import { requestMergeRefresh } from "./merge-refresh";

describe("requestMergeRefresh", () => {
  beforeEach(() => {
    refresh.mockReset();
  });

  it("asks the pipeline for a merge refresh", () => {
    refresh.mockResolvedValue({ source: "merge", ran: true });
    requestMergeRefresh();
    expect(refresh).toHaveBeenCalledWith({ source: "merge" });
  });

  it("returns without waiting — a hanging pipeline call cannot block the caller", () => {
    refresh.mockReturnValue(new Promise(() => {})); // never settles
    requestMergeRefresh(); // synchronous return IS the assertion
    expect(refresh).toHaveBeenCalledWith({ source: "merge" });
  });

  it("swallows a failing pipeline call (logged, never thrown)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    refresh.mockRejectedValue(new Error("pipeline down"));
    expect(() => requestMergeRefresh()).not.toThrow();
    await new Promise((r) => setTimeout(r, 0)); // let the rejection reach the catch
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
