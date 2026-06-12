import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./safe-url";

describe("safeHttpUrl", () => {
  it("passes https and http URLs through unchanged", () => {
    expect(safeHttpUrl("https://linkedin.com/in/someone")).toBe(
      "https://linkedin.com/in/someone",
    );
    expect(safeHttpUrl("http://example.com/profile?id=1")).toBe(
      "http://example.com/profile?id=1",
    );
  });

  it("rejects javascript: and data: schemes", () => {
    expect(safeHttpUrl("javascript:alert(document.cookie)")).toBeNull();
    expect(safeHttpUrl("JavaScript:void(0)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("rejects other non-web schemes", () => {
    expect(safeHttpUrl("file:///etc/passwd")).toBeNull();
    expect(safeHttpUrl("vbscript:msgbox(1)")).toBeNull();
    expect(safeHttpUrl("mailto:a@b.c")).toBeNull();
  });

  it("rejects relative/unparseable/empty values", () => {
    expect(safeHttpUrl("/in/someone")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });

  it("is not fooled by leading whitespace or scheme obfuscation", () => {
    expect(safeHttpUrl("  javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("java\tscript:alert(1)")).toBeNull();
    // Invalid port after the host-less https: — URL refuses to parse it at all.
    expect(safeHttpUrl("https:javascript:alert(1)")).toBeNull();
  });
});
