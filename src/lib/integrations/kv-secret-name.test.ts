import { describe, expect, it } from "vitest";
import {
  companySecretName,
  connectionSecretName,
  isCanonicalSecretRef,
} from "./kv-secret-name";

describe("connectionSecretName (canonical KV grammar, ADR-0122)", () => {
  it("company scope → conn-company-<provider>, no discriminator", () => {
    expect(companySecretName("autotask")).toBe("conn-company-autotask");
    expect(companySecretName("qbo")).toBe("conn-company-qbo");
    expect(companySecretName("myitprocess")).toBe("conn-company-myitprocess");
  });

  it("client scope → provider-always-3rd, discriminator last", () => {
    expect(
      connectionSecretName({
        scope: "client",
        provider: "m365",
        discriminator: "11111111-2222-3333-4444-555555555555",
      }),
    ).toBe("conn-client-m365-11111111-2222-3333-4444-555555555555");
    expect(
      connectionSecretName({ scope: "client", provider: "unifi", discriminator: "console9" }),
    ).toBe("conn-client-unifi-console9");
  });

  it("empty/absent discriminator is omitted, not a trailing dash", () => {
    expect(connectionSecretName({ scope: "company", provider: "meta", discriminator: "" })).toBe(
      "conn-company-meta",
    );
    expect(connectionSecretName({ scope: "company", provider: "meta", discriminator: null })).toBe(
      "conn-company-meta",
    );
  });

  it("rejects a provider segment that is not lowercase alphanumerics", () => {
    expect(() => companySecretName("My-Provider")).toThrow();
    expect(() => companySecretName("kv://imperion/conn/x")).toThrow();
    expect(() => companySecretName("")).toThrow();
  });

  it("rejects a discriminator with Key-Vault-illegal characters", () => {
    expect(() =>
      connectionSecretName({ scope: "client", provider: "m365", discriminator: "a/b" }),
    ).toThrow();
  });
});

describe("isCanonicalSecretRef", () => {
  it("accepts conforming refs", () => {
    expect(isCanonicalSecretRef("conn-company-autotask")).toBe(true);
    expect(isCanonicalSecretRef("conn-client-m365-aaaa-bbbb")).toBe(true);
    expect(isCanonicalSecretRef("conn-user-c201ba37-linkedin")).toBe(true);
  });

  it("flags the legacy non-conforming refs we are remediating", () => {
    expect(isCanonicalSecretRef("kv://imperion/conn/qbo")).toBe(false);
    expect(isCanonicalSecretRef("kv://imperion/conn/docusign")).toBe(false);
    expect(isCanonicalSecretRef(null)).toBe(false);
    expect(isCanonicalSecretRef("")).toBe(false);
  });
});
