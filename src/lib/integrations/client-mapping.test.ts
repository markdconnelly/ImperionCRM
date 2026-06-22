import { describe, expect, it } from "vitest";
import {
  CLIENT_MAPPING_ADAPTERS,
  getClientMappingAdapter,
  suggestAccountForUnit,
} from "./client-mapping";

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

  it("UniFi is a per-client credential (binds connection); the fan-out sources do not", () => {
    expect(getClientMappingAdapter("unifi")?.bindsConnection).toBe(true);
    for (const key of ["itglue", "pax8", "quotemanager", "televy", "myitprocess"]) {
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
