import { describe, it, expect } from "vitest";
import {
  validateShape,
  checkSubset,
  evaluateManifest,
  parseAgentYaml,
  parseCoverageMatrix,
  checkRoomResolution,
  VALID_MODELS,
} from "./agent-yaml-gate.mjs";

/** A minimal valid manifest (CONVENTIONS example shape). */
const valid = () => ({
  name: "expense-close",
  model: "claude-opus-4-8",
  system_compose: ["../../CONSTITUTION.md", "../room.md", "./prose.md"],
  okf_rooms: ["expense_item", "expense_report"],
  tools: ["pg.read", "autotask.expense.write"],
  skills: ["icm/skills/voice-and-tone", "./skills/categories"],
  autonomy_rung: "L2",
  auto_may_self_approve: "clean-audit reimbursements with existing mapping",
});

describe("validateShape", () => {
  it("accepts a well-formed manifest", () => {
    expect(validateShape(valid())).toEqual([]);
  });

  it("rejects a non-object", () => {
    expect(validateShape(null)).toEqual(["manifest must be a YAML mapping"]);
    expect(validateShape([])[0]).toMatch(/mapping/);
  });

  it("requires a kebab-case name", () => {
    const m = valid();
    m.name = "Expense_Close";
    expect(validateShape(m)).toContain("'name' must be kebab-case (got 'Expense_Close')");
  });

  it("rejects an off-stack model", () => {
    const m = valid();
    m.model = "gpt-4o";
    expect(validateShape(m).some((e) => e.includes("settled-stack model"))).toBe(true);
  });

  it("only accepts the settled-stack models", () => {
    for (const model of VALID_MODELS) {
      const m = valid();
      m.model = model;
      expect(validateShape(m)).toEqual([]);
    }
  });

  it("requires system_compose to start at CONSTITUTION.md", () => {
    const m = valid();
    m.system_compose = ["../room.md", "./prose.md", "./extra.md"];
    expect(validateShape(m).some((e) => e.includes("begin with CONSTITUTION.md"))).toBe(true);
  });

  it("requires system_compose to end at the workflow prose", () => {
    const m = valid();
    m.system_compose = ["../../CONSTITUTION.md", "../room.md", "./mid.md"];
    expect(validateShape(m).some((e) => e.includes("end at the workflow prose"))).toBe(true);
  });

  it("requires at least the three composition tiers", () => {
    const m = valid();
    m.system_compose = ["../../CONSTITUTION.md", "./prose.md"];
    expect(validateShape(m).some((e) => e.includes("at least"))).toBe(true);
  });

  it("rejects an invalid autonomy_rung", () => {
    const m = valid();
    m.autonomy_rung = "L9";
    expect(validateShape(m).some((e) => e.includes("autonomy_rung"))).toBe(true);
  });

  it("rejects duplicate tools", () => {
    const m = valid();
    m.tools = ["pg.read", "pg.read"];
    expect(validateShape(m).some((e) => e.includes("duplicate"))).toBe(true);
  });

  it("rejects an inline secret on an mcp_servers entry", () => {
    const m = valid();
    m.mcp_servers = [{ name: "docusign", token: "shhh" }];
    expect(validateShape(m).some((e) => e.includes("vault_secret_ref"))).toBe(true);
  });

  it("accepts an mcp_servers entry that uses a vault reference", () => {
    const m = valid();
    m.mcp_servers = [{ name: "docusign", vault_secret_ref: "kv://docusign-oauth" }];
    expect(validateShape(m)).toEqual([]);
  });
});

describe("checkSubset", () => {
  it("passes when workflow ⊆ domain ⊆ constitution", () => {
    expect(
      checkSubset("tools", ["a"], ["a", "b"], ["a", "b", "c"]),
    ).toEqual([]);
  });

  it("fails when the workflow widens past the domain", () => {
    const errs = checkSubset("tools", ["a", "z"], ["a", "b"], ["a", "b", "z"]);
    expect(errs.some((e) => e.includes("'z' is not in the domain allow-list"))).toBe(true);
  });

  it("fails when the domain itself exceeds the constitution", () => {
    const errs = checkSubset("okf_rooms", ["a"], ["a", "b"], ["a"]);
    expect(errs.some((e) => e.includes("outside the Constitution"))).toBe(true);
  });
});

