import { describe, expect, it } from "vitest";
import {
  chatChannelIcon,
  chatChannelLabel,
  chatDeflectionLabel,
  chatStatusMeta,
  parseTranscriptPreview,
  timeAgo,
} from "./chat-live";

describe("chatStatusMeta", () => {
  it("labels every lifecycle status with a tone", () => {
    for (const s of ["bot", "live", "deflected", "escalated", "closed"] as const) {
      const meta = chatStatusMeta(s);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.tone).toMatch(/^text-/);
    }
  });

  it("highlights escalated as amber and live as green", () => {
    expect(chatStatusMeta("escalated").tone).toContain("amber");
    expect(chatStatusMeta("live").tone).toContain("green");
  });
});

describe("chatChannelLabel / chatChannelIcon", () => {
  it("gives a friendly label per channel", () => {
    expect(chatChannelLabel("web_chat")).toBe("Web chat");
    expect(chatChannelLabel("sms")).toBe("SMS");
  });

  it("returns a lucide icon name per channel", () => {
    expect(chatChannelIcon("web_chat")).toBe("MessageSquare");
    expect(chatChannelIcon("email")).toBe("Mail");
  });
});

describe("chatDeflectionLabel", () => {
  it("maps the two deflection kinds and null", () => {
    expect(chatDeflectionLabel("self_served")).toBe("Self-served");
    expect(chatDeflectionLabel("bot_resolved")).toBe("Bot resolved");
    expect(chatDeflectionLabel(null)).toBeNull();
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("buckets recent → just now, then m/h/d", () => {
    expect(timeAgo("2026-06-15T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-06-15T11:30:00Z", now)).toBe("30m ago");
    expect(timeAgo("2026-06-15T09:00:00Z", now)).toBe("3h ago");
    expect(timeAgo("2026-06-13T12:00:00Z", now)).toBe("2d ago");
  });

  it("returns an em dash for an unparseable timestamp", () => {
    expect(timeAgo("not-a-date", now)).toBe("—");
  });
});

describe("parseTranscriptPreview", () => {
  it("returns an empty array for empty/null input", () => {
    expect(parseTranscriptPreview(null)).toEqual([]);
    expect(parseTranscriptPreview("")).toEqual([]);
    expect(parseTranscriptPreview("   \n  ")).toEqual([]);
  });

  it("tags lines by their role prefix, case-insensitively", () => {
    const lines = parseTranscriptPreview("Visitor: hi\nBOT: hello\nagent: how can I help?");
    expect(lines).toEqual([
      { role: "visitor", text: "hi" },
      { role: "bot", text: "hello" },
      { role: "agent", text: "how can I help?" },
    ]);
  });

  it("attributes an unprefixed line to the visitor", () => {
    expect(parseTranscriptPreview("my printer is down")).toEqual([
      { role: "visitor", text: "my printer is down" },
    ]);
  });
});
