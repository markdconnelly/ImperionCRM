import { describe, expect, it } from "vitest";
import {
  CLIENT_MAPPING_ADAPTERS,
  getClientMappingAdapter,
  selectRegisteredClientCredentials,
  suggestAccountForUnit,
} from "./client-mapping";

function conn(over: Partial<Parameters<typeof selectRegisteredClientCredentials>[0][number]>) {
  return {
    scope: "client",
    provider: "m365",
    accountId: "acc-1",
    accountName: "IPG",
    displayName: "IPG-M365",
    status: "active",
    ...over,
  };
}

describe("getClientMappingAdapter", () => {
  it("resolves the Autotask tracer adapter (fan-out, no connection binding)", () => {
    const a = getClientMappingAdapter("autotask");
    expect(a).toMatchObject({ sourceSystem: "autotask", label: "Autotask", bindsConnection: false });
  });

  it("resolves the M365 adapter (per-client credential → binds connection)", () => {
    const a = getClientMappingAdapter("m365");
    expect(a).toMatchObject({
      sourceSystem: "m365",
      label: "Microsoft 365",
      unitNoun: "tenant",
      bindsConnection: true,
    });
  });

  it("registers every remaining per-client connector (F #1144)", () => {
    for (const key of ["itglue", "pax8", "quotemanager", "televy", "myitprocess", "unifi"]) {
      const a = getClientMappingAdapter(key);
      expect(a, key).not.toBeNull();
      expect(a?.sourceSystem).toBe(key);
    }
  });

  it("only M365 binds a per-client credential; the rest (incl. UniFi, now company-cred) do not (#1278)", () => {
    expect(getClientMappingAdapter("m365")?.bindsConnection).toBe(true);
    // UniFi moved to a COMPANY credential (one MSP Site Manager key) → mapping-only, no bind.
    for (const key of ["itglue", "pax8", "quotemanager", "televy", "myitprocess", "unifi"]) {
      expect(getClientMappingAdapter(key)?.bindsConnection, key).toBe(false);
    }
  });

  it("does NOT register darkwebid — domains are a separate account_domain surface (ADR-0112)", () => {
    expect(getClientMappingAdapter("darkwebid")).toBeNull();
  });

  it("returns null for an unmappable / unknown connector", () => {
    expect(getClientMappingAdapter("qbo")).toBeNull();
    expect(getClientMappingAdapter("nope")).toBeNull();
  });

  it("keys every adapter by its own connector name", () => {
    for (const [key, adapter] of Object.entries(CLIENT_MAPPING_ADAPTERS)) {
      expect(adapter.connector).toBe(key);
    }
  });
});

describe("selectRegisteredClientCredentials", () => {
  it("surfaces a client credential for the connector (the IPG-before-discovery case, #1271)", () => {
    const rows = selectRegisteredClientCredentials([conn({})], "m365");
    expect(rows).toEqual([
      { accountId: "acc-1", accountName: "IPG", displayName: "IPG-M365", status: "active" },
    ]);
  });

  it("filters by connector and to client scope only", () => {
    const rows = selectRegisteredClientCredentials(
      [
        conn({ provider: "m365", accountName: "IPG" }),
        conn({ provider: "unifi", accountName: "Other" }),
        conn({ scope: "company", accountName: "CompanyWide" }),
      ],
      "m365",
    );
    expect(rows.map((r) => r.accountName)).toEqual(["IPG"]);
  });

  it("skips rows with no owning account (can't show against an account)", () => {
    expect(selectRegisteredClientCredentials([conn({ accountId: null })], "m365")).toEqual([]);
  });

  it("falls back to the display name when the account name is absent, sorted by name", () => {
    const rows = selectRegisteredClientCredentials(
      [
        conn({ accountId: "a2", accountName: null, displayName: "Zeta-M365" }),
        conn({ accountId: "a1", accountName: "Alpha", displayName: null }),
      ],
      "m365",
    );
    expect(rows.map((r) => r.accountName)).toEqual(["Alpha", "Zeta-M365"]);
  });
});

describe("suggestAccountForUnit", () => {
  const accounts = [
    { id: "a1", name: "Acme Corp" },
    { id: "a2", name: "Globex" },
  ];

  it("suggests the account whose name matches case-insensitively", () => {
    expect(suggestAccountForUnit("  acme corp ", accounts)).toEqual({ id: "a1", name: "Acme Corp" });
  });

  it("returns null when nothing matches exactly (fuzzy is the resolver's job)", () => {
    expect(suggestAccountForUnit("Acme", accounts)).toBeNull();
    expect(suggestAccountForUnit("", accounts)).toBeNull();
  });
});
