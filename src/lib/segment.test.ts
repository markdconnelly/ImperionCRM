import { describe, it, expect } from "vitest";
import {
  EMPTY_SEGMENT_RULE,
  contactMatchesRule,
  parseSegmentRule,
  previewRuleMembers,
  serializeSegmentRule,
  type SegmentRule,
} from "./segment";
import type { ContactRow } from "@/types";

function contact(partial: Partial<ContactRow> & { id: string }): ContactRow {
  return {
    fullName: "Test Contact",
    email: null,
    phone: null,
    account: null,
    ...partial,
  };
}

describe("parseSegmentRule", () => {
  it("returns the empty rule for non-object / malformed input", () => {
    expect(parseSegmentRule(null)).toEqual(EMPTY_SEGMENT_RULE);
    expect(parseSegmentRule("nope")).toEqual(EMPTY_SEGMENT_RULE);
    expect(parseSegmentRule([])).toEqual(EMPTY_SEGMENT_RULE);
  });

  it("defaults match to 'all' and coerces 'any'", () => {
    expect(parseSegmentRule({ clauses: [] }).match).toBe("all");
    expect(parseSegmentRule({ match: "any", clauses: [] }).match).toBe("any");
    expect(parseSegmentRule({ match: "garbage", clauses: [] }).match).toBe("all");
  });

  it("drops clauses with an unknown field or operator", () => {
    const rule = parseSegmentRule({
      match: "all",
      clauses: [
        { field: "email", operator: "contains", value: "x" },
        { field: "ssn", operator: "contains", value: "y" }, // unknown field
        { field: "email", operator: "regex", value: "z" }, // unknown operator
      ],
    });
    expect(rule.clauses).toHaveLength(1);
    expect(rule.clauses[0]).toEqual({ field: "email", operator: "contains", value: "x" });
  });

  it("round-trips through serializeSegmentRule", () => {
    const rule: SegmentRule = {
      match: "any",
      clauses: [{ field: "account", operator: "equals", value: "Acme" }],
    };
    expect(parseSegmentRule(serializeSegmentRule(rule))).toEqual(rule);
  });
});

describe("contactMatchesRule", () => {
  it("an empty clause list matches nothing (never 'everyone')", () => {
    expect(contactMatchesRule(EMPTY_SEGMENT_RULE, contact({ id: "1" }))).toBe(false);
  });

  it("'all' requires every clause; 'any' requires one", () => {
    const c = contact({ id: "1", email: "a@acme.com", account: "Acme" });
    const all: SegmentRule = {
      match: "all",
      clauses: [
        { field: "email", operator: "contains", value: "acme" },
        { field: "account", operator: "equals", value: "acme" },
      ],
    };
    expect(contactMatchesRule(all, c)).toBe(true);
    const allFail: SegmentRule = {
      match: "all",
      clauses: [
        { field: "email", operator: "contains", value: "acme" },
        { field: "account", operator: "equals", value: "other" },
      ],
    };
    expect(contactMatchesRule(allFail, c)).toBe(false);
    const any: SegmentRule = {
      match: "any",
      clauses: [
        { field: "email", operator: "contains", value: "nomatch" },
        { field: "account", operator: "equals", value: "acme" },
      ],
    };
    expect(contactMatchesRule(any, c)).toBe(true);
  });

  it("operators: equals, starts_with, contains, is_set", () => {
    const c = contact({ id: "1", email: "jane@acme.com" });
    expect(
      contactMatchesRule({ match: "all", clauses: [{ field: "email", operator: "equals", value: "JANE@ACME.COM" }] }, c),
    ).toBe(true);
    expect(
      contactMatchesRule({ match: "all", clauses: [{ field: "email", operator: "starts_with", value: "jane" }] }, c),
    ).toBe(true);
    expect(
      contactMatchesRule({ match: "all", clauses: [{ field: "phone", operator: "is_set", value: "" }] }, c),
    ).toBe(false);
    expect(
      contactMatchesRule({ match: "all", clauses: [{ field: "email", operator: "is_set", value: "" }] }, c),
    ).toBe(true);
  });
});

describe("previewRuleMembers", () => {
  it("returns only the matching contacts", () => {
    const contacts = [
      contact({ id: "1", account: "Acme" }),
      contact({ id: "2", account: "Globex" }),
      contact({ id: "3", account: "Acme" }),
    ];
    const rule: SegmentRule = {
      match: "all",
      clauses: [{ field: "account", operator: "equals", value: "Acme" }],
    };
    expect(previewRuleMembers(rule, contacts).map((c) => c.id)).toEqual(["1", "3"]);
  });
});
