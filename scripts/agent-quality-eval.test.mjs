// Pure-check suite for the scripted agent-quality eval (ADR-0057, issue #186).
//
// These tests assert the GATE ARTIFACT is well-formed and run GREEN in CI with NO
// backend: the criteria are total/consistent over the nine gold entity types, the
// per-response verdict logic is correct, and the pending-results document has the right
// shape with every live check marked pending (not failed) when no backend is configured.
// The LIVE checks (orchestrator/board/RAG over HTTP) are intentionally NOT exercised
// here — they are guarded on AGENT_EVAL_BASE_URL and run via `npm run eval` against a
// configured backend before the v1 cut.

import { describe, it, expect } from "vitest";
import {
  NINE_GOLD_ENTITY_TYPES,
  ENTITY_CRITERIA,
  BOARD_CRITERIA,
  RAG_CRITERIA,
  CHECK,
  validateCriteria,
  criteriaAreValid,
  evaluateOrchestratorAnswer,
  evaluateBoardSession,
  evaluateRagSpotCheck,
  buildPendingResults,
} from "./agent-quality-eval.mjs";

describe("the nine gold entity types", () => {
  it("matches migration 0045's entity_type set exactly", () => {
    // db/migrations/0045_gold_knowledge_vectors.sql — the gate's nine (itglue_doc/… excluded).
    expect([...NINE_GOLD_ENTITY_TYPES].sort()).toEqual(
      ["account", "assessment", "contact", "contract", "device", "exposure", "posture", "proposal", "ticket"].sort(),
    );
    expect(NINE_GOLD_ENTITY_TYPES).toHaveLength(9);
  });
});

describe("ENTITY_CRITERIA — the gate's pass-criteria cards", () => {
  it("is well-formed and TOTAL over the nine gold entity types (headline invariant)", () => {
    expect(validateCriteria()).toEqual([]);
    expect(criteriaAreValid()).toBe(true);
  });

  it("has exactly one card per gold entity type — no gaps, extras, or duplicates", () => {
    const covered = ENTITY_CRITERIA.map((c) => c.entityType).sort();
    expect(covered).toEqual([...NINE_GOLD_ENTITY_TYPES].sort());
  });

  it("gives every card a distinct, meaningful trigger query", () => {
    const queries = ENTITY_CRITERIA.map((c) => c.triggerQuery);
    expect(new Set(queries).size).toBe(queries.length);
    for (const c of ENTITY_CRITERIA) expect(c.triggerQuery.trim().length).toBeGreaterThanOrEqual(8);
  });

  it("uses lower-cased keywords (the answer match is case-insensitive)", () => {
    for (const c of ENTITY_CRITERIA)
      for (const kw of c.expectKeywords) expect(kw).toBe(kw.toLowerCase());
  });
});

describe("validateCriteria — detects malformed criteria sets", () => {
  it("flags a missing gold entity type", () => {
    const dropped = ENTITY_CRITERIA.filter((c) => c.entityType !== "posture");
    const errs = validateCriteria(dropped);
    expect(errs.some((e) => e.includes("missing pass-criteria card for gold entity type 'posture'"))).toBe(true);
  });

  it("flags an entity type that is not one of the nine", () => {
    const extra = [...ENTITY_CRITERIA, { ...ENTITY_CRITERIA[0], entityType: "itglue_doc" }];
    const errs = validateCriteria(extra);
    expect(errs.some((e) => e.includes("itglue_doc") && e.includes("not one of the nine"))).toBe(true);
  });

  it("flags a duplicate entity type", () => {
    const dup = [...ENTITY_CRITERIA, ENTITY_CRITERIA[0]];
    expect(validateCriteria(dup).some((e) => e.includes("duplicate entityType"))).toBe(true);
  });

  it("flags an upper-cased keyword", () => {
    const bad = ENTITY_CRITERIA.map((c, i) => (i === 0 ? { ...c, expectKeywords: ["Account"] } : c));
    expect(validateCriteria(bad).some((e) => e.includes("lower-cased"))).toBe(true);
  });

  it("flags duplicate trigger queries", () => {
    const same = ENTITY_CRITERIA.map((c) => ({ ...c, triggerQuery: "same query for everyone right here" }));
    expect(validateCriteria(same).some((e) => e.includes("distinct"))).toBe(true);
  });
});

