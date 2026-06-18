import { describe, expect, it } from "vitest";
import { COMPANY_PROVIDERS, providerIsPollable } from "./company-providers";

describe("providerIsPollable", () => {
  // Poll cadence (ADR-0038 / pollDue()) is only meaningful for polled data
  // sources. #531: it must NOT render for consent/OAuth providers.
  it("credential providers are pollable", () => {
    expect(providerIsPollable({ kind: "credential" })).toBe(true);
  });

  it("consent providers are not pollable", () => {
    expect(providerIsPollable({ kind: "consent" })).toBe(false);
  });

  it("send-capable credentials are not pollable (nothing polls a send token)", () => {
    // Meta DM token is OUTBOUND-only (pipeline #89) — no ingest cadence applies.
    expect(providerIsPollable({ kind: "credential", sendCapable: true })).toBe(false);
  });

  it("Autotask and IT Glue are pollable; QBO, GDAP, and Meta are not", () => {
    const byKey = (key: string) => {
      const p = COMPANY_PROVIDERS.find((cp) => cp.key === key);
      if (!p) throw new Error(`missing provider ${key}`);
      return p;
    };
    expect(providerIsPollable(byKey("autotask"))).toBe(true);
    expect(providerIsPollable(byKey("itglue"))).toBe(true);
    expect(providerIsPollable(byKey("qbo"))).toBe(false);
    expect(providerIsPollable(byKey("gdap"))).toBe(false);
    expect(providerIsPollable(byKey("meta"))).toBe(false);
  });

  it("DocuSign (adminConsent credential) is not pollable — nothing polls a send integration", () => {
    const docusign = COMPANY_PROVIDERS.find((p) => p.key === "docusign");
    expect(docusign?.kind).toBe("credential");
    expect(providerIsPollable(docusign!)).toBe(false);
  });

  it("only non-send-capable, non-consent credential providers are pollable across the whole catalog", () => {
    for (const p of COMPANY_PROVIDERS) {
      expect(providerIsPollable(p)).toBe(
        p.kind === "credential" && p.sendCapable !== true && p.adminConsent !== true,
      );
    }
  });
});

describe("COMPANY_PROVIDERS — DocuSign provider (#862)", () => {
  const docusign = COMPANY_PROVIDERS.find((p) => p.key === "docusign");

  it("is a credential provider that also needs admin consent", () => {
    expect(docusign).toBeDefined();
    expect(docusign?.kind).toBe("credential");
    expect(docusign?.adminConsent).toBe(true);
  });

  it("collects the three JWT secrets the backend store maps to named Key Vault secrets", () => {
    const fieldNames = docusign?.fields?.map((f) => f.name) ?? [];
    expect(fieldNames).toEqual(["integrationKey", "rsaPrivateKey", "impersonatedUserId"]);
    // Every field is a write-only secret; the RSA key is a multiline textarea.
    expect(docusign?.fields?.every((f) => f.secret)).toBe(true);
    expect(docusign?.fields?.find((f) => f.name === "rsaPrivateKey")?.type).toBe("textarea");
    // Account id + environment are NOT entered via the form (ops App Settings).
    expect(fieldNames).not.toContain("accountId");
    expect(fieldNames).not.toContain("environment");
  });
});

describe("COMPANY_PROVIDERS — Meta provider (#586)", () => {
  const meta = COMPANY_PROVIDERS.find((p) => p.key === "meta");

  it("is present as a credential provider", () => {
    expect(meta).toBeDefined();
    expect(meta?.kind).toBe("credential");
    expect(meta?.sendCapable).toBe(true);
  });

  it("collects pageAccessToken (secret) + pageId — mirroring the pipeline's credentials.ts", () => {
    const fieldNames = meta?.fields?.map((f) => f.name) ?? [];
    expect(fieldNames).toEqual(["pageAccessToken", "pageId"]);
    const token = meta?.fields?.find((f) => f.name === "pageAccessToken");
    const pageId = meta?.fields?.find((f) => f.name === "pageId");
    expect(token?.secret).toBe(true);
    expect(token?.required).toBe(true);
    expect(pageId?.secret).toBe(false);
    expect(pageId?.required).toBe(true);
  });
});
