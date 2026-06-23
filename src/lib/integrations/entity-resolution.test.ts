import { describe, expect, it } from "vitest";
import {
  ENTITY_RESOLVE_FN,
  ENTITY_TYPES,
  entityResolveArgs,
  isEntityType,
  isKnownSourceSystem,
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

  it("names the SQL forward-resolver function (migration 0188)", () => {
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
