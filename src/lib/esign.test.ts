import { describe, expect, it } from "vitest";
import type { EsignEnvelopeRow } from "@/types";
import {
  activeEnvelope,
  esignStatusMeta,
  hasSignedDocument,
  signerStates,
} from "./esign";

function envelope(over: Partial<EsignEnvelopeRow> = {}): EsignEnvelopeRow {
  return {
    id: "e1",
    proposalId: "p1",
    contractId: null,
    provider: "docusign",
    externalRef: "env-abc",
    status: "sent",
    recipients: [],
    hasSignedPdf: false,
    sentAt: "2026-06-14 10:00",
    completedAt: null,
    createdAt: "2026-06-14 09:55",
    ...over,
  };
}

describe("esignStatusMeta — envelope status → badge (ADR-0071, #395)", () => {
  it("maps each lifecycle status to a label / tone / icon", () => {
    expect(esignStatusMeta("created")).toMatchObject({ label: "Created", tone: "text-dim", terminal: false });
    expect(esignStatusMeta("sent")).toMatchObject({ label: "Sent for signature", tone: "text-accent", terminal: false });
    expect(esignStatusMeta("delivered")).toMatchObject({ label: "Delivered", tone: "text-accent", terminal: false });
    expect(esignStatusMeta("completed")).toMatchObject({ label: "Signed", tone: "text-green", terminal: true });
    expect(esignStatusMeta("declined")).toMatchObject({ label: "Declined", tone: "text-red", terminal: true });
    expect(esignStatusMeta("voided")).toMatchObject({ label: "Voided", tone: "text-amber", terminal: true });
  });

  it("falls back to a safe Unknown badge for an unexpected status", () => {
    expect(esignStatusMeta("bogus")).toMatchObject({ label: "Unknown", tone: "text-dim", icon: "HelpCircle" });
  });
});

describe("hasSignedDocument — signed-doc link gate (ADR-0071 decision 5)", () => {
  it("is true only when completed AND a signed PDF exists", () => {
    expect(hasSignedDocument(envelope({ status: "completed", hasSignedPdf: true }))).toBe(true);
  });
  it("is false when completed but no signed PDF (e.g. not yet retrieved)", () => {
    expect(hasSignedDocument(envelope({ status: "completed", hasSignedPdf: false }))).toBe(false);
  });
  it("is false when a PDF flag is set but the envelope is not completed", () => {
    expect(hasSignedDocument(envelope({ status: "sent", hasSignedPdf: true }))).toBe(false);
  });
});

describe("signerStates — recipients jsonb → ordered signer states", () => {
  it("normalizes fields, orders by routing order, and tones the per-signer status", () => {
    const env = envelope({
      recipients: [
        { name: "Second", role: "signer", status: "sent", order: 2 },
        { email: "first@example.com", role: "signer", status: "completed", order: 1 },
      ],
    });
    const out = signerStates(env);
    expect(out.map((s) => s.order)).toEqual([1, 2]);
    // name falls back to email when name is absent
    expect(out[0]).toMatchObject({ name: "first@example.com", role: "signer", status: "completed" });
    expect(out[0].meta).toMatchObject({ label: "Signed", tone: "text-green" });
    expect(out[1]).toMatchObject({ name: "Second", status: "sent" });
    expect(out[1].meta).toMatchObject({ label: "Sent for signature", tone: "text-accent" });
  });

  it("coalesces missing fields to null and pushes order-less signers last", () => {
    const env = envelope({
      recipients: [{ status: "delivered" }, { name: "Ordered", order: 1, status: "sent" }],
    });
    const out = signerStates(env);
    // the ordered signer comes first; the order-less one is last with null fields
    expect(out[0].name).toBe("Ordered");
    expect(out[1]).toMatchObject({ name: null, role: null, order: null, status: "delivered" });
  });

  it("returns [] for an empty recipients array", () => {
    expect(signerStates(envelope({ recipients: [] }))).toEqual([]);
  });
});

describe("activeEnvelope — the headline envelope", () => {
  it("returns the first (accessor sorts created DESC = newest first)", () => {
    const newest = envelope({ id: "new" });
    const older = envelope({ id: "old" });
    expect(activeEnvelope([newest, older])?.id).toBe("new");
  });
  it("returns null when there are no envelopes", () => {
    expect(activeEnvelope([])).toBeNull();
  });
});
