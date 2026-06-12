import { describe, expect, it } from "vitest";
import { gdapConsentOutcome } from "./gdap";

const TENANT = "11111111-2222-3333-4444-555555555555";

describe("gdapConsentOutcome", () => {
  it("grants on admin_consent=True with a matching pinned tenant", () => {
    expect(
      gdapConsentOutcome({
        error: null,
        adminConsent: "True",
        tenant: TENANT,
        expectedTenant: TENANT,
      }),
    ).toEqual({ status: "active", result: "granted" });
  });

  it("grants when no expected tenant is configured (pinning off)", () => {
    expect(
      gdapConsentOutcome({
        error: null,
        adminConsent: "true",
        tenant: null,
        expectedTenant: undefined,
      }),
    ).toEqual({ status: "active", result: "granted" });
  });

  it("rejects a wrong tenant when pinned", () => {
    expect(
      gdapConsentOutcome({
        error: null,
        adminConsent: "True",
        tenant: "attacker-tenant",
        expectedTenant: TENANT,
      }),
    ).toEqual({ status: "error", result: "tenant_mismatch" });
  });

  it("rejects a MISSING tenant when pinned — pinning fails closed, not open", () => {
    expect(
      gdapConsentOutcome({
        error: null,
        adminConsent: "True",
        tenant: null,
        expectedTenant: TENANT,
      }),
    ).toEqual({ status: "error", result: "tenant_mismatch" });
  });

  it("records denial when Microsoft returns an error", () => {
    expect(
      gdapConsentOutcome({
        error: "access_denied",
        adminConsent: null,
        tenant: TENANT,
        expectedTenant: TENANT,
      }),
    ).toEqual({ status: "error", result: "denied" });
  });

  it("treats anything other than an explicit admin_consent=True as inconclusive", () => {
    expect(
      gdapConsentOutcome({
        error: null,
        adminConsent: "False",
        tenant: TENANT,
        expectedTenant: TENANT,
      }),
    ).toEqual({ status: "error", result: "unknown" });
    expect(
      gdapConsentOutcome({
        error: null,
        adminConsent: null,
        tenant: null,
        expectedTenant: undefined,
      }),
    ).toEqual({ status: "error", result: "unknown" });
  });
});
