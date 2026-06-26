import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPIRY_WINDOW,
  EXPIRY_WINDOWS,
  parseExpiryWindow,
} from "./expiry-window";

describe("parseExpiryWindow", () => {
  it("accepts each supported window verbatim", () => {
    for (const w of EXPIRY_WINDOWS) {
      expect(parseExpiryWindow(String(w))).toBe(w);
    }
  });

  it("falls back to the default for unknown, empty, or junk values", () => {
    expect(parseExpiryWindow(undefined)).toBe(DEFAULT_EXPIRY_WINDOW);
    expect(parseExpiryWindow("")).toBe(DEFAULT_EXPIRY_WINDOW);
    expect(parseExpiryWindow("45")).toBe(DEFAULT_EXPIRY_WINDOW);
    expect(parseExpiryWindow("abc")).toBe(DEFAULT_EXPIRY_WINDOW);
    // An out-of-set numeric (e.g. an attacker probing 9999) is NOT honored.
    expect(parseExpiryWindow("9999")).toBe(DEFAULT_EXPIRY_WINDOW);
  });

  it("reads the first entry of a repeated query param", () => {
    expect(parseExpiryWindow(["30", "90"])).toBe(30);
    expect(parseExpiryWindow(["bad", "60"])).toBe(DEFAULT_EXPIRY_WINDOW);
  });

  it("keeps the default inside the supported set (guards a config typo)", () => {
    expect((EXPIRY_WINDOWS as readonly number[]).includes(DEFAULT_EXPIRY_WINDOW)).toBe(true);
  });
});
