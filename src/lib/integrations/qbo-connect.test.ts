import { describe, expect, it } from "vitest";
import { QBO_CONNECT_NOTICES, isQboConnectResult, type QboConnectResult } from "./qbo-connect";

describe("qbo-connect notices", () => {
  it("recognises every defined result code and rejects unknowns", () => {
    for (const code of Object.keys(QBO_CONNECT_NOTICES)) {
      expect(isQboConnectResult(code)).toBe(true);
    }
    expect(isQboConnectResult("nonsense")).toBe(false);
    expect(isQboConnectResult("")).toBe(false);
  });

  it("every code has a non-empty message and a valid tone", () => {
    for (const code of Object.keys(QBO_CONNECT_NOTICES) as QboConnectResult[]) {
      const notice = QBO_CONNECT_NOTICES[code];
      expect(["success", "warning", "error"]).toContain(notice.tone);
      expect(notice.message()).toBeTruthy();
    }
  });

  it("surfaces the backend HTTP status when one is given", () => {
    expect(QBO_CONNECT_NOTICES.start_rejected.message("500")).toContain("500");
    expect(QBO_CONNECT_NOTICES.exchange_failed.message("502")).toContain("502");
  });

  it("omits the status fragment when none is given", () => {
    expect(QBO_CONNECT_NOTICES.start_rejected.message()).not.toContain("HTTP");
    expect(QBO_CONNECT_NOTICES.exchange_failed.message()).not.toContain("HTTP");
  });

  it("classifies the not-configured outcomes as warnings, hard failures as errors", () => {
    expect(QBO_CONNECT_NOTICES.start_not_configured.tone).toBe("warning");
    expect(QBO_CONNECT_NOTICES.stubbed.tone).toBe("warning");
    expect(QBO_CONNECT_NOTICES.start_rejected.tone).toBe("error");
    expect(QBO_CONNECT_NOTICES.start_unreachable.tone).toBe("error");
    expect(QBO_CONNECT_NOTICES.ok.tone).toBe("success");
  });
});
