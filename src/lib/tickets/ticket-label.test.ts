import { describe, expect, it } from "vitest";
import type { TicketRow } from "@/types";
import { formatTicketLabel, ticketRefValue } from "./ticket-label";

const base: TicketRow = {
  id: "t1",
  account: "Acme Co",
  number: "T-1024",
  title: "VPN down",
  status: "In Progress",
  priority: "High",
  opened: "2026-06-01",
};

describe("formatTicketLabel", () => {
  it("renders number, account, title, and status", () => {
    expect(formatTicketLabel(base)).toBe("#T-1024 · Acme Co · VPN down · In Progress");
  });

  it("omits the status segment when absent", () => {
    expect(formatTicketLabel({ ...base, status: null })).toBe("#T-1024 · Acme Co · VPN down");
  });

  it("falls back when the ticket has no number", () => {
    expect(formatTicketLabel({ ...base, number: null })).toBe(
      "(no number) · Acme Co · VPN down · In Progress",
    );
  });
});

describe("ticketRefValue", () => {
  it("uses the ticket number as the stored ref", () => {
    expect(ticketRefValue(base)).toBe("T-1024");
  });

  it("is empty when there is no number to store", () => {
    expect(ticketRefValue({ ...base, number: null })).toBe("");
  });
});
