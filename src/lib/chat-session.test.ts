import { describe, expect, it } from "vitest";
import {
  isEscalatedChatSession,
  isOpenChatSession,
  summarizeDeflection,
} from "./chat-session";
import type { ChatSessionRow } from "@/types";

// A chat-session-row factory — a fresh bot session by default.
function row(over: Partial<ChatSessionRow> = {}): ChatSessionRow {
  return {
    id: "s1",
    accountId: null,
    account: null,
    contactId: null,
    contactName: null,
    status: "bot",
    channel: "web_chat",
    deflected: false,
    deflectionKind: null,
    escalatedTicketRef: null,
    hadTicket: false,
    transcriptUri: null,
    summary: null,
    startedAt: "2026-06-15T00:00:00Z",
    closedAt: null,
    ...over,
  };
}

describe("isOpenChatSession", () => {
  it("treats bot and live as open, terminal states as closed", () => {
    expect(isOpenChatSession(row({ status: "bot" }))).toBe(true);
    expect(isOpenChatSession(row({ status: "live" }))).toBe(true);
    expect(isOpenChatSession(row({ status: "deflected" }))).toBe(false);
    expect(isOpenChatSession(row({ status: "escalated" }))).toBe(false);
    expect(isOpenChatSession(row({ status: "closed" }))).toBe(false);
  });
});

describe("isEscalatedChatSession", () => {
  it("is true by status or by a present ticket ref", () => {
    expect(isEscalatedChatSession(row({ status: "escalated" }))).toBe(true);
    expect(isEscalatedChatSession(row({ escalatedTicketRef: "T-100" }))).toBe(true);
    expect(isEscalatedChatSession(row())).toBe(false);
  });
});

describe("summarizeDeflection", () => {
  it("returns a zeroed summary (no NaN) for an empty set", () => {
    expect(summarizeDeflection([])).toEqual({
      total: 0,
      deflected: 0,
      escalated: 0,
      deflectionRate: 0,
    });
  });

  it("counts deflected and escalated and computes the rate", () => {
    const rows = [
      row({ id: "a", status: "deflected", deflected: true, deflectionKind: "bot_resolved" }),
      row({ id: "b", status: "deflected", deflected: true, deflectionKind: "self_served" }),
      row({ id: "c", status: "escalated", escalatedTicketRef: "T-1", hadTicket: true }),
      row({ id: "d", status: "closed" }),
    ];
    const s = summarizeDeflection(rows);
    expect(s.total).toBe(4);
    expect(s.deflected).toBe(2);
    expect(s.escalated).toBe(1);
    expect(s.deflectionRate).toBe(0.5);
  });

  it("is pure — same input gives the same summary", () => {
    const rows = [row({ deflected: true, status: "deflected" })];
    expect(summarizeDeflection(rows)).toEqual(summarizeDeflection(rows));
  });
});
