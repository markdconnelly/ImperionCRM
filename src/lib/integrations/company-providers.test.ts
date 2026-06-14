import { describe, expect, it } from "vitest";
import { COMPANY_PROVIDERS, providerIsPollable } from "./company-providers";

describe("providerIsPollable", () => {
  // Poll cadence (ADR-0038 / pollDue()) is only meaningful for polled data
  // sources. #531: it must NOT render for consent/OAuth providers.
  it("credential providers are pollable", () => {
    expect(providerIsPollable({ kind: "credential" })).toBe(true);
  });

  it("consent providers are not pollable", () => {
    expect(providerIsPollable({ kind: "consent" })).toBe(false);
  });

  it("Autotask and IT Glue are pollable; QBO and GDAP are not", () => {
    const byKey = (key: string) => {
      const p = COMPANY_PROVIDERS.find((cp) => cp.key === key);
      if (!p) throw new Error(`missing provider ${key}`);
      return p;
    };
    expect(providerIsPollable(byKey("autotask"))).toBe(true);
    expect(providerIsPollable(byKey("itglue"))).toBe(true);
    expect(providerIsPollable(byKey("qbo"))).toBe(false);
    expect(providerIsPollable(byKey("gdap"))).toBe(false);
  });

  it("exactly the consent providers are excluded across the whole catalog", () => {
    for (const p of COMPANY_PROVIDERS) {
      expect(providerIsPollable(p)).toBe(p.kind === "credential");
    }
  });
});
