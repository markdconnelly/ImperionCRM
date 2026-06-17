import { describe, it, expect } from "vitest";
import {
  CHANGE_TYPES,
  CHANGE_TYPE_LABEL,
  CHANGE_STATUSES,
  CHANGE_STATUS_LABEL,
  asChangeType,
  effectiveRisk,
} from "@/lib/change";

describe("change helpers (#656)", () => {
  it("labels every change type and status", () => {
    for (const t of CHANGE_TYPES) expect(CHANGE_TYPE_LABEL[t]).toBeTruthy();
    for (const s of CHANGE_STATUSES) expect(CHANGE_STATUS_LABEL[s]).toBeTruthy();
  });

  it("narrows a valid change type and rejects junk", () => {
    expect(asChangeType("emergency")).toBe("emergency");
    expect(asChangeType("normal")).toBe("normal");
    expect(asChangeType("bogus")).toBeNull();
    expect(asChangeType(undefined)).toBeNull();
  });

  it("resolves effective risk override-wins", () => {
    expect(effectiveRisk(40, 80)).toBe(80); // override wins
    expect(effectiveRisk(40, null)).toBe(40); // fall back to derived
    expect(effectiveRisk(null, null)).toBeNull(); // unassessed
    expect(effectiveRisk(null, 0)).toBe(0); // explicit 0 override is kept (not nullish)
  });
});
