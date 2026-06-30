import { describe, expect, it } from "vitest";
import {
  THREADS_CONNECT_NOTICES,
  isThreadsConnectResult,
  type ThreadsConnectResult,
} from "./threads-connect";

describe("threads-connect notices (#1500)", () => {
  it("recognises every defined result code and rejects unknowns", () => {
    for (const code of Object.keys(THREADS_CONNECT_NOTICES)) {
      expect(isThreadsConnectResult(code)).toBe(true);
    }
    expect(isThreadsConnectResult("nonsense")).toBe(false);
    expect(isThreadsConnectResult("")).toBe(false);
  });

  it("every code has a non-empty message and a valid tone", () => {
    for (const code of Object.keys(THREADS_CONNECT_NOTICES) as ThreadsConnectResult[]) {
      const notice = THREADS_CONNECT_NOTICES[code];
      expect(["success", "warning", "error"]).toContain(notice.tone);
      expect(notice.message()).toBeTruthy();
    }
  });

  it("surfaces the backend HTTP status when one is given", () => {
    expect(THREADS_CONNECT_NOTICES.start_rejected.message("500")).toContain("500");
    expect(THREADS_CONNECT_NOTICES.exchange_failed.message("502")).toContain("502");
  });

  it("omits the status fragment when none is given", () => {
    expect(THREADS_CONNECT_NOTICES.start_rejected.message()).not.toContain("HTTP");
    expect(THREADS_CONNECT_NOTICES.exchange_failed.message()).not.toContain("HTTP");
  });

  it("classifies the not-configured outcomes as warnings, hard failures as errors", () => {
    expect(THREADS_CONNECT_NOTICES.start_not_configured.tone).toBe("warning");
    expect(THREADS_CONNECT_NOTICES.stubbed.tone).toBe("warning");
    expect(THREADS_CONNECT_NOTICES.denied.tone).toBe("warning");
    expect(THREADS_CONNECT_NOTICES.start_rejected.tone).toBe("error");
    expect(THREADS_CONNECT_NOTICES.invalid.tone).toBe("error");
    expect(THREADS_CONNECT_NOTICES.ok.tone).toBe("success");
  });

  it("the success message makes clear the token lands in Key Vault (never the browser/DB)", () => {
    expect(THREADS_CONNECT_NOTICES.ok.message().toLowerCase()).toContain("key vault");
  });
});