describe("evaluateManifest", () => {
  const budgets = {
    domainTools: ["pg.read", "autotask.expense.write", "qbo.read"],
    domainRooms: ["expense_item", "expense_report", "employee"],
    constitutionTools: ["pg.read", "autotask.expense.write", "qbo.read", "graph.send"],
    constitutionRooms: ["expense_item", "expense_report", "employee", "account"],
  };

  it("passes a conformant manifest within its domain budget", () => {
    const r = evaluateManifest({ manifest: valid(), ...budgets, label: "wf/agent.yaml" });
    expect(r).toEqual({ ok: true, errors: [] });
  });

  it("FAILS a tool not in the domain allow-list (the headline invariant)", () => {
    const m = valid();
    m.tools = ["pg.read", "graph.send"]; // graph.send is in constitution but NOT the domain
    const r = evaluateManifest({ manifest: m, ...budgets, label: "wf/agent.yaml" });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("wf/agent.yaml") && e.includes("graph.send"))).toBe(true);
  });

  it("FAILS an okf_room not in the domain allow-list", () => {
    const m = valid();
    m.okf_rooms = ["expense_item", "account"]; // account is constitution-wide, not this domain's
    const r = evaluateManifest({ manifest: m, ...budgets });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("account"))).toBe(true);
  });

  it("surfaces shape and subset errors together", () => {
    const m = valid();
    m.model = "gpt-4o";
    m.tools = ["graph.send"];
    const r = evaluateManifest({ manifest: m, ...budgets });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("settled-stack model"))).toBe(true);
    expect(r.errors.some((e) => e.includes("graph.send"))).toBe(true);
  });
});

// A trimmed coverage-matrix fixture covering each shape the parser must handle:
// linked object cells, plain (unlinked) cells, `→` / comma suffixes, ✅ vs ⏳.
const MATRIX_MD = [
  "# Master coverage matrix",
  "",
  "| Object | Domain | Archetype | IKF | Acting ICM workflow |",
  "|---|---|---|---|---|",
  "| [account](tables/account.md) | kernel | A | ✅ | research |",
  "| [contact](tables/contact.md) | kernel | A | ✅ | lead-response |",
  "| [opportunity](tables/opportunity.md) | Sales | A | ✅ | sale→delivery |",
  "| [interaction](tables/interaction.md) | Knowledge | B (+ gold) | ✅ | research |",
  "| [consent_event](tables/consent_event.md) → current_consent | horizontal | C → F | ✅ | gates sends |",
  "| [lead_score](tables/lead_score.md) | Marketing | C | ✅ | lead scoring |",
  "| [campaign](tables/campaign.md) | Marketing | B | ✅ | lead-response |",
  "| external_identity | horizontal | H | ⏳ | identity resolution |",
  "| sbr_dimension_score, sbr_ticket | Customer Success | B | ⏳ | SBR-prep |",
].join("\n");

describe("parseCoverageMatrix", () => {
  const m = parseCoverageMatrix(MATRIX_MD);

  it("indexes linked objects with domain and concept status", () => {
    expect(m.account).toEqual({ domain: "kernel", hasConcept: true });
    expect(m.interaction).toEqual({ domain: "Knowledge", hasConcept: true });
  });

  it("keys a `→`-suffixed object on its first identifier", () => {
    expect(m.consent_event).toEqual({ domain: "horizontal", hasConcept: true });
    expect(m.current_consent).toBeUndefined();
  });

  it("keys a comma-list object on the first name only", () => {
    expect(m.sbr_dimension_score).toEqual({ domain: "Customer Success", hasConcept: false });
    expect(m.sbr_ticket).toBeUndefined();
  });

  it("marks a plain (unlinked) ⏳ object as concept-less", () => {
    expect(m.external_identity).toEqual({ domain: "horizontal", hasConcept: false });
  });

  it("does not index the header or separator rows", () => {
    expect(m.object).toBeUndefined();
  });
});

