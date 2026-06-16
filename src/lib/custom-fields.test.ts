import { describe, expect, it } from "vitest";
import {
  customFieldInputName,
  encodeCustomFieldFilter,
  formatCustomFieldValue,
  hasCustomFieldValue,
  isSelectType,
  parseCustomFieldFilter,
  parseCustomFieldFormValue,
} from "./custom-fields";
import type { CustomFieldType } from "@/types";
import type { Option } from "@/lib/data/repositories";

/**
 * Unit tests for the custom-field value helpers (ADR-0065 B4, #614) — the pure
 * display-format + form-parse layer the read/consume panel runs through. No I/O.
 */

const users: Option[] = [
  { id: "u-1", name: "Ada Lovelace" },
  { id: "u-2", name: "Alan Turing" },
];

/** A FormData-style accessor pair over a fixed record, for parse tests. */
function accessors(record: Record<string, string | string[]>) {
  const single = (n: string) => {
    const v = record[n];
    return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
  };
  const multi = (n: string) => {
    const v = record[n];
    return Array.isArray(v) ? v : v != null ? [v] : [];
  };
  return { single, multi };
}

describe("isSelectType", () => {
  it("is true only for the select types", () => {
    expect(isSelectType("single_select")).toBe(true);
    expect(isSelectType("multi_select")).toBe(true);
    expect(isSelectType("text")).toBe(false);
    expect(isSelectType("user")).toBe(false);
  });
});

describe("hasCustomFieldValue (required-field enforcement, B4-F3)", () => {
  it("treats null/empty-string/empty-array as unanswered", () => {
    expect(hasCustomFieldValue(null)).toBe(false);
    expect(hasCustomFieldValue("")).toBe(false);
    expect(hasCustomFieldValue("   ")).toBe(false);
    expect(hasCustomFieldValue([])).toBe(false);
  });
  it("treats 0 and false as ANSWERED (a real value)", () => {
    expect(hasCustomFieldValue(0)).toBe(true);
    expect(hasCustomFieldValue(false)).toBe(true);
    expect(hasCustomFieldValue("High")).toBe(true);
    expect(hasCustomFieldValue(["a"])).toBe(true);
  });
});

describe("formatCustomFieldValue", () => {
  it("renders an unanswered field as a dash (honest degradation, #614)", () => {
    expect(formatCustomFieldValue(null, "text")).toBe("—");
    expect(formatCustomFieldValue([], "multi_select")).toBe("—");
  });
  it("renders checkbox as Yes/No", () => {
    expect(formatCustomFieldValue(true, "checkbox")).toBe("Yes");
    expect(formatCustomFieldValue(false, "checkbox")).toBe("No");
  });
  it("joins a multi-select", () => {
    expect(formatCustomFieldValue(["Low", "High"], "multi_select")).toBe("Low, High");
  });
  it("resolves a user id to a name, falling back to the raw id when archived", () => {
    expect(formatCustomFieldValue("u-1", "user", users)).toBe("Ada Lovelace");
    expect(formatCustomFieldValue("u-gone", "user", users)).toBe("u-gone");
  });
  it("formats currency", () => {
    expect(formatCustomFieldValue(1500, "currency")).toBe("$1,500.00");
  });
});

describe("parseCustomFieldFormValue", () => {
  const parse = (type: CustomFieldType, record: Record<string, string | string[]>) => {
    const { single, multi } = accessors(record);
    return parseCustomFieldFormValue(type, single, multi, "cf");
  };

  it("text: trims, empty → null", () => {
    expect(parse("text", { cf: "  hi " })).toBe("hi");
    expect(parse("text", { cf: "   " })).toBeNull();
  });
  it("number/currency: parses or null on blank/garbage", () => {
    expect(parse("number", { cf: "42" })).toBe(42);
    expect(parse("currency", { cf: "1500.5" })).toBe(1500.5);
    expect(parse("number", { cf: "" })).toBeNull();
    expect(parse("number", { cf: "abc" })).toBeNull();
  });
  it("checkbox: 'on' → true, else false", () => {
    expect(parse("checkbox", { cf: "on" })).toBe(true);
    expect(parse("checkbox", {})).toBe(false);
  });
  it("multi_select: array, empty → null", () => {
    expect(parse("multi_select", { cf: ["Low", "High"] })).toEqual(["Low", "High"]);
    expect(parse("multi_select", { cf: [] })).toBeNull();
  });
  it("single_select / user: passes the chosen value through, blank → null", () => {
    expect(parse("single_select", { cf: "High" })).toBe("High");
    expect(parse("user", { cf: "u-1" })).toBe("u-1");
    expect(parse("single_select", { cf: "" })).toBeNull();
  });
});

describe("customFieldInputName", () => {
  it("derives a stable per-field input name", () => {
    expect(customFieldInputName("abc")).toBe("cf_abc");
  });
});

describe("custom-field URL filter token (B4-F2, #714)", () => {
  it("round-trips a key:value token", () => {
    const token = encodeCustomFieldFilter("risk_level", "High");
    expect(token).toBe("risk_level:High");
    expect(parseCustomFieldFilter(token)).toEqual({ key: "risk_level", value: "High" });
  });

  it("splits on the FIRST colon so values may contain colons", () => {
    expect(parseCustomFieldFilter("when:12:30")).toEqual({ key: "when", value: "12:30" });
  });

  it("returns null for empty / malformed / partial tokens", () => {
    expect(parseCustomFieldFilter(undefined)).toBeNull();
    expect(parseCustomFieldFilter("")).toBeNull();
    expect(parseCustomFieldFilter("nocolon")).toBeNull();
    expect(parseCustomFieldFilter(":High")).toBeNull(); // empty key
    expect(parseCustomFieldFilter("risk_level:")).toBeNull(); // empty value
  });
});
