import { describe, expect, it } from "vitest";
import { PLATFORM_PROVIDERS, platformSecretName } from "./platform-providers";

describe("PLATFORM_PROVIDERS (ADR-0129, #1400)", () => {
  it("declares Anthropic (Claude) and Voyage", () => {
    expect(PLATFORM_PROVIDERS.map((p) => p.key).sort()).toEqual(["anthropic", "voyage"]);
  });

  it("every provider collects exactly one key field via its fieldLabel", () => {
    for (const p of PLATFORM_PROVIDERS) {
      expect(p.fieldLabel.length).toBeGreaterThan(0);
      expect(p.help.length).toBeGreaterThan(0);
      expect(p.label.length).toBeGreaterThan(0);
    }
  });
});

describe("platformSecretName", () => {
  it("builds the canonical conn-platform-<provider> name (ADR-0129 #3)", () => {
    expect(platformSecretName("anthropic")).toBe("conn-platform-anthropic");
    expect(platformSecretName("voyage")).toBe("conn-platform-voyage");
  });

  it("matches the canonical secret-ref grammar (so vault-presence reads it as configured)", () => {
    // The platform scope must satisfy isCanonicalSecretRef (#1567) — proven indirectly here by
    // the conn-platform- prefix; the kv-secret-name regex was widened to admit `platform`.
    for (const p of PLATFORM_PROVIDERS) {
      expect(platformSecretName(p.key)).toMatch(/^conn-platform-[0-9a-z]+$/);
    }
  });
});
