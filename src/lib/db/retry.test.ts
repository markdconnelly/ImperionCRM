import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Pool } from "pg";
import { isRetryableConnectionError, withQueryRetry } from "./retry";

describe("isRetryableConnectionError", () => {
  it("is true for Postgres connection-class SQLSTATEs", () => {
    expect(isRetryableConnectionError({ code: "08006" })).toBe(true);
    expect(isRetryableConnectionError({ code: "57P01" })).toBe(true);
  });

  it("is true for Node socket errnos and pg pool messages", () => {
    expect(isRetryableConnectionError({ code: "ECONNRESET" })).toBe(true);
    expect(isRetryableConnectionError(new Error("Connection terminated unexpectedly"))).toBe(true);
    expect(
      isRetryableConnectionError(new Error("timeout exceeded when trying to connect")),
    ).toBe(true);
  });

  it("is false for real query faults (constraint / permission / undefined table)", () => {
    expect(isRetryableConnectionError({ code: "23505" })).toBe(false); // unique_violation
    expect(isRetryableConnectionError({ code: "42501" })).toBe(false); // insufficient_privilege
    expect(isRetryableConnectionError({ code: "42P01" })).toBe(false); // undefined_table
    expect(isRetryableConnectionError(null)).toBe(false);
    expect(isRetryableConnectionError("nope")).toBe(false);
  });
});

describe("withQueryRetry", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  function fakePool(query: ReturnType<typeof vi.fn>): Pool {
    return { query } as unknown as Pool;
  }

  it("passes results straight through when the query succeeds", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ ok: 1 }] });
    const p = withQueryRetry(fakePool(query));
    await expect(p.query("SELECT 1")).resolves.toEqual({ rows: [{ ok: 1 }] });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("retries ONCE on a transient connection error, then succeeds", async () => {
    const query = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("Connection terminated"), { code: "08006" }))
      .mockResolvedValueOnce({ rows: [{ ok: 1 }] });
    const p = withQueryRetry(fakePool(query));
    await expect(p.query("SELECT 1", [42])).resolves.toEqual({ rows: [{ ok: 1 }] });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenLastCalledWith("SELECT 1", [42]); // args preserved on retry
  });

  it("does NOT retry a real query fault — logs and rethrows", async () => {
    const fault = Object.assign(new Error("permission denied"), { code: "42501" });
    const query = vi.fn().mockRejectedValue(fault);
    const p = withQueryRetry(fakePool(query));
    await expect(p.query("SELECT 1")).rejects.toThrow("permission denied");
    expect(query).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalled(); // underlying error is no longer swallowed
  });

  it("retries only once — a second connection error propagates", async () => {
    const err = Object.assign(new Error("Connection terminated"), { code: "08006" });
    const query = vi.fn().mockRejectedValue(err);
    const p = withQueryRetry(fakePool(query));
    await expect(p.query("SELECT 1")).rejects.toThrow("Connection terminated");
    expect(query).toHaveBeenCalledTimes(2);
  });
});
