import { describe, expect, it } from "vitest";
import {
  type BitemporalValidity,
  ENTITY_RESOLVE_FN,
  ENTITY_TYPES,
  entityResolveArgs,
  isEntityType,
  isKnownSourceSystem,
  isLiveMapping,
  normalizeSourceIdentity,
  SOURCE_SYSTEMS,
} from "./entity-resolution";

describe("entity-resolution vocabularies", () => {
  it("entity_type vocabulary matches the 0160 CHECK constraint", () => {
    expect([...ENTITY_TYPES]).toEqual(["account", "contact", "device", "asset", "opportunity"]);
  });

  it("isEntityType narrows known kinds and rejects unknowns", () => {
    expect(isEntityType("account")).toBe(true);
    expect(isEntityType("opportunity")).toBe(true);
    expect(isEntityType("ticket")).toBe(false);
    expect(isEntityType("")).toBe(false);
  });

  it("known source systems include every client-mapping adapter source", () => {
    for (const s of ["autotask", "m365", "itglue", "pax8", "quotemanager", "unifi", "televy", "myitprocess"]) {
      expect(isKnownSourceSystem(s)).toBe(true);
    }
    expect(SOURCE_SYSTEMS).toContain("website");
    expect(isKnownSourceSystem("not-a-system")).toBe(false);
  });

  it("names the SQL forward-resolver function (migration 0190)", () => {
    expect(ENTITY_RESOLVE_FN).toBe("entity_resolve");
  });
});

describe("normalizeSourceIdentity", () => {
  it("trims and lower-cases source_system but preserves source_key case", () => {
    const n = normalizeSourceIdentity({
      entityType: "account",
      sourceSystem: "  AutoTask ",
      sourceKey: "  AbC123==  ",
    });
    expect(n).toEqual({ entityType: "account", sourceSystem: "autotask", sourceKey: "AbC123==" });
  });

  it("fails closed on an empty key (no blank-key spine row)", () => {
    expect(
      normalizeSourceIdentity({ entityType: "account", sourceSystem: "autotask", sourceKey: "   " }),
    ).toBeNull();
  });

  it("fails closed on an empty source_system", () => {
    expect(
      normalizeSourceIdentity({ entityType: "contact", sourceSystem: "  ", sourceKey: "x" }),
    ).toBeNull();
  });

  it("fails closed on an unknown entity_type", () => {
    expect(
      normalizeSourceIdentity({
        entityType: "ticket" as never,
        sourceSystem: "autotask",
        sourceKey: "x",
      }),
    ).toBeNull();
  });
});

describe("entityResolveArgs", () => {
  it("builds the positional ($1,$2,$3) tuple in resolver arg order", () => {
    expect(
      entityResolveArgs({ entityType: "account", sourceSystem: "M365", sourceKey: "guid-1" }),
    ).toEqual(["account", "m365", "guid-1"]);
  });

  it("returns null for an identity that can't be normalized (skips the round-trip)", () => {
    expect(
      entityResolveArgs({ entityType: "account", sourceSystem: "autotask", sourceKey: "" }),
    ).toBeNull();
  });
});

describe("isLiveMapping (bitemporal predicate, migration 0191)", () => {
  const at = new Date("2026-06-23T12:00:00Z");
  const open = (over: Partial<BitemporalValidity> = {}): BitemporalValidity => ({
    validFrom: new Date("2026-01-01T00:00:00Z"),
    validTo: null,
    systemFrom: new Date("2026-01-01T00:00:00Z"),
    systemTo: null,
    ...over,
  });

  it("an open-ended current-belief mapping is live", () => {
    expect(isLiveMapping(open(), at)).toBe(true);
  });

  it("a mapping closed in valid-time before `at` is not live (what was true then, not now)", () => {
    expect(isLiveMapping(open({ validTo: new Date("2026-03-01T00:00:00Z") }), at)).toBe(false);
  });

  it("a mapping whose valid-time has not started yet is not live", () => {
    expect(isLiveMapping(open({ validFrom: new Date("2026-12-01T00:00:00Z") }), at)).toBe(false);
  });

  it("valid_to is exclusive at the instant `at` (now() < COALESCE(valid_to,'infinity'))", () => {
    expect(isLiveMapping(open({ validTo: at }), at)).toBe(false);
  });

  it("a superseded belief (system_to set) is not live even when valid in the world", () => {
    expect(isLiveMapping(open({ systemTo: new Date("2026-05-01T00:00:00Z") }), at)).toBe(false);
  });

  it("defaults `at` to now and treats an open interval as currently live", () => {
    expect(isLiveMapping(open())).toBe(true);
  });
});
