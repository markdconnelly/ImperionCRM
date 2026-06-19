import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { requestOrigin } from "./request-origin";

function reqWith(headers: Record<string, string>): NextRequest {
  // The URL stands in for the internal bind host App Service hands Next.js.
  return new NextRequest("https://0.0.0.0:8080/api/qbo/callback", { headers });
}

describe("requestOrigin", () => {
  afterEach(() => {
    delete process.env.APP_PUBLIC_ORIGIN;
  });

  it("prefers x-forwarded-host with x-forwarded-proto", () => {
    const req = reqWith({
      "x-forwarded-host": "imperioncrm.azurewebsites.net",
      "x-forwarded-proto": "https",
    });
    expect(requestOrigin(req)).toBe("https://imperioncrm.azurewebsites.net");
  });

  it("defaults the scheme to https when only the forwarded host is present", () => {
    const req = reqWith({ "x-forwarded-host": "imperioncrm.azurewebsites.net" });
    expect(requestOrigin(req)).toBe("https://imperioncrm.azurewebsites.net");
  });

  it("takes the first hop from a comma-separated forwarded chain", () => {
    const req = reqWith({
      "x-forwarded-host": "imperioncrm.azurewebsites.net, internal-lb",
      "x-forwarded-proto": "https, http",
    });
    expect(requestOrigin(req)).toBe("https://imperioncrm.azurewebsites.net");
  });

  it("falls back to nextUrl.origin when no proxy headers are present (local dev)", () => {
    const req = new NextRequest("http://localhost:3000/api/qbo/callback");
    expect(requestOrigin(req)).toBe("http://localhost:3000");
  });

  it("lets APP_PUBLIC_ORIGIN override everything and trims trailing slashes", () => {
    process.env.APP_PUBLIC_ORIGIN = "https://app.imperion.example/";
    const req = reqWith({ "x-forwarded-host": "ignored.example" });
    expect(requestOrigin(req)).toBe("https://app.imperion.example");
  });

  it("never returns the internal bind host when a forwarded host exists", () => {
    const req = reqWith({ "x-forwarded-host": "imperioncrm.azurewebsites.net" });
    expect(requestOrigin(req)).not.toContain("0.0.0.0");
  });
});
