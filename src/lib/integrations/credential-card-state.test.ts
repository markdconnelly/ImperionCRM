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

  it("pending → form open, not configured", () => {
    expect(credentialCardState({ status: "pending" })).toEqual({
      stored: false,
      defaultOpen: true,
      statusLabel: "Not configured",
    });
  });

  it("revoked → form open (custody was deleted on disconnect)", () => {
    expect(credentialCardState({ status: "revoked" })).toEqual({
      stored: false,
      defaultOpen: true,
      statusLabel: "Not configured",
    });
  });
});
