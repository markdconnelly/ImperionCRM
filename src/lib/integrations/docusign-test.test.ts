import { describe, expect, it } from "vitest";
import { docusignTestResult } from "./docusign-test";

describe("docusignTestResult", () => {
  it("200 + consentGranted → ready, green", () => {
    const r = docusignTestResult({
      ok: true,
      body: { configured: true, consentGranted: true, environment: "demo" },
    });
    expect(r.state).toBe("consent_granted");
    expect(r.ready).toBe(true);
    expect(r.tone).toBe("green");
    expect(r.environment).toBe("demo");
    expect(r.detail).toContain("demo");
    expect(r.consentUrl).toBeNull();
  });

  it("200 + consent pending → not ready, amber, carries consentUrl", () => {
    const r = docusignTestResult({
      ok: true,
      body: {
        configured: true,
        consentGranted: false,
        environment: "demo",
        consentUrl: "https://account-d.docusign.com/oauth/auth?x=1",
      },
    });
    expect(r.state).toBe("consent_required");
    expect(r.ready).toBe(false);
    expect(r.tone).toBe("amber");
    expect(r.consentUrl).toBe("https://account-d.docusign.com/oauth/auth?x=1");
  });

  it("not_configured (501 / env unset) → dim, never ready", () => {
    const r = docusignTestResult({ ok: false, kind: "not_configured" });
    expect(r.state).toBe("not_configured");
    expect(r.ready).toBe(false);
    expect(r.tone).toBe("dim");
    expect(r.environment).toBeNull();
  });

  it("502 → token mint failed, red", () => {
    const r = docusignTestResult({ ok: false, kind: "rejected", status: 502 });
    expect(r.state).toBe("mint_failed");
    expect(r.tone).toBe("red");
    expect(r.detail).toContain("502");
  });

  it("401/403 → rejected, red, shows allowlist guidance", () => {
    const r = docusignTestResult({ ok: false, kind: "rejected", status: 403 });
    expect(r.state).toBe("rejected");
    expect(r.tone).toBe("red");
    expect(r.detail).toContain("403");
    expect(r.detail).toContain("allow-listed");
  });

  it("5xx → rejected, red, shows backend error guidance", () => {
    const r = docusignTestResult({ ok: false, kind: "rejected", status: 500 });
    expect(r.state).toBe("rejected");
    expect(r.tone).toBe("red");
    expect(r.label).toBe("Backend errored");
    expect(r.detail).toContain("500");
    expect(r.detail).toContain("Key Vault");
  });

  it("other 4xx (non-401/403) → rejected, red, shows status", () => {
    const r = docusignTestResult({ ok: false, kind: "rejected", status: 400 });
    expect(r.state).toBe("rejected");
    expect(r.tone).toBe("red");
    expect(r.detail).toContain("400");
    expect(r.detail).not.toContain("allow-listed");
  });

  it("rejection without a status still renders", () => {
    const r = docusignTestResult({ ok: false, kind: "rejected" });
    expect(r.state).toBe("rejected");
    expect(r.detail).not.toContain("HTTP");
  });

  it("unreachable → red, never ready", () => {
    const r = docusignTestResult({ ok: false, kind: "unreachable" });
    expect(r.state).toBe("unreachable");
    expect(r.ready).toBe(false);
    expect(r.tone).toBe("red");
  });

  it("no probe path leaks a ready:true except a minted token", () => {
    const notReady = [
      docusignTestResult({ ok: true, body: { consentGranted: false } }),
      docusignTestResult({ ok: false, kind: "not_configured" }),
      docusignTestResult({ ok: false, kind: "rejected", status: 502 }),
      docusignTestResult({ ok: false, kind: "rejected", status: 401 }),
      docusignTestResult({ ok: false, kind: "rejected", status: 500 }),
      docusignTestResult({ ok: false, kind: "unreachable" }),
    ];
    expect(notReady.every((r) => r.ready === false)).toBe(true);
  });
});
