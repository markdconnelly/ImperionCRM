import { describe, expect, test } from "vitest";
import {
  CI_TYPES,
  CI_TYPE_LABEL,
  asCiType,
  ciKey,
  isClientCi,
  toConfigurationItems,
  filterConfigurationItems,
} from "@/lib/cmdb/ci";
import { mockRepositories } from "@/lib/data/mock/mock-repositories";
import type { ConfigurationItem } from "@/types";

const account = (over: Partial<ConfigurationItem> = {}): ConfigurationItem => ({
  ciType: "account",
  ciId: "a1",
  accountId: "a1",
  accountName: "Northwind",
  displayName: "Northwind",
  attributes: [],
  ...over,
});

describe("CI taxonomy", () => {
  test("v1 CI types are account, user, device", () => {
    expect([...CI_TYPES]).toEqual(["account", "user", "device"]);
    expect(CI_TYPE_LABEL.user).toBe("End-user");
  });

  test("asCiType narrows known types and rejects junk", () => {
    expect(asCiType("device")).toBe("device");
    expect(asCiType("staff")).toBeNull();
    expect(asCiType(undefined)).toBeNull();
  });

  test("ciKey disambiguates across the union (id unique only within a type)", () => {
    expect(ciKey({ ciType: "account", ciId: "x" })).toBe("account:x");
    expect(ciKey({ ciType: "device", ciId: "x" })).toBe("device:x");
    expect(ciKey({ ciType: "account", ciId: "x" })).not.toBe(
      ciKey({ ciType: "device", ciId: "x" }),
    );
  });
});

describe("staff / internal exclusion (acceptance criterion)", () => {
  test("isClientCi requires an owning account id", () => {
    expect(isClientCi({ accountId: "a1" })).toBe(true);
    expect(isClientCi({ accountId: null })).toBe(false);
    expect(isClientCi({ accountId: "" })).toBe(false);
    expect(isClientCi({ accountId: undefined })).toBe(false);
  });

  test("toConfigurationItems drops account-less rows and stamps the account id", () => {
    const out = toConfigurationItems([
      { ciType: "user", ciId: "u1", accountId: "a1", accountName: "N", displayName: "Dana", attributes: [] },
      // account-less row → an Imperion staff / unlinked identity → EXCLUDED
      { ciType: "user", ciId: "u2", accountId: null, accountName: null, displayName: "Staffer", attributes: [] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ ciId: "u1", accountId: "a1" });
  });
});

describe("filterConfigurationItems", () => {
  const items = [
    account({ ciId: "a1", accountId: "a1", accountName: "Alpha" }),
    account({ ciType: "user", ciId: "u1", accountId: "a1", accountName: "Alpha", displayName: "Dana" }),
    account({ ciType: "device", ciId: "d1", accountId: "a2", accountName: "Beta", displayName: "LT-01" }),
  ];

  test("no filters returns everything", () => {
    expect(filterConfigurationItems(items, {})).toHaveLength(3);
  });
  test("filters by CI type", () => {
    expect(filterConfigurationItems(items, { ciType: "user" }).map((i) => i.ciId)).toEqual(["u1"]);
  });
  test("filters by account", () => {
    expect(filterConfigurationItems(items, { accountId: "a2" }).map((i) => i.ciId)).toEqual(["d1"]);
  });
  test("combines both filters", () => {
    expect(filterConfigurationItems(items, { ciType: "account", accountId: "a2" })).toHaveLength(0);
  });
});

describe("mock fallback", () => {
  test("listConfigurationItems returns [] when silver is empty (no crash)", async () => {
    await expect(mockRepositories.crm.listConfigurationItems()).resolves.toEqual([]);
  });
});
