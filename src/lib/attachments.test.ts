import { describe, expect, it } from "vitest";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  formatBytes,
  isPreviewableImage,
  validateAttachment,
} from "./attachments";

// Attachment policy — the shared type-allowlist + size-cap contract (ADR-0064 A4,
// #333) enforced server-side before any metadata is recorded.

describe("attachment policy (ADR-0064 A4)", () => {
  it("accepts an allowed type under the cap", () => {
    expect(validateAttachment("application/pdf", 1024)).toBeNull();
    expect(validateAttachment("image/png", MAX_ATTACHMENT_BYTES)).toBeNull();
  });

  it("rejects an empty file", () => {
    expect(validateAttachment("application/pdf", 0)).toBe("empty");
  });

  it("rejects a file over the size cap", () => {
    expect(validateAttachment("application/pdf", MAX_ATTACHMENT_BYTES + 1)).toBe("too_large");
  });

  it("rejects a type not on the allowlist (e.g. an executable)", () => {
    expect(validateAttachment("application/x-msdownload", 10)).toBe("type_not_allowed");
    expect(validateAttachment("application/octet-stream", 10)).toBe("type_not_allowed");
  });

  it("the allowlist excludes executables/scripts", () => {
    expect(ALLOWED_ATTACHMENT_TYPES).not.toContain("application/x-msdownload");
    expect(ALLOWED_ATTACHMENT_TYPES).not.toContain("text/html");
    expect(ALLOWED_ATTACHMENT_TYPES).not.toContain("application/javascript");
  });

  it("previews raster images inline but never SVG (script vector)", () => {
    expect(isPreviewableImage("image/png")).toBe(true);
    expect(isPreviewableImage("image/jpeg")).toBe(true);
    expect(isPreviewableImage("image/svg+xml")).toBe(false);
    expect(isPreviewableImage("application/pdf")).toBe(false);
  });

  it("formatBytes renders human-readable sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(25 * 1024 * 1024)).toBe("25 MB");
  });
});
