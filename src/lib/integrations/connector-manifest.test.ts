import { describe, expect, it } from "vitest";
import {
  CONNECTOR_MANIFESTS,
  listConnectorManifests,
  getConnectorManifest,
  isKnownConnector,
  effectiveCadenceMinutes,
} from "./connector-manifest";

/**
 * Tests for the in-code connector manifest registry (ADR-0076 §1/§2, #414). The
 * registry is the marketplace's source of truth; these guard its conformance (every
 * manifest is well-formed) and the pure helper API the catalog + instance layer use.
 */
describe("connector manifest registry — conformance", () => {
  it("exposes manifests with unique keys", () => {
    const keys = CONNECTOR_MANIFESTS.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every manifest declares the required marketplace shape (ADR-0076 §1)", () => {
    for (const m of CONNECTOR_MANIFESTS) {
      expect(m.key).toBeTruthy();
      expect(m.label).toBeTruthy();
      expect(["oauth", "jwt", "api_key"]).toContain(m.authType);
      expect(Array.isArray(m.scopes)).toBe(true);
      expect(m.defaultCadenceMinutes).toBeGreaterThanOrEqual(0); // 0 = on-demand (ADR-0038)
      expect(m.identityMap.length).toBeGreaterThan(0);
      expect(m.capabilities.length).toBeGreaterThan(0);
      expect(m.version).toBeGreaterThanOrEqual(1);
    }
  });

  it("capabilities are verb:noun shaped", () => {
    for (const m of CONNECTOR_MANIFESTS) {
      for (const cap of m.capabilities) {
        expect(cap).toMatch(/^[a-z]+:[a-z-]+$/);
      }
    }
  });
});

describe("connector manifest registry — helper API", () => {
  it("listConnectorManifests returns the full registry in order", () => {
    expect(listConnectorManifests()).toBe(CONNECTOR_MANIFESTS);
  });

  it("getConnectorManifest resolves a known key and rejects an unknown one", () => {
    expect(getConnectorManifest("autotask")?.label).toBe("Autotask (PSA)");
    expect(getConnectorManifest("nope")).toBeUndefined();
  });

  it("isKnownConnector gates registry membership", () => {
    expect(isKnownConnector("m365")).toBe(true);
    expect(isKnownConnector("not-a-connector")).toBe(false);
  });

  it("effectiveCadenceMinutes prefers the override, else the manifest default", () => {
    const autotaskDefault = getConnectorManifest("autotask")!.defaultCadenceMinutes;
    expect(effectiveCadenceMinutes("autotask", null)).toBe(autotaskDefault);
    expect(effectiveCadenceMinutes("autotask", 15)).toBe(15);
    // Unknown connector with no override → null (nothing to poll on).
    expect(effectiveCadenceMinutes("unknown", null)).toBeNull();
    // An explicit override stands even for an unknown connector key.
    expect(effectiveCadenceMinutes("unknown", 0)).toBe(0);
  });
});
