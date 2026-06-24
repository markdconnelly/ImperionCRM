import { describe, expect, it } from "vitest";
import { getConnectorManifest, listConnectorManifests } from "./connector-manifest";
import { COMPANY_PROVIDERS } from "./company-providers";

// S4 of epic #1256 (ADR-0122): the catalog is the complete map of every expected source —
// unbuilt sources are Planned cards, and apollo gains a credential form.

const PLANNED_KEYS = ["dattoendpoint", "dattosaas", "cdw", "amazonbusiness", "easydmarc"];

describe("Planned connectors (ADR-0122 S4)", () => {
  it("every expected unbuilt source has a manifest flagged planned", () => {
    for (const key of PLANNED_KEYS) {
      const m = getConnectorManifest(key);
      expect(m, `manifest for ${key}`).toBeDefined();
      expect(m?.planned).toBe(true);
    }
  });

  it("live connectors are not marked planned", () => {
    for (const m of listConnectorManifests()) {
      if (PLANNED_KEYS.includes(m.key)) continue;
      expect(m.planned ?? false).toBe(false);
    }
  });

  it("Datto is two cards over one company key (endpoint + saas), Azure is not a card", () => {
    expect(getConnectorManifest("dattoendpoint")?.label).toMatch(/endpoint/i);
    expect(getConnectorManifest("dattosaas")?.label).toMatch(/saas/i);
    expect(getConnectorManifest("azure")).toBeUndefined();
  });
});

describe("Apollo credential form (ADR-0122 S4)", () => {
  it("apollo is a company provider with a single apiKey field", () => {
    const apollo = COMPANY_PROVIDERS.find((p) => p.key === "apollo");
    expect(apollo).toBeDefined();
    expect(apollo?.kind).toBe("credential");
    expect(apollo?.fields?.map((f) => f.name)).toEqual(["apiKey"]);
  });
});
