import { describe, expect, test } from "vitest";
import {
  buildConnectionCards,
  groupConnectionCards,
} from "@/lib/integrations/connection-cards";
import { COMPANY_PROVIDERS } from "@/lib/integrations/company-providers";
import { buildConnectorCatalog } from "@/lib/integrations/connector-catalog";
import { listConnectorManifests } from "@/lib/integrations/connector-manifest";
import type { ConnectionRow } from "@/types";

const MANIFESTS = listConnectorManifests();
const ENTRIES = buildConnectorCatalog(MANIFESTS, []);

function conn(over: Partial<ConnectionRow> & { provider: string }): ConnectionRow {
  return {
    id: "c1",
    scope: "company",
    displayName: null,
    status: "active",
    scopes: [],
    owner: null,
    keyvaultSecretRef: null,
    lastSync: null,
    connectedAt: null,
    pollIntervalMinutes: 60,
    accountId: null,
    accountName: null,
    authMethod: null,
    certThumbprint: null,
    clientId: null,
    ...over,
  };
}

describe("buildConnectionCards", () => {
  test("unions providers and manifests with no duplicate connector keys", () => {
    const cards = buildConnectionCards(COMPANY_PROVIDERS, [], ENTRIES);
    const keys = cards.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length); // every connector appears exactly once

    const providerKeys = new Set(COMPANY_PROVIDERS.map((p) => p.key));
    const manifestKeys = new Set(MANIFESTS.map((m) => m.key));
    const union = new Set([...providerKeys, ...manifestKeys]);
    expect(new Set(keys)).toEqual(union);
  });

  test("an overlapping connector (autotask) carries BOTH the provider and the catalog half", () => {
    const cards = buildConnectionCards(COMPANY_PROVIDERS, [], ENTRIES);
    const autotask = cards.find((c) => c.key === "autotask")!;
    expect(autotask.provider).not.toBeNull();
    expect(autotask.entry).not.toBeNull();
    expect(autotask.clientScoped).toBe(true);
  });

  test("a company-credential-only connector (qbo) has a provider but no catalog entry", () => {
    const cards = buildConnectionCards(COMPANY_PROVIDERS, [], ENTRIES);
    const qbo = cards.find((c) => c.key === "qbo")!;
    expect(qbo.provider).not.toBeNull();
    expect(qbo.entry).toBeNull();
    expect(qbo.category).toBe("Finance"); // falls back to the provider's category
  });

  test("a catalog-only connector (m365) has a catalog entry but no provider", () => {
    const cards = buildConnectionCards(COMPANY_PROVIDERS, [], ENTRIES);
    const m365 = cards.find((c) => c.key === "m365")!;
    expect(m365.entry).not.toBeNull();
    expect(m365.provider).toBeNull();
    expect(m365.category).toBe("Productivity"); // from the manifest
  });

  test("planned manifests surface as planned, non-provider cards", () => {
    const cards = buildConnectionCards(COMPANY_PROVIDERS, [], ENTRIES);
    const datto = cards.find((c) => c.key === "dattoendpoint")!;
    expect(datto.planned).toBe(true);
    expect(datto.provider).toBeNull();
  });

  test("attaches the company connection row only to its provider card", () => {
    const cards = buildConnectionCards(
      COMPANY_PROVIDERS,
      [conn({ provider: "autotask", keyvaultSecretRef: "conn-company-autotask" })],
      ENTRIES,
    );
    expect(cards.find((c) => c.key === "autotask")!.connection?.keyvaultSecretRef).toBe(
      "conn-company-autotask",
    );
    expect(cards.find((c) => c.key === "itglue")!.connection).toBeNull();
    // A catalog-only connector never gets a connection row even if one somehow shares its key.
    const stray = buildConnectionCards(COMPANY_PROVIDERS, [conn({ provider: "m365" })], ENTRIES);
    expect(stray.find((c) => c.key === "m365")!.connection).toBeNull();
  });
});

describe("groupConnectionCards", () => {
  test("groups by category and orders known categories ahead of unknown", () => {
    const cards = buildConnectionCards(COMPANY_PROVIDERS, [], ENTRIES);
    const groups = groupConnectionCards(cards);
    // Every card is placed in exactly one group.
    expect(groups.flatMap((g) => g.cards)).toHaveLength(cards.length);
    // PSA (rank 0) leads; categories are unique.
    expect(groups[0].category).toBe("PSA");
    expect(new Set(groups.map((g) => g.category)).size).toBe(groups.length);
  });
});
