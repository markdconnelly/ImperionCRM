import { describe, expect, it } from "vitest";
import { credentialCardState } from "./credential-card-state";

describe("credentialCardState", () => {
  it("no row → form open, not configured", () => {
    expect(credentialCardState(null)).toEqual({
      stored: false,
      defaultOpen: true,
      statusLabel: "Not configured",
    });
  });

  it("active → stored, form collapsed", () => {
    expect(credentialCardState({ status: "active" })).toEqual({
      stored: true,
      defaultOpen: false,
      statusLabel: "Configured",
    });
  });

  it("expired → still stored (rotation makes sense), form collapsed", () => {
    expect(credentialCardState({ status: "expired" })).toEqual({
      stored: true,
      defaultOpen: false,
      statusLabel: "Configured",
    });
  });

  // The #176 regression: stub-era / failed-save rows must not hide the entry form.
  it("error → form open, needs attention", () => {
    expect(credentialCardState({ status: "error" })).toEqual({
      stored: false,
      defaultOpen: true,
      statusLabel: "Needs attention",
    });
  });

  it("error with a canonical ref → STILL form open (the operator must see the failure)", () => {
    expect(
      credentialCardState({ status: "error", keyvaultSecretRef: "conn-company-meta" }),
    ).toEqual({
      stored: false,
      defaultOpen: true,
      statusLabel: "Needs attention",
    });
  });

  it("pending with NO ref → form open, not configured", () => {
    expect(credentialCardState({ status: "pending" })).toEqual({
      stored: false,
      defaultOpen: true,
      statusLabel: "Not configured",
    });
  });

  // #1567 vault-presence: a pending row that already records the canonical KV name is
  // configured — the secret may be custodied — so it must NOT re-prompt.
  it("pending WITH a canonical ref → stored, form collapsed (vault presence)", () => {
    expect(
      credentialCardState({ status: "pending", keyvaultSecretRef: "conn-company-autotask" }),
    ).toEqual({
      stored: true,
      defaultOpen: false,
      statusLabel: "Configured",
    });
  });

  it("pending with a LEGACY non-canonical ref → not configured (re-enter under canonical name)", () => {
    expect(
      credentialCardState({ status: "pending", keyvaultSecretRef: "kv://imperion/conn/docusign" }),
    ).toEqual({
      stored: false,
      defaultOpen: true,
      statusLabel: "Not configured",
    });
  });

  it("client-scope canonical ref also counts (conn-client-m365-<tenant>)", () => {
    expect(
      credentialCardState({
        status: "pending",
        keyvaultSecretRef: "conn-client-m365-49307c12-0000-0000-0000-000000000000",
      }),
    ).toEqual({
      stored: true,
      defaultOpen: false,
      statusLabel: "Configured",
    });
  });

  it("revoked → form open even with a stale ref (custody was deleted on disconnect)", () => {
    expect(
      credentialCardState({ status: "revoked", keyvaultSecretRef: "conn-company-apollo" }),
    ).toEqual({
      stored: false,
      defaultOpen: true,
      statusLabel: "Not configured",
    });
  });
});
