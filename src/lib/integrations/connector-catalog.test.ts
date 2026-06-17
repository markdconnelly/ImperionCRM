import { describe, expect, test } from "vitest";
import {
  buildConnectorCatalog,
  groupCatalogByCategory,
  cadenceLabel,
  STATUS_LABEL,
  STATUS_TONE,
  GLOBAL_SCOPE,
} from "@/lib/integrations/connector-catalog";
import { listConnectorManifests } from "@/lib/integrations/connector-manifest";
import type { ConnectorInstance } from "@/types";

function instance(over: Partial<ConnectorInstance>): ConnectorInstance {
  return {
    id: "i1",
    connectorKey: "m365",
    accountScope: GLOBAL_SCOPE,
    status: "connected",
    grantedScopes: [],
    cadenceOverrideMinutes: null,
    lastSyncAt: null,
    health: {},
    ...over,
  };
}

const MANIFESTS = listConnectorManifests();

describe("buildConnectorCatalog", () => {
  test("one entry per manifest, in registry order, all available with no instances", () => {
    const entries = buildConnectorCatalog(MANIFESTS, []);
    expect(entries).toHaveLength(MANIFESTS.length);
    expect(entries.map((e) => e.manifest.key)).toEqual(MANIFESTS.map((m) => m.key));
    for (const e of entries) {
      expect(e.instance).toBeNull();
      expect(e.status).toBe("available");
      expect(e.connected).toBe(false);
    }
  });

  test("joins the matching instance and marks it connected", () => {
    const entries = buildConnectorCatalog(MANIFESTS, [
      instance({ connectorKey: "m365", status: "polling" }),
    ]);
    const m365 = entries.find((e) => e.manifest.key === "m365")!;
    expect(m365.status).toBe("polling");
    expect(m365.connected).toBe(true);
    expect(m365.instance?.id).toBe("i1");
    // every other connector stays available
    expect(entries.filter((e) => e.connected)).toHaveLength(1);
  });

  test("an 'available'-status instance is NOT counted as connected", () => {
    const entries = buildConnectorCatalog(MANIFESTS, [
      instance({ connectorKey: "m365", status: "available" }),
    ]);
    const m365 = entries.find((e) => e.manifest.key === "m365")!;
    expect(m365.connected).toBe(false);
  });

  test("ignores instances from other account scopes", () => {
    const entries = buildConnectorCatalog(MANIFESTS, [
      instance({ connectorKey: "m365", accountScope: "acme", status: "polling" }),
    ]);
    const m365 = entries.find((e) => e.manifest.key === "m365")!;
    expect(m365.connected).toBe(false);
    expect(m365.instance).toBeNull();
  });

  test("effective cadence uses the instance override, else the manifest default", () => {
    const entries = buildConnectorCatalog(MANIFESTS, [
      instance({ connectorKey: "m365", cadenceOverrideMinutes: 15 }),
    ]);
    const m365 = entries.find((e) => e.manifest.key === "m365")!;
    expect(m365.effectiveCadenceMinutes).toBe(15);
    // autotask has no instance → manifest default (60)
    const autotask = entries.find((e) => e.manifest.key === "autotask")!;
    expect(autotask.effectiveCadenceMinutes).toBe(60);
  });
});

describe("groupCatalogByCategory", () => {
  test("groups entries under their manifest category, covering all entries", () => {
    const entries = buildConnectorCatalog(MANIFESTS, []);
    const groups = groupCatalogByCategory(entries);
    const total = groups.reduce((n, g) => n + g.entries.length, 0);
    expect(total).toBe(entries.length);
    // categories are unique
    const cats = groups.map((g) => g.category);
    expect(new Set(cats).size).toBe(cats.length);
  });
});

describe("display helpers", () => {
  test("every status has a label and a tone", () => {
    for (const s of ["available", "connecting", "connected", "first_sync", "polling", "error"] as const) {
      expect(STATUS_LABEL[s]).toBeTruthy();
      expect(STATUS_TONE[s]).toBeTruthy();
    }
  });

  test("cadenceLabel renders minutes/hours/days, on-demand and unknown", () => {
    expect(cadenceLabel(null)).toBe("—");
    expect(cadenceLabel(0)).toBe("On demand");
    expect(cadenceLabel(30)).toBe("Every 30 min");
    expect(cadenceLabel(60)).toBe("Hourly");
    expect(cadenceLabel(120)).toBe("Every 2 hours");
    expect(cadenceLabel(1440)).toBe("Daily");
    expect(cadenceLabel(2880)).toBe("Every 2 days");
  });
});
