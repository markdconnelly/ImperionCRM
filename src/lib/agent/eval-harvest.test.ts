import { describe, expect, it } from "vitest";
import {
  assertHarvestSafe,
  buildHarvestCandidate,
  HarvestRedactionError,
  redactPii,
  residualPii,
} from "./eval-harvest";

/**
 * The PII redaction contract (#1037, ADR-0120) — the security crux of the harvest pipeline.
 * These fixtures carry SYNTHETIC PII shapes (fake names/emails/figures) and prove that NO
 * row-level PII can survive into the eval corpus: redaction replaces every token, and the
 * fail-closed guard throws on any residual.
 */

describe("redactPii", () => {
  it("redacts emails, phones, money, urls, ips, uuids and long numbers", () => {
    const out = redactPii(
      "Email jane.doe@acme-corp.com or call (555) 123-4567 about the $12,500.00 invoice " +
        "at https://acme.example.com/inv/9912 from 10.0.0.42 ref 7c24bcd0-aaaa-bbbb-cccc-1234567890ab acct 998877665",
    );
    expect(out).not.toMatch(/jane\.doe@/);
    expect(out).not.toMatch(/555/);
    expect(out).not.toMatch(/12,500/);
    expect(out).not.toMatch(/acme\.example\.com/);
    expect(out).not.toMatch(/10\.0\.0\.42/);
    expect(out).not.toMatch(/7c24bcd0/);
    expect(out).not.toMatch(/998877665/);
    expect(out).toContain("[EMAIL]");
    expect(out).toContain("[MONEY]");
    expect(out).toContain("[URL]");
  });

  it("redacts capitalised proper names (coarse PERSON heuristic, over-redacts on purpose)", () => {
    expect(redactPii("Spoke with Jane Doe yesterday")).toBe("Spoke with [PERSON] yesterday");
  });

  it("leaves PII-free synthetic prose untouched", () => {
    const clean = "Draft a triage note that cites the ticket and routes to a human for approval.";
    expect(redactPii(clean)).toBe(clean);
  });

  it("is idempotent — re-redacting a redacted string is a no-op", () => {
    const once = redactPii("Pay $500 to bob@x.io now");
    expect(redactPii(once)).toBe(once);
  });
});

describe("residualPii", () => {
  it("returns [] for a fully redacted string", () => {
    expect(residualPii(redactPii("call (555) 123-4567 re $99"))).toEqual([]);
  });

  it("does not flag the placeholders themselves", () => {
    expect(residualPii("Contact [EMAIL] about [MONEY] at [URL]")).toEqual([]);
  });

  it("detects a leaked token in an under-redacted string", () => {
    const hits = residualPii("Contact [PERSON] at jane@acme.com");
    expect(hits.some((h) => h.kind === "email")).toBe(true);
  });
});

describe("assertHarvestSafe (fail-closed guard)", () => {
  it("passes a clean candidate through unchanged", () => {
    const c = { input: "Summarise the [PERSON] ticket and route to a human.", name: "triage routing" };
    expect(assertHarvestSafe(c)).toBe(c);
  });

  it("throws HarvestRedactionError when input still carries PII", () => {
    expect(() => assertHarvestSafe({ input: "Email jane@acme.com" })).toThrow(HarvestRedactionError);
  });

  it("never embeds the matched PII value in the error message", () => {
    try {
      assertHarvestSafe({ input: "card 4111111111111111" });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(HarvestRedactionError);
      expect((err as Error).message).not.toContain("4111111111111111");
      expect((err as Error).message).toContain("number");
    }
  });
});

describe("buildHarvestCandidate", () => {
  it("redacts a raw trace into a storable, PII-free candidate", () => {
    const c = buildHarvestCandidate({
      module: "sales",
      name: "John Smith outreach failed",
      input: "Draft an email to john.smith@bigco.com about the $40,000 renewal",
      reason: "eval result scored 0.42 < 0.75",
      sourceRunId: "run-123",
    });
    expect(c.input).not.toMatch(/john\.smith|bigco|40,000/);
    expect(c.name).toBe("[PERSON] outreach failed");
    expect(residualPii(c.input)).toEqual([]);
    expect(c.module).toBe("sales");
    expect(c.sourceRunId).toBe("run-123");
  });

  it("rejects a trace that cannot be made safe rather than storing it lossy", () => {
    // A pathological input that survives redaction would throw — proven here with a reason leak.
    expect(() =>
      buildHarvestCandidate({
        module: "crm",
        name: "ok",
        input: "clean synthetic prose",
        reason: "client jane@acme.com complained", // reason must be metadata-only
        sourceRunId: "run-9",
      }),
    ).toThrow(HarvestRedactionError);
  });
});
