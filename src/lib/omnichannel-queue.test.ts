import { describe, expect, it } from "vitest";
import {
  buildQueue,
  priorityFromSlaState,
  queueItemFromChatSession,
  queueItemFromTicket,
  queuePriorityRank,
  routingWired,
  sortQueue,
  summarizeQueue,
} from "./omnichannel-queue";
import type { ChatSessionRow, TicketRow, TicketSlaBreachRow } from "@/types";

// A chat-session-row factory — a fresh bot session by default.
function chat(over: Partial<ChatSessionRow> = {}): ChatSessionRow {
  return {
    id: "c1",
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

// A ticket-row factory — an open ticket by default.
function ticket(over: Partial<TicketRow> = {}): TicketRow {
  return {
    id: "t1",
    account: "Acme",
    number: "T-1",
    title: "Printer down",
    status: "Open",
    priority: "High",
    opened: "2026-06-14T00:00:00Z",
    ...over,
  };
}

// An SLA-breach projection row factory.
function sla(over: Partial<TicketSlaBreachRow> = {}): TicketSlaBreachRow {
  return {
    ticketId: "t1",
    accountId: null,
    number: "T-1",
    status: "Open",
    priority: "High",
    openedAt: "2026-06-14T00:00:00Z",
    closedAt: null,
    slaApplies: true,
    slaId: "sla-1",
    isOpen: true,
    firstResponseDueAt: null,
    resolutionDueAt: null,
    firstResponseBreached: false,
    resolutionBreached: false,
    resolutionTimeRemaining: null,
    slaState: "ok",
    ...over,
  };
}

describe("priorityFromSlaState", () => {
  it("maps SLA buckets to queue priority", () => {
    expect(priorityFromSlaState("breached")).toBe("urgent");
    expect(priorityFromSlaState("at_risk")).toBe("high");
    expect(priorityFromSlaState("ok")).toBe("normal");
    expect(priorityFromSlaState("unknown")).toBe("normal");
    expect(priorityFromSlaState(undefined)).toBe("normal");
  });
});

describe("queueItemFromChatSession", () => {
  it("projects a live session as an urgent, open, web_chat item", () => {
    const item = queueItemFromChatSession(chat({ status: "live", summary: "Need help" }));
    expect(item).toMatchObject({
      id: "chat:c1",
      source: "chat_session",
      sourceId: "c1",
      channel: "web_chat",
      priority: "urgent",
      subject: "Need help",
      isOpen: true,
      routedTo: null,
    });
  });

  it("falls back to a subject when there is no summary, and a closed session is low/closed", () => {
    const item = queueItemFromChatSession(chat({ status: "closed", summary: null }));
    expect(item.subject).toBe("Live chat session");
    expect(item.priority).toBe("low");
    expect(item.isOpen).toBe(false);
  });

  it("maps an unknown chat channel to 'other'", () => {
    // @ts-expect-error — exercising the defensive default branch
    const item = queueItemFromChatSession(chat({ channel: "carrier-pigeon" }));
    expect(item.channel).toBe("other");
  });
});

describe("queueItemFromTicket", () => {
  it("uses the SLA projection for priority + open state when present", () => {
    const item = queueItemFromTicket(ticket(), sla({ slaState: "breached", isOpen: true }));
    expect(item).toMatchObject({
      id: "ticket:t1",
      source: "ticket",
      channel: "ticket",
      priority: "urgent",
      isOpen: true,
    });
  });

  it("infers open-state from status when no SLA row is given", () => {
    expect(queueItemFromTicket(ticket({ status: "Open" })).isOpen).toBe(true);
    expect(queueItemFromTicket(ticket({ status: "Complete" })).isOpen).toBe(false);
    expect(queueItemFromTicket(ticket({ status: "Closed" })).isOpen).toBe(false);
    expect(queueItemFromTicket(ticket({ status: null })).isOpen).toBe(false);
    expect(queueItemFromTicket(ticket()).priority).toBe("normal");
  });
});

describe("sortQueue / queuePriorityRank", () => {
  it("ranks priorities urgent→low", () => {
    expect(queuePriorityRank("urgent")).toBeLessThan(queuePriorityRank("high"));
    expect(queuePriorityRank("high")).toBeLessThan(queuePriorityRank("normal"));
    expect(queuePriorityRank("normal")).toBeLessThan(queuePriorityRank("low"));
  });

  it("orders open before closed, then by priority, then oldest first; does not mutate input", () => {
    const items = [
      queueItemFromChatSession(chat({ id: "closed", status: "closed" })),
      queueItemFromTicket(ticket({ id: "norm", status: "Open", opened: "2026-06-10T00:00:00Z" })),
      queueItemFromChatSession(chat({ id: "live-new", status: "live", startedAt: "2026-06-15T00:00:00Z" })),
      queueItemFromChatSession(chat({ id: "live-old", status: "live", startedAt: "2026-06-13T00:00:00Z" })),
    ];
    const before = [...items];
    const sorted = sortQueue(items);
    expect(sorted.map((i) => i.sourceId)).toEqual(["live-old", "live-new", "norm", "closed"]);
    expect(items).toEqual(before); // input untouched
  });
});

describe("buildQueue", () => {
  it("merges both sources, applies the SLA map, and sorts", () => {
    const slaByTicketId = new Map([["t1", sla({ slaState: "breached" })]]);
    const queue = buildQueue({
      chatSessions: [chat({ id: "c1", status: "bot" })],
      tickets: [ticket({ id: "t1" })],
      slaByTicketId,
    });
    expect(queue).toHaveLength(2);
    // breached ticket (urgent) outranks a bot chat (high)
    expect(queue[0].id).toBe("ticket:t1");
    expect(queue[0].priority).toBe("urgent");
    expect(queue[1].id).toBe("chat:c1");
  });

  it("returns an empty queue for empty inputs (no DB / honest degrade)", () => {
    expect(buildQueue({ chatSessions: [], tickets: [] })).toEqual([]);
  });
});

describe("summarizeQueue", () => {
  it("zeroes cleanly for an empty queue (no NaN)", () => {
    expect(summarizeQueue([])).toEqual({ total: 0, open: 0, urgent: 0, byChannel: {} });
  });

  it("counts totals, open, urgent, and open-by-channel", () => {
    const queue = buildQueue({
      chatSessions: [
        chat({ id: "a", status: "live", channel: "web_chat" }),
        chat({ id: "b", status: "closed", channel: "social" }),
      ],
      tickets: [ticket({ id: "t1", status: "Open" })],
    });
    const s = summarizeQueue(queue);
    expect(s.total).toBe(3);
    expect(s.open).toBe(2); // live chat + open ticket
    expect(s.urgent).toBe(1); // live chat
    expect(s.byChannel).toEqual({ web_chat: 1, ticket: 1 });
  });
});

describe("routingWired", () => {
  it("is false while no item carries a resolved ICM lane (honest stub)", () => {
    const queue = buildQueue({ chatSessions: [chat()], tickets: [ticket()] });
    expect(routingWired(queue)).toBe(false);
  });

  it("is true once an item is routed", () => {
    const queue = buildQueue({ chatSessions: [chat()], tickets: [] });
    queue[0].routedTo = "tier-1";
    expect(routingWired(queue)).toBe(true);
  });

  it("is pure — same input gives the same summary", () => {
    const queue = buildQueue({ chatSessions: [chat({ status: "live" })], tickets: [] });
    expect(summarizeQueue(queue)).toEqual(summarizeQueue(queue));
  });
});
