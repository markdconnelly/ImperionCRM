import { afterEach, describe, expect, it } from "vitest";
import { pickDial, resolveDispatch, type DialLike } from "./action-dispatch";
import { registerActionDef, type ActionDef } from "./action-catalog";

/**
 * Pins the dispatch-resolution contract (#996 / 2E, ADR-0107 D4/D5, ADR-0109): the pure
 * tie between the action catalog (#994 — the action's tier) and the persisted dial set
 * (the level → ceiling) into a single routing decision. Mirrors the backend dispatcher
 * (BE #250); the two must agree.
 *
 * `send_email` is a built-in T2 catalog action; the tests lean on it so they pin the real
 * registered contract, not a fixture.
 */

/** A dial-row builder so the cases read as data, not boilerplate. */
function dial(
  agentKey: string,
  actionClass: string,
  level: DialLike["level"],
  ceilings?: Record<string, string>,
): DialLike {
  return { agentKey, actionClass, level, ceilings: ceilings ?? null };
}

describe("pickDial — most-specific precedence (fail-closed)", () => {
  const dials: DialLike[] = [
    dial("*", "*", 1),
    dial("*", "send_email", 2),
    dial("sales", "*", 3),
    dial("sales", "send_email", 4),
  ];

  it("prefers exact agent + exact action class", () => {
    expect(pickDial(dials, "sales", "send_email")?.level).toBe(4);
  });
  it("falls to exact agent + '*' when no exact class", () => {
    expect(pickDial(dials, "sales", "update_ticket")?.level).toBe(3);
  });
  it("falls to '*' + exact class when the agent is unknown", () => {
    expect(pickDial(dials, "marketing", "send_email")?.level).toBe(2);
  });
  it("falls to the global default '*'/'*' last", () => {
    expect(pickDial(dials, "marketing", "update_ticket")?.level).toBe(1);
  });
  it("returns null when nothing matches at all (caller → level 1)", () => {
    expect(pickDial([dial("sales", "send_email", 4)], "marketing", "x")).toBeNull();
  });
});

describe("resolveDispatch — each level's execute-vs-route behavior (T2 action: send_email)", () => {
  const at = (level: DialLike["level"]) =>
    resolveDispatch("send_email", "sales", [dial("sales", "*", level)]);

  it("L1 Manual (T0 ceiling): a T2 send routes to the cockpit, not executed", () => {
    const r = at(1);
    expect(r.tier).toBe("T2");
    expect(r.resolvedLevel).toBe(1);
    expect(r.resolvedCeiling).toBe("T0");
    expect(r.decision).toBe("cockpit");
    expect(r.routesToCockpit).toBe(true);
  });

  it("L2 Assisted (T1 ceiling): a T2 send still routes to the cockpit", () => {
    const r = at(2);
    expect(r.resolvedCeiling).toBe("T1");
    expect(r.decision).toBe("cockpit");
  });

  it("L3 Supervised (T2 ceiling): a T2 send executes inline", () => {
    const r = at(3);
    expect(r.resolvedCeiling).toBe("T2");
    expect(r.decision).toBe("execute");
    expect(r.routesToCockpit).toBe(false);
  });

  it("L4 Autonomous-with-oversight: a T2 send executes + notify (undo window)", () => {
    const r = at(4);
    expect(r.resolvedCeiling).toBe("T3");
    expect(r.decision).toBe("execute_notify");
    expect(r.routesToCockpit).toBe(false);
  });

  it("L5 Fully autonomous: a T2 send executes silently", () => {
    const r = at(5);
    expect(r.resolvedCeiling).toBe("T3");
    expect(r.decision).toBe("execute");
  });
});

describe("resolveDispatch — fail-closed", () => {
  it("no dial set at all ⇒ level 1 (Manual) ⇒ routes a T2 send to the cockpit", () => {
    const r = resolveDispatch("send_email", "sales", []);
    expect(r.matchedDial).toBeNull();
    expect(r.resolvedLevel).toBe(1);
    expect(r.decision).toBe("cockpit");
  });

  it("an UNCATALOGUED action is treated as T3 (most restrictive) — never silent execute", () => {
    // Even at a permissive L3 (T2 ceiling), an unknown T3 action routes to the cockpit.
    const r = resolveDispatch("totally_unknown_action", "sales", [dial("sales", "*", 3)]);
    expect(r.cataloged).toBe(false);
    expect(r.tier).toBe("T3");
    expect(r.resolvedCeiling).toBe("T2");
    expect(r.decision).toBe("cockpit");
  });

  it("an uncatalogued action only executes once the level admits T3 (L4/L5)", () => {
    expect(resolveDispatch("totally_unknown_action", "sales", [dial("sales", "*", 4)]).decision).toBe(
      "execute_notify",
    );
    expect(resolveDispatch("totally_unknown_action", "sales", [dial("sales", "*", 5)]).decision).toBe(
      "execute",
    );
  });
});

describe("resolveDispatch — per-action-class override + ceilings tuning", () => {
  it("the exact (agent, class) row beats the agent default", () => {
    const dials = [dial("sales", "*", 1), dial("sales", "send_email", 3)];
    expect(resolveDispatch("send_email", "sales", dials).decision).toBe("execute"); // L3 / T2
  });

  it("a per-row ceilings override retunes a 2–4 boundary without a schema change", () => {
    // L3 normally → T2 (executes a T2 send). Override 3→T1 so a T2 send routes instead.
    const dials = [dial("sales", "*", 3, { "3": "T1" })];
    const r = resolveDispatch("send_email", "sales", dials);
    expect(r.resolvedCeiling).toBe("T1");
    expect(r.decision).toBe("cockpit");
  });
});

describe("resolveDispatch — a freshly registered action is dispatched by the catalog (no edit)", () => {
  const FIXTURE: ActionDef = {
    kind: "dispatch_fixture_action",
    label: "Dispatch fixture",
    tier: "T1",
    dataClass: "operational",
    consentClass: "none",
    executor: "noop",
    schema: {},
  };

  afterEach(() => {
    // The registry is module-global; leave it as we found it for sibling tests.
    // (No deregister API by design; overwriting with the same key is the documented seam.)
  });

  it("a T1 fixture action executes inline at L2 (Assisted) — proving catalog-driven tiering", () => {
    registerActionDef(FIXTURE);
    const r = resolveDispatch("dispatch_fixture_action", "sales", [dial("sales", "*", 2)]);
    expect(r.cataloged).toBe(true);
    expect(r.tier).toBe("T1");
    expect(r.resolvedCeiling).toBe("T1");
    expect(r.decision).toBe("execute");
  });
});
