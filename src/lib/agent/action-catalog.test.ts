import { describe, expect, it } from "vitest";

/**
 * Tests for the action-contract catalog (ADR-0107 D2 / #994): registry dispatch, schema
 * validation rejecting bad input, and the no-endpoint-edit property (a new action is added
 * by a catalog entry alone). PURE module — no boundaries to mock.
 */
import {
  actionLabel,
  getActionDef,
  isRegisteredAction,
  listActionDefs,
  listActionKinds,
  registerActionDef,
  resolveAction,
  selectActuation,
  validateInput,
  type ActionDef,
} from "./action-catalog";
import { LADDER_LEVELS, type LadderLevel } from "./action-autonomy";

describe("catalog registration — send_email + send_sms migrated in", () => {
  it("registers send_email + send_sms with identical comms semantics", () => {
    const email = getActionDef("send_email");
    const sms = getActionDef("send_sms");
    expect(email).toBeDefined();
    expect(sms).toBeDefined();
    // Both are T2 client-facing, client_pii, consent-gated, same executor binding.
    for (const def of [email!, sms!]) {
      expect(def.tier).toBe("T2");
      expect(def.dataClass).toBe("client_pii");
      expect(def.consentClass).toBe("contact_channel");
      expect(def.executor).toBe("comms_send");
    }
  });

  it("returns undefined for an unregistered kind (fail-closed)", () => {
    expect(getActionDef("rm_minus_rf")).toBeUndefined();
    expect(isRegisteredAction("rm_minus_rf")).toBe(false);
  });

  it("lists the registered kinds + defs", () => {
    expect(listActionKinds()).toEqual(expect.arrayContaining(["send_email", "send_sms"]));
    expect(listActionDefs().map((d) => d.kind)).toEqual(expect.arrayContaining(["send_email", "send_sms"]));
  });

  it("labels a kind from the catalog, falling back to the raw kind", () => {
    expect(actionLabel("send_email")).toBe("Send email");
    expect(actionLabel("send_sms")).toBe("Send SMS");
    expect(actionLabel("not_a_kind")).toBe("not_a_kind");
  });
});

describe("Threads outbound — publish_threads + reply_threads (ADR-0125 D3 / #1337)", () => {
  it("registers both as T3 customer-facing, non-consent, threads_publish executor", () => {
    const publish = getActionDef("publish_threads");
    const reply = getActionDef("reply_threads");
    expect(publish).toBeDefined();
    expect(reply).toBeDefined();
    for (const def of [publish!, reply!]) {
      // Public Threads post/reply is customer-facing → HARD ceiling (ADR-0109/0121): T3.
      expect(def.tier).toBe("T3");
      // Broadcast on our own presence — not a 1:1 contact send → no consent gate.
      expect(def.consentClass).toBe("none");
      expect(def.executor).toBe("threads_publish");
    }
  });

  it("validates a publish payload + rejects an empty post", () => {
    const def = getActionDef("publish_threads")!;
    expect(validateInput(def.schema, { text: "Hello Threads" })).toEqual({ ok: true });
    const bad = validateInput(def.schema, { text: "   " });
    expect(bad.ok).toBe(false);
  });

  it("a reply requires both replyToId and text", () => {
    const r = resolveAction({ kind: "reply_threads", text: "thanks!" }); // missing replyToId
    expect(r.ok).toBe(false);
    const ok = resolveAction({ kind: "reply_threads", replyToId: "ext-1", text: "thanks!" });
    expect(ok.ok && ok.mode === "registered").toBe(true);
  });
});

