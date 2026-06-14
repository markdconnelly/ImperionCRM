import { describe, expect, it } from "vitest";
import {
  planInstantiation,
  projectIdempotencyKey,
  taskTicketIdempotencyKey,
} from "./instantiate";
import type { DeliveryTemplateDetail } from "@/types";

// Pure date-math + row-derivation tests for delivery-template instantiation
// (ADR-0080 §4/§7, ADR-0081 §3). No pg, no clock — the transactional repo
// function consumes this plan and supplies the real row ids for the keys.

const template: DeliveryTemplateDetail = {
  id: "dt-1",
  key: "network_refresh",
  name: "Standard Network Refresh",
  description: null,
  version: 1,
  projectTypeId: null,
  projectTypeName: null,
  isActive: true,
  phases: [
    {
      id: "p1",
      ordinal: 0,
      name: "Procurement & Staging",
      offsetDays: 0,
      durationDays: 10,
      tasks: [
        {
          id: "t1",
          ordinal: 0,
          title: "Order hardware",
          offsetDays: 0,
          durationDays: 5,
          dispatchesTicket: false,
          ticketQueueId: null,
          ticketTitle: null,
          ticketLeadDays: 0,
        },
      ],
    },
    {
      id: "p2",
      ordinal: 1,
      name: "Cutover",
      offsetDays: 10,
      durationDays: 2,
      tasks: [
        {
          id: "t2",
          ordinal: 0,
          title: "On-site cutover",
          offsetDays: 10,
          durationDays: 1,
          dispatchesTicket: true,
          ticketQueueId: 29683483,
          ticketTitle: "Network cutover — on-site",
          ticketLeadDays: 2,
        },
      ],
    },
  ],
};

describe("planInstantiation — milestone dates", () => {
  it("computes each phase window from the project start (offset + duration)", () => {
    const plan = planInstantiation(template, "2026-07-01");
    expect(plan.milestones).toHaveLength(2);
    // Phase 1: start +0d, lasts 10d.
    expect(plan.milestones[0]).toMatchObject({
      name: "Procurement & Staging",
      ordinal: 0,
      startAt: "2026-07-01",
      dueAt: "2026-07-11",
    });
    // Phase 2: start +10d, lasts 2d.
    expect(plan.milestones[1]).toMatchObject({
      ordinal: 1,
      startAt: "2026-07-11",
      dueAt: "2026-07-13",
    });
  });
});

describe("planInstantiation — task dates", () => {
  it("computes each task window from the project start (offset + duration)", () => {
    const plan = planInstantiation(template, "2026-07-01");
    const order = plan.milestones[0].tasks[0];
    expect(order).toMatchObject({ title: "Order hardware", startAt: "2026-07-01", dueAt: "2026-07-06" });
    const cutover = plan.milestones[1].tasks[0];
    expect(cutover).toMatchObject({ startAt: "2026-07-11", dueAt: "2026-07-12" });
  });
});

describe("planInstantiation — fire rows", () => {
  it("a dispatching task yields a fire row with the template queue + lead-days schedule", () => {
    const plan = planInstantiation(template, "2026-07-01");
    const cutover = plan.milestones[1].tasks[0];
    expect(cutover.fire).not.toBeNull();
    expect(cutover.fire).toMatchObject({
      ticketQueueId: 29683483,
      ticketTitle: "Network cutover — on-site",
      // task start 2026-07-11 − 2 lead days.
      scheduledFor: "2026-07-09",
    });
  });

  it("a non-dispatching task yields no fire row", () => {
    const plan = planInstantiation(template, "2026-07-01");
    expect(plan.milestones[0].tasks[0].fire).toBeNull();
  });

  it("ticketTitle defaults to the task title when the template leaves it null", () => {
    const t: DeliveryTemplateDetail = {
      ...template,
      phases: [
        {
          ...template.phases[1],
          tasks: [{ ...template.phases[1].tasks[0], ticketTitle: null }],
        },
      ],
    };
    const plan = planInstantiation(t, "2026-07-01");
    expect(plan.milestones[0].tasks[0].fire?.ticketTitle).toBe("On-site cutover");
  });

  it("lead 0 schedules the fire on the task's own start date", () => {
    const t: DeliveryTemplateDetail = {
      ...template,
      phases: [
        {
          ...template.phases[1],
          tasks: [{ ...template.phases[1].tasks[0], ticketLeadDays: 0 }],
        },
      ],
    };
    const plan = planInstantiation(t, "2026-07-01");
    expect(plan.milestones[0].tasks[0].fire?.scheduledFor).toBe("2026-07-11");
  });
});

describe("idempotency keys", () => {
  it("format the provisioning key as imperioncrm-project-{projectId}", () => {
    expect(projectIdempotencyKey("abc-123")).toBe("imperioncrm-project-abc-123");
  });

  it("format the fire key as imperioncrm-taskticket-{taskId}", () => {
    expect(taskTicketIdempotencyKey("task-9")).toBe("imperioncrm-taskticket-task-9");
  });
});
