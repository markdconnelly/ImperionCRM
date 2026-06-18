import { describe, expect, it } from "vitest";
import {
  connectorFor,
  isRefreshable,
  allConnectorKeys,
  allConnectors,
} from "./connector-registry";
import { CONNECTOR_MANIFESTS } from "./connector-manifest";
import { COMPANY_PROVIDERS } from "./company-providers";
import { REFRESH_SOURCES } from "./pipeline-refresh";

describe("connectorFor — composes the three concern-modules by key", () => {
  it("autotask is present in all three facets", () => {
    const def = connectorFor("autotask");
    expect(def.manifest?.key).toBe("autotask");
    expect(def.provider?.key).toBe("autotask");
    expect(def.refresh).toBe("autotask");
  });

  it("m365 is catalog-only (no company-credential form, not directly refreshable)", () => {
    const def = connectorFor("m365");
    expect(def.manifest?.key).toBe("m365");
    expect(def.provider).toBeUndefined();
    expect(def.refresh).toBeUndefined(); // m365 refresh is triggered via the gdap provider
  });

  it("gdap is a consent provider whose refresh triggers the m365 source (no manifest)", () => {
    const def = connectorFor("gdap");
    expect(def.manifest).toBeUndefined();
    expect(def.provider?.kind).toBe("consent");
    expect(def.refresh).toBe("m365");
  });

  it("myitprocess is a credential provider with no catalog entry and no refresh", () => {
    const def = connectorFor("myitprocess");
    expect(def.manifest).toBeUndefined();
    expect(def.provider?.key).toBe("myitprocess");
    expect(def.refresh).toBeUndefined();
  });

  it("an unknown key composes to all-absent", () => {
    expect(connectorFor("nope")).toEqual({
      key: "nope",
      manifest: undefined,
      provider: undefined,
      refresh: undefined,
    });
  });
});

describe("scope concepts are intentionally distinct (not drift)", () => {
  it("autotask capability scopes (manifest) include write-back; credential-grant scopes (provider) are read-only", () => {
    const def = connectorFor("autotask");
    expect(def.manifest?.scopes).toContain("tickets:write"); // capability (ADR-0074)
    expect(def.provider?.scopes).not.toContain("tickets:write"); // credential-grant audit, read-only
  });
});

describe("allConnectorKeys / allConnectors", () => {
  it("is the de-duplicated union of all three modules' keys", () => {
    const keys = allConnectorKeys();
    expect(new Set(keys).size).toBe(keys.length); // no dupes
    for (const m of CONNECTOR_MANIFESTS) expect(keys).toContain(m.key);
    for (const p of COMPANY_PROVIDERS) expect(keys).toContain(p.key);
    for (const k of Object.keys(REFRESH_SOURCES)) expect(keys).toContain(k);
  });

  it("every refresh source key resolves to a known provider or manifest (no orphan refresh)", () => {
    // Drift guard: a refresh source wired with no provider/manifest behind it is a config bug.
    for (const key of Object.keys(REFRESH_SOURCES)) {
      const def = connectorFor(key);
      expect(def.provider ?? def.manifest, `refresh key '${key}' has no provider/manifest`).toBeTruthy();
    }
  });

  it("composes one definition per key", () => {
    expect(allConnectors().map((d) => d.key)).toEqual(allConnectorKeys());
  });

  it("isRefreshable agrees with the refresh facet", () => {
    expect(isRefreshable("autotask")).toBe(true);
    expect(isRefreshable("myitprocess")).toBe(false);
  });
});
