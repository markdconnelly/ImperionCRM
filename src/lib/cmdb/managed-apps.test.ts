import { describe, expect, test } from "vitest";
import {
  appField,
  classifyInstallState,
  installStateLabel,
  sortManagedApps,
} from "@/lib/cmdb/managed-apps";
import type { DeviceManagedApp } from "@/types";

const app = (over: Partial<DeviceManagedApp> = {}): DeviceManagedApp => ({
  appId: "a1",
  displayName: "App",
  publisher: null,
  version: null,
  platform: null,
  installState: null,
  installStateDetail: null,
  appType: null,
  ...over,
});

describe("classifyInstallState (#261)", () => {
  test("installed → ok, case-insensitive", () => {
    expect(classifyInstallState("installed")).toBe("ok");
    expect(classifyInstallState("Installed")).toBe("ok");
  });
  test("failed / error → bad", () => {
    expect(classifyInstallState("failed")).toBe("bad");
    expect(classifyInstallState("ERROR")).toBe("bad");
  });
  test("pending / unknown / absent → muted (never a wrong tone)", () => {
    expect(classifyInstallState("pendingInstall")).toBe("muted");
    expect(classifyInstallState("notInstalled")).toBe("muted");
    expect(classifyInstallState(null)).toBe("muted");
    expect(classifyInstallState("")).toBe("muted");
  });
});

describe("installStateLabel (#261)", () => {
  test("absent → Unknown", () => {
    expect(installStateLabel(null)).toBe("Unknown");
    expect(installStateLabel("  ")).toBe("Unknown");
  });
  test("camelCase Graph value → spaced + capitalised", () => {
    expect(installStateLabel("pendingInstall")).toBe("Pending install");
    expect(installStateLabel("installed")).toBe("Installed");
  });
});

describe("appField (#261)", () => {
  test("absent / empty → dash, value trimmed otherwise", () => {
    expect(appField(null)).toBe("—");
    expect(appField("")).toBe("—");
    expect(appField("  Chrome  ")).toBe("Chrome");
  });
});

describe("sortManagedApps (#261)", () => {
  test("sorts by name case-insensitively, un-named last, pure (no mutation)", () => {
    const input = [
      app({ displayName: "Zoom" }),
      app({ displayName: null }),
      app({ displayName: "chrome" }),
    ];
    const out = sortManagedApps(input);
    expect(out.map((a) => a.displayName)).toEqual(["chrome", "Zoom", null]);
    // original untouched
    expect(input[0].displayName).toBe("Zoom");
  });
});
