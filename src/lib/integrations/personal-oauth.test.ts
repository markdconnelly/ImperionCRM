/**
 * Unit tests for the per-user OAuth pure helpers (ADR-0024, backend ADR-0038).
 */
import { describe, expect, it } from "vitest";
import {
  CONNECT_RESULT_NOTICES,
  classifyOAuthCallback,
  isConnectResult,
  isPersonalOAuthProvider,
  PERSONAL_OAUTH_PROVIDERS,
  profileConnectionsPath,
  type ConnectResult,
} from "./personal-oauth";

describe("isPersonalOAuthProvider", () => {
  it("accepts every live OAuth provider", () => {
    for (const p of PERSONAL_OAUTH_PROVIDERS) expect(isPersonalOAuthProvider(p)).toBe(true);
  });

  it("rejects plaud (key-based, permanent 501 — stays on the stub)", () => {
    expect(isPersonalOAuthProvider("plaud")).toBe(false);
  });

  it("rejects company providers and junk", () => {
    for (const p of ["autotask", "itglue", "gdap", "", "M365", "google ", "../etc"]) {
      expect(isPersonalOAuthProvider(p)).toBe(false);
    }
  });
});

describe("classifyOAuthCallback", () => {
  const q = (s: string) => new URLSearchParams(s);

  it("forwards when both code and state are present", () => {
    expect(classifyOAuthCallback(q("code=abc&state=xyz"))).toEqual({
      kind: "forward",
      code: "abc",
      state: "xyz",
    });
  });

  it("treats a provider error as cancelled, even when code/state are also present", () => {
    expect(classifyOAuthCallback(q("error=access_denied"))).toEqual({ kind: "cancelled" });
    expect(classifyOAuthCallback(q("error=access_denied&code=a&state=b"))).toEqual({
      kind: "cancelled",
    });
  });

  it("rejects missing code or state", () => {
    expect(classifyOAuthCallback(q(""))).toEqual({ kind: "invalid" });
    expect(classifyOAuthCallback(q("code=abc"))).toEqual({ kind: "invalid" });
    expect(classifyOAuthCallback(q("state=xyz"))).toEqual({ kind: "invalid" });
    expect(classifyOAuthCallback(q("code=&state="))).toEqual({ kind: "invalid" });
  });
});

describe("profileConnectionsPath", () => {
  it("targets the profile page with the result flag", () => {
    expect(profileConnectionsPath("ok", "m365")).toBe("/profile?connect=ok&provider=m365");
  });

  it("omits the provider when not given", () => {
    expect(profileConnectionsPath("forbidden")).toBe("/profile?connect=forbidden");
  });

  it("URL-encodes hostile provider values (never trusts the query string)", () => {
    const path = profileConnectionsPath("error", "a&connect=ok");
    expect(path).toBe("/profile?connect=error&provider=a%26connect%3Dok");
  });
});

describe("connect result notices", () => {
  it("covers every result with a tone and a message", () => {
    const results: ConnectResult[] = [
      "ok",
      "stubbed",
      "cancelled",
      "invalid_state",
      "exchange_failed",
      "not_configured",
      "forbidden",
      "error",
    ];
    for (const r of results) {
      expect(isConnectResult(r)).toBe(true);
      const notice = CONNECT_RESULT_NOTICES[r];
      expect(["success", "warning", "error"]).toContain(notice.tone);
      expect(notice.message("Microsoft 365").length).toBeGreaterThan(0);
    }
  });

  it("rejects unknown flags from the URL", () => {
    expect(isConnectResult("nope")).toBe(false);
    expect(isConnectResult("")).toBe(false);
  });
});
