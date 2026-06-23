import { describe, it, expect } from "vitest";
import {
  labelTicketStatus,
  labelTicketPriority,
  labelContractType,
  labelContractStatus,
} from "./autotask-labels";

describe("autotask picklist labels (#1138)", () => {
  it("maps known ticket status codes", () => {
    expect(labelTicketStatus("1")).toBe("New");
    expect(labelTicketStatus("5")).toBe("Complete");
    expect(labelTicketStatus("8")).toBe("In Progress");
    expect(labelTicketStatus("9")).toBe("Waiting Customer");
  });

  it("maps known ticket priority codes", () => {
    expect(labelTicketPriority("1")).toBe("Critical");
    expect(labelTicketPriority("2")).toBe("High");
    expect(labelTicketPriority("3")).toBe("Medium");
    expect(labelTicketPriority("4")).toBe("Low");
  });

  it("maps known contract type + status codes", () => {
    expect(labelContractType("7")).toBe("Recurring Service");
    expect(labelContractType("1")).toBe("Time & Materials");
    expect(labelContractStatus("1")).toBe("Active");
  });

  it("keeps unmapped ids honest with a type-prefixed code", () => {
    expect(labelTicketStatus("19")).toBe("Status 19");
    expect(labelTicketPriority("99")).toBe("Priority 99");
    expect(labelContractType("42")).toBe("Type 42");
  });

  it("renders null/blank as an em-dash and passes 'unknown' through", () => {
    expect(labelTicketStatus(null)).toBe("—");
    expect(labelTicketStatus("")).toBe("—");
    expect(labelTicketStatus(undefined)).toBe("—");
    expect(labelTicketStatus("unknown")).toBe("unknown");
  });
});
