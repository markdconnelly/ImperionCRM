import { describe, expect, it } from "vitest";
import {
  checkbox,
  hasAnswerValue,
  indexedPairs,
  intOr,
  orNull,
  parseAnswer,
  str,
  strList,
  strOr,
  strOrNull,
} from "./form-data";
import type { QuestionRow } from "@/types";

function fd(entries: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
}

function q(responseType: QuestionRow["responseType"]): QuestionRow {
  return { id: "q1", responseType } as QuestionRow;
}

describe("scalar coercion", () => {
  it("str trims and defaults absent to empty", () => {
    expect(str(fd([["a", "  x  "]]), "a")).toBe("x");
    expect(str(fd([]), "missing")).toBe("");
  });

  it("orNull / strOrNull map empty + whitespace + absent to null", () => {
    expect(orNull(" x ")).toBe("x");
    expect(orNull("   ")).toBeNull();
    expect(orNull(null)).toBeNull();
    expect(strOrNull(fd([["a", ""]]), "a")).toBeNull();
    expect(strOrNull(fd([["a", "v"]]), "a")).toBe("v");
  });

  it("strOr falls back on empty and absent, not on real values", () => {
    expect(strOr(fd([]), "status", "draft")).toBe("draft");
    expect(strOr(fd([["status", "  "]]), "status", "draft")).toBe("draft");
    expect(strOr(fd([["status", "sent"]]), "status", "draft")).toBe("sent");
  });

  it("checkbox is true only for 'on'", () => {
    expect(checkbox(fd([["c", "on"]]), "c")).toBe(true);
    expect(checkbox(fd([["c", "true"]]), "c")).toBe(false);
    expect(checkbox(fd([]), "c")).toBe(false);
  });

  it("intOr parses and NaN-falls-back", () => {
    expect(intOr(fd([["n", "7"]]), "n", 0)).toBe(7);
    expect(intOr(fd([["n", "x"]]), "n", 3)).toBe(3);
    expect(intOr(fd([]), "n", 0)).toBe(0); // Number("") === 0
  });
});

describe("multi-value", () => {
  it("strList drops empty entries", () => {
    expect(strList(fd([["t", "a"], ["t", ""], ["t", "b"]]), "t")).toEqual(["a", "b"]);
    expect(strList(fd([]), "t")).toEqual([]);
  });

  it("indexedPairs keeps only complete rows within the budget", () => {
    const f = fd([
      ["k0", "industry"], ["v0", "msp"],
      ["k1", ""], ["v1", "orphan"],
      ["k2", "size"], ["v2", "50+"],
      ["k5", "beyond"], ["v5", "rows"],
    ]);
    expect(indexedPairs(f, "k", "v", 5)).toEqual([
      { key: "industry", value: "msp" },
      { key: "size", value: "50+" },
    ]);
  });
});

describe("engagement answers (the five response-type cases)", () => {
  it("routes number/currency to valueNumber", () => {
    expect(parseAnswer(q("number"), fd([["q_q1", "42"]])).valueNumber).toBe("42");
    expect(parseAnswer(q("currency"), fd([["q_q1", ""]])).valueNumber).toBeNull();
  });

  it("routes boolean with empty → null", () => {
    expect(parseAnswer(q("boolean"), fd([["q_q1", "true"]])).valueBool).toBe(true);
    expect(parseAnswer(q("boolean"), fd([["q_q1", "false"]])).valueBool).toBe(false);
    expect(parseAnswer(q("boolean"), fd([])).valueBool).toBeNull();
  });

  it("routes date to valueDate and multi_select to valueJson", () => {
    expect(parseAnswer(q("date"), fd([["q_q1", "2026-06-12"]])).valueDate).toBe("2026-06-12");
    const multi = parseAnswer(q("multi_select"), fd([["q_q1", "a"], ["q_q1", "b"]]));
    expect(multi.valueJson).toEqual(["a", "b"]);
    expect(parseAnswer(q("multi_select"), fd([])).valueJson).toBeNull();
  });

  it("defaults to valueText and carries the contact id", () => {
    const a = parseAnswer(q("text"), fd([["q_q1", "hello"]]), "c-9");
    expect(a.valueText).toBe("hello");
    expect(a.answeredByContactId).toBe("c-9");
  });

  it("hasAnswerValue drops empty answers", () => {
    expect(hasAnswerValue(parseAnswer(q("text"), fd([])))).toBe(false);
    expect(hasAnswerValue(parseAnswer(q("text"), fd([["q_q1", "x"]])))).toBe(true);
  });
});
