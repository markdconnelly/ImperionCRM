import { describe, it, expect } from "vitest";

import { getActionDef, selectActuation } from "@/lib/agent/action-catalog";
import { LADDER_LEVELS, type LadderLevel } from "@/lib/agent/action-autonomy";

/**
 * Felix (Service) governance conformance — pins the autonomy ceiling declared in the
 * runtime persona `icm/domains/service/felix.md` against the EXECUTABLE action catalog
 * (the kind-keyed `ActionDef` tags, migrations 0217/0218, lockstep with backend PR #441).
 *
 * Felix is the one agent that PREDATES the canonical ladder (#1067, built before ADR-0128);
 * #1499 maps him onto it. This suite is the drift guard: if the persona prose and the
 * catalog tags ever disagree about whether one of Felix's actions auto-executes or parks,
 * a test here fails. The three kinds below are exactly the Service executor surface
 * (`autotask_write`) Felix actuates through.
 */

const FELIX_KINDS = [
  "autotask_update_ticket",
  "autotask_post_reply",
  "autotask_log_time",
] as const;

describe("Felix service governance ↔ action catalog", () => {
  it("every Felix executor kind is registered in the catalog", () => {
    for (const kind of FELIX_KINDS) {
      expect(getActionDef(kind), kind).toBeDefined();
    }
  });

  it("a time/billing entry is dial-proof — parks at every rung (always_gate money ceiling)", () => {
    const def = getActionDef("autotask_log_time")!;
    // felix.md HARD CEILING: any time/billing entry never auto-executes at any level.
    expect(def.dataClass).toBe("financial");
    expect(def.alwaysGate).toBe(true);
    for (const dial of LADDER_LEVELS) {
      expect(selectActuation(def, dial), `log_time @L${dial}`).toBe("park");
    }
  });

  it("the internal ticket write is auto-internal at L2 (reversible operational)", () => {
    const def = getActionDef("autotask_update_ticket")!;
    // felix.md L2: auto-post the internal work-note + internal ticket-field updates.
    expect(def.dataClass).toBe("operational");
    expect(def.alwaysGate).toBe(false);
    expect(def.autoAtLevel).toBe(2);
    expect(selectActuation(def, 0), "update_ticket @L0").toBe("park");
    expect(selectActuation(def, 1), "update_ticket @L1 (propose default)").toBe("park");
    for (const dial of [2, 3, 4, 5] as LadderLevel[]) {
      expect(selectActuation(def, dial), `update_ticket @L${dial}`).toBe("auto");
    }
  });

  it("a customer-facing reply has an L3 capability floor but the client_pii ceiling parks it in v1", () => {
    const def = getActionDef("autotask_post_reply")!;
    // felix.md HARD CEILING: a customer-facing reply parks via the client_pii DATA-CLASS
    // ceiling (ADR-0118), which `selectActuation` deliberately does NOT model — the catalog
    // encodes only the capability floor (`autoAtLevel`) + the commitment ceiling
    // (`alwaysGate`). So the catalog says "capability L3"; the actual v1 park is enforced by
    // the separate data-class gate (backend gauntlet). This test pins BOTH facts so the
    // persona's "always-gated" claim and the catalog's `client_pii` tag can't silently drift.
    expect(def.dataClass).toBe("client_pii");
    expect(def.alwaysGate).toBe(false);
    expect(def.autoAtLevel).toBe(3);
    expect(selectActuation(def, 2), "post_reply @L2 (below capability floor)").toBe("park");
    expect(selectActuation(def, 3), "post_reply @L3 (capability floor; data-class ceiling parks separately)").toBe("auto");
  });
});
