import { beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("@/lib/services", () => ({ pipelineService: { refresh } }));
vi.mock("@/lib/services/external-client", () => ({
  ServiceNotConfiguredError: class ServiceNotConfiguredError extends Error {},
}));

import { requestMergeRefresh } from "./merge-refresh";

describe("requestMergeRefresh", () => {
  beforeEach(() => {
    refresh.mockReset();
  });

  it("asks the pipeline for a merge refresh", async () => {
    refresh.mockResolvedValue({ source: "merge", ran: true });
    await requestMergeRefresh();
    expect(refresh).toHaveBeenCalledWith({ source: "merge" });
  });

  it("resolves after the bounded wait when the pipeline call hangs", async () => {
    refresh.mockReturnValue(new Promise(() => {})); // never settles
    await expect(requestMergeRefresh(25)).resolves.toBeUndefined();
  });

  it("resolves even when the pipeline call fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    refresh.mockRejectedValue(new Error("pipeline down"));
    await expect(requestMergeRefresh()).resolves.toBeUndefined();
    errorSpy.mockRestore();
  });
});