describe("checkRoomResolution", () => {
  const m = parseCoverageMatrix(MATRIX_MD);

  it("passes when every room resolves to a concept-bearing matrix row", () => {
    expect(checkRoomResolution(["contact", "account", "interaction"], m)).toEqual([]);
  });

  it("FAILS an okf_room that does not resolve to any matrix object (typo/phantom)", () => {
    const errs = checkRoomResolution(["contact", "contactt"], m);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain("'contactt' does not resolve");
  });

  it("FAILS an okf_room whose matrix row has no concept file (IKF ≠ ✅)", () => {
    const errs = checkRoomResolution(["external_identity"], m);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain("no concept file");
  });
});

describe("evaluateManifest — room resolution (#702)", () => {
  const matrix = parseCoverageMatrix(MATRIX_MD);
  const budgets = {
    domainTools: ["pg.read"],
    domainRooms: ["contact", "account", "interaction", "made_up_room"],
    constitutionTools: ["pg.read"],
    constitutionRooms: ["contact", "account", "interaction", "made_up_room"],
  };
  const manifest = () => ({
    name: "lead-response",
    model: "claude-sonnet-4-5",
    system_compose: ["../../../CONSTITUTION.md", "../room.md", "./prose.md"],
    tools: ["pg.read"],
    okf_rooms: ["contact", "account", "interaction"],
    autonomy_rung: "L1",
  });

  it("passes when all rooms resolve in the matrix", () => {
    const r = evaluateManifest({ manifest: manifest(), ...budgets, matrix, label: "wf/agent.yaml" });
    expect(r).toEqual({ ok: true, errors: [] });
  });

  it("FAILS a room that is in-budget but does not resolve in the matrix", () => {
    const mft = manifest();
    mft.okf_rooms = ["contact", "made_up_room"]; // in the domain budget, absent from matrix
    const r = evaluateManifest({ manifest: mft, ...budgets, matrix, label: "wf/agent.yaml" });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("wf/agent.yaml") && e.includes("made_up_room"))).toBe(true);
  });

  it("skips room resolution when no matrix is supplied (back-compat)", () => {
    const r = evaluateManifest({ manifest: manifest(), ...budgets, label: "wf/agent.yaml" });
    expect(r).toEqual({ ok: true, errors: [] });
  });
});

describe("parseAgentYaml", () => {
  it("parses scalars, flow sequences, and block sequences", () => {
    const yaml = [
      "name: expense-close",
      "model: claude-opus-4-8",
      "okf_rooms: [expense_item, expense_report]",
      "system_compose:",
      "  - ../../CONSTITUTION.md",
      "  - ../room.md",
      "  - ./prose.md",
      "autonomy_rung: L2",
    ].join("\n");
    const o = parseAgentYaml(yaml);
    expect(o.name).toBe("expense-close");
    expect(o.okf_rooms).toEqual(["expense_item", "expense_report"]);
    expect(o.system_compose).toEqual(["../../CONSTITUTION.md", "../room.md", "./prose.md"]);
    expect(o.autonomy_rung).toBe("L2");
  });

  it("strips trailing comments and quotes", () => {
    const o = parseAgentYaml(`name: "lead-response"  # the pilot\ntools: []`);
    expect(o.name).toBe("lead-response");
    expect(o.tools).toEqual([]);
  });

  it("round-trips into a valid manifest", () => {
    const yaml = [
      "name: expense-close",
      "model: claude-opus-4-8",
      "system_compose:",
      "  - ../../CONSTITUTION.md",
      "  - ../room.md",
      "  - ./prose.md",
      "tools: [pg.read]",
      "okf_rooms: [expense_item]",
      "autonomy_rung: L2",
    ].join("\n");
    expect(validateShape(parseAgentYaml(yaml))).toEqual([]);
  });
});