describe("validateInput — schema validation rejects bad input", () => {
  const def = getActionDef("send_email")!;

  it("accepts a well-formed payload", () => {
    expect(
      validateInput(def.schema, { contactId: "c1", channel: "email", body: "Hi", subject: "Hello" }),
    ).toEqual({ ok: true });
  });

  it("accepts a payload omitting an optional field", () => {
    expect(validateInput(def.schema, { contactId: "c1", channel: "email", body: "Hi" })).toEqual({
      ok: true,
    });
  });

  it("rejects a missing required field", () => {
    const r = validateInput(def.schema, { contactId: "c1", channel: "email" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("missing required field: body");
  });

  it("rejects an empty required string", () => {
    const r = validateInput(def.schema, { contactId: "c1", channel: "email", body: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("field body must not be empty");
  });

  it("rejects an out-of-enum value", () => {
    const r = validateInput(def.schema, { contactId: "c1", channel: "carrier_pigeon", body: "Hi" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("channel"))).toBe(true);
  });

  it("rejects a wrong-typed field", () => {
    const r = validateInput(def.schema, { contactId: 42, channel: "email", body: "Hi" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("field contactId must be a string");
  });

  it("rejects a non-object input", () => {
    expect(validateInput(def.schema, "nope").ok).toBe(false);
    expect(validateInput(def.schema, null).ok).toBe(false);
    expect(validateInput(def.schema, [1, 2]).ok).toBe(false);
  });

  it("allows unknown extra fields (backend is the authoritative validator)", () => {
    expect(
      validateInput(def.schema, { contactId: "c1", channel: "email", body: "Hi", extra: "ok" }),
    ).toEqual({ ok: true });
  });
});

describe("resolveAction — registry dispatch", () => {
  it("resolves a registered, valid action to its def", () => {
    const r = resolveAction({ kind: "send_sms", contactId: "c1", channel: "sms", body: "Hi" });
    expect(r.ok).toBe(true);
    if (r.ok && r.mode === "registered") expect(r.def.kind).toBe("send_sms");
    else throw new Error("expected registered mode");
  });

  it("passes an unregistered kind through to the backend (forward-verbatim, #1130)", () => {
    const r = resolveAction({ kind: "wire_money", amount: 1000 });
    expect(r.ok).toBe(true);
    if (r.ok && r.mode === "passthrough") expect(r.kind).toBe("wire_money");
    else throw new Error("expected passthrough mode");
  });

  it("refuses a REGISTERED kind with an invalid payload (caught before the round-trip)", () => {
    const r = resolveAction({ kind: "send_email", channel: "email" }); // missing contactId + body
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("invalid");
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });

  it("passes a payload with no kind through (unknown → backend decides)", () => {
    const r = resolveAction({ contactId: "c1" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mode).toBe("passthrough");
  });
});

describe("no-endpoint-edit property — a new action is a catalog entry alone (#994 acceptance)", () => {
  it("dispatches a freshly-registered fixture action through the SAME resolve path", () => {
    const fixture: ActionDef = {
      kind: "create_followup_task",
      label: "Create follow-up task",
      tier: "T1",
      dataClass: "operational",
      consentClass: "none",
      autoAtLevel: 2, // internal reversible write → L2 (auto-internal)
      alwaysGate: false,
      executor: "task_create",
      schema: {
        title: { type: "string", required: true },
        dueInDays: { type: "number", required: false },
      },
    };

    // Before registration: the kind is unknown to the front end → passthrough (backend decides).
    const before = resolveAction({ kind: "create_followup_task", title: "Call back" });
    expect(before.ok && before.mode === "passthrough").toBe(true);

    // Adding the action is ONE catalog entry — no change to resolveAction / the approval path.
    registerActionDef(fixture);

    expect(isRegisteredAction("create_followup_task")).toBe(true);
    expect(actionLabel("create_followup_task")).toBe("Create follow-up task");

    // Now it's a first-class registered action: validated + dispatched by the SAME resolve path.
    const ok = resolveAction({ kind: "create_followup_task", title: "Call back", dueInDays: 3 });
    expect(ok.ok).toBe(true);
    if (ok.ok && ok.mode === "registered") expect(ok.def.executor).toBe("task_create");
    else throw new Error("expected registered mode");

    // The same schema validation now governs the fixture, with no bespoke code.
    const bad = resolveAction({ kind: "create_followup_task", dueInDays: 3 }); // missing title
    expect(bad.ok).toBe(false);
  });
});

describe("catalog registration — the 11 Social Action kinds (ADR-0124 #4, #1358)", () => {
  const ORGANIC = [
    "social_publish_fb_post",
    "social_reply_fb_comment",
    "social_publish_ig_media",
    "social_reply_ig_comment",
    "social_reply_ig_direct",
    "social_post_threads",
    "social_reply_threads",
  ];
  const MONEY = ["social_boost_post", "social_ad_deploy", "social_ad_pause", "social_ad_rebudget"];

  it("registers all 11 kinds as T3 customer-facing, consentClass none, social_dispatch executor", () => {
    for (const kind of [...ORGANIC, ...MONEY]) {
      const def = getActionDef(kind);
      expect(def, kind).toBeDefined();
      expect(def!.tier).toBe("T3");
      expect(def!.consentClass).toBe("none");
      expect(def!.executor).toBe("social_dispatch");
    }
  });

  it("classes the 7 organic kinds client_pii and the 4 ad kinds financial (ADR-0109 money ceiling)", () => {
    for (const kind of ORGANIC) expect(getActionDef(kind)!.dataClass, kind).toBe("client_pii");
    for (const kind of MONEY) expect(getActionDef(kind)!.dataClass, kind).toBe("financial");
  });

  it("validates a publish/reply/boost payload through the same resolve path", () => {
    expect(resolveAction({ kind: "social_publish_fb_post", socialPostId: "p1" }).ok).toBe(true);
    expect(resolveAction({ kind: "social_reply_fb_comment", engagementId: "e1", text: "hi" }).ok).toBe(true);
    expect(resolveAction({ kind: "social_boost_post", socialPostId: "p1", budgetUsd: 50 }).ok).toBe(true);
    // A registered kind with a malformed payload is refused locally before any round-trip.
    expect(resolveAction({ kind: "social_publish_fb_post" }).ok).toBe(false); // missing socialPostId
    expect(resolveAction({ kind: "social_boost_post", socialPostId: "p1" }).ok).toBe(false); // missing budgetUsd
  });
});

describe("ADR-0128 ladder tags — auto_at_level + always_gate (#1412)", () => {
  const MONEY = ["social_boost_post", "social_ad_deploy", "social_ad_pause", "social_ad_rebudget"];

  it("every registered def carries a valid ladder rung (0–5) and a boolean always_gate", () => {
    for (const def of listActionDefs()) {
      expect(LADDER_LEVELS, def.kind).toContain(def.autoAtLevel);
      expect(typeof def.alwaysGate, def.kind).toBe("boolean");
    }
  });

  it("the four money/ad kinds set the dial-proof always_gate (ADR-0109 hard money ceiling)", () => {
    for (const kind of MONEY) expect(getActionDef(kind)!.alwaysGate, kind).toBe(true);
  });

  it("the 1:1 comms sends are L3 (auto-low-risk-external), not always-gated", () => {
    for (const kind of ["send_email", "send_sms"]) {
      expect(getActionDef(kind)!.autoAtLevel, kind).toBe(3);
      expect(getActionDef(kind)!.alwaysGate, kind).toBe(false);
    }
  });

  it("selectActuation implements D4: auto IFF dial ≥ auto_at_level AND NOT always_gate", () => {
    const email = getActionDef("send_email")!; // L3, not gated
    expect(selectActuation(email, 2)).toBe("park"); // below floor
    expect(selectActuation(email, 3)).toBe("auto"); // at floor
    expect(selectActuation(email, 5)).toBe("auto"); // above floor
  });

  it("an always_gate action parks at EVERY level — the ceiling is dial-proof", () => {
    const boost = getActionDef("social_boost_post")!; // always_gate
    for (const dial of LADDER_LEVELS) {
      expect(selectActuation(boost, dial as LadderLevel), `dial ${dial}`).toBe("park");
    }
  });

  it("a high-floor organic kind parks until the dial reaches its rung", () => {
    const fb = getActionDef("social_publish_fb_post")!; // L5, not gated
    expect(selectActuation(fb, 4)).toBe("park");
    expect(selectActuation(fb, 5)).toBe("auto");
  });
});