describe("evaluateOrchestratorAnswer — per-response verdict (pure, no backend)", () => {
  const account = ENTITY_CRITERIA.find((c) => c.entityType === "account");

  it("passes a well-routed, keyword-bearing, cited answer", () => {
    const r = evaluateOrchestratorAnswer(account, {
      text: "The Contoso account has two open opportunities.",
      routedTo: "crm-agent",
      citations: [{ entityType: "account" }],
    });
    expect(r).toEqual({ pass: true, reasons: [] });
  });

  it("fails on wrong routing", () => {
    const r = evaluateOrchestratorAnswer(account, {
      text: "The Contoso account ...",
      routedTo: "posture-agent",
      citations: [{ entityType: "account" }],
    });
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.includes("expected to include 'crm'"))).toBe(true);
  });

  it("fails on a missing keyword", () => {
    const r = evaluateOrchestratorAnswer(account, {
      text: "We have some open work here.",
      routedTo: "crm",
      citations: [{ entityType: "account" }],
    });
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.includes("keyword"))).toBe(true);
  });

  it("fails when citations are required but absent", () => {
    const r = evaluateOrchestratorAnswer(account, {
      text: "The Contoso account is healthy.",
      routedTo: "crm",
      citations: [],
    });
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.includes("citation"))).toBe(true);
  });
});

describe("evaluateBoardSession — board verdict (pure)", () => {
  it("passes a terminal session with a recommendation", () => {
    expect(evaluateBoardSession({ status: "complete", recommendation: "Expand the offering." })).toEqual({
      pass: true,
      reasons: [],
    });
  });

  it("fails a non-terminal status", () => {
    const r = evaluateBoardSession({ status: "running", recommendation: "x" });
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.includes("terminal"))).toBe(true);
  });

  it("fails an empty recommendation", () => {
    const r = evaluateBoardSession({ status: "complete", recommendation: "  " });
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.includes("recommendation"))).toBe(true);
  });
});

describe("evaluateRagSpotCheck — citation grounding (pure)", () => {
  const spot = RAG_CRITERIA.spotChecks[0]; // contract

  it("passes when a citation of the expected entity_type is present", () => {
    expect(evaluateRagSpotCheck(spot, { citations: [{ entity_type: "contract" }] })).toEqual({
      pass: true,
      reasons: [],
    });
  });

  it("accepts either entityType or entity_type casing on the citation", () => {
    expect(evaluateRagSpotCheck(spot, { citations: [{ entityType: "Contract" }] }).pass).toBe(true);
  });

  it("fails when no citation matches the expected entity_type", () => {
    const r = evaluateRagSpotCheck(spot, { citations: [{ entity_type: "ticket" }] });
    expect(r.pass).toBe(false);
    expect(r.reasons.some((x) => x.includes("contract"))).toBe(true);
  });

  it("fails when there are no citations at all", () => {
    expect(evaluateRagSpotCheck(spot, { citations: [] }).pass).toBe(false);
  });
});

describe("buildPendingResults — the emitted artifact when no backend is configured", () => {
  const results = buildPendingResults({ baseUrl: null, criteriaValid: criteriaAreValid() });

  it("records the pure criteria check as PASS", () => {
    expect(results.checks.criteriaWellFormed.status).toBe(CHECK.PASS);
  });

  it("marks every live check PENDING (not fail) — keeps CI green", () => {
    for (const v of Object.values(results.checks.orchestratorNineTypes))
      expect(v.status).toBe(CHECK.PENDING_NO_BACKEND);
    expect(results.checks.boardSession.status).toBe(CHECK.PENDING_NO_BACKEND);
    for (const v of Object.values(results.checks.ragSpotChecks))
      expect(v.status).toBe(CHECK.PENDING_NO_BACKEND);
  });

  it("covers all nine entity types + board + every RAG spot-check in the pending set", () => {
    expect(Object.keys(results.checks.orchestratorNineTypes).sort()).toEqual(
      [...NINE_GOLD_ENTITY_TYPES].sort(),
    );
    expect(Object.keys(results.checks.ragSpotChecks)).toHaveLength(RAG_CRITERIA.spotChecks.length);
  });

  it("never leaks a backend URL into the artifact", () => {
    expect(JSON.stringify(results)).not.toMatch(/https?:\/\//);
    expect(results).not.toHaveProperty("baseUrl");
  });

  it("counts the pending checks correctly (nine + board + rag)", () => {
    expect(results.summary.pending).toBe(ENTITY_CRITERIA.length + 1 + RAG_CRITERIA.spotChecks.length);
    expect(results.backendConfigured).toBe(false);
  });
});

describe("BOARD_CRITERIA / RAG_CRITERIA — sanity", () => {
  it("the board packet signals reflect a real packet (reporting + campaign + posture)", () => {
    expect(BOARD_CRITERIA.expectPacketSignals).toEqual(expect.arrayContaining(["reporting", "campaign", "posture"]));
  });

  it("the RAG spot-checks span distinct gold entity types within the nine", () => {
    const types = RAG_CRITERIA.spotChecks.map((s) => s.expectEntityType);
    expect(new Set(types).size).toBe(types.length);
    for (const t of types) expect(NINE_GOLD_ENTITY_TYPES).toContain(t);
  });
});
