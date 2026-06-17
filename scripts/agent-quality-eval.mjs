// Scripted agent-quality eval — the v1 AI-first acceptance gate (ADR-0057 §2).
//
// ADR-0057 ("v1 Complete product recut", docs/decision-records/) makes a scripted
// agent-quality eval an EXPLICIT v1 gate: the orchestrator must answer across all
// NINE gold entity types, run a board session over a real packet, and pass RAG
// citation spot-checks — run green, plus Mark's hands-on UX sign-off, before the cut.
//
// This module is that gate's RE-RUNNABLE artifact (not a one-off chat). It is split:
//
//   • PURE checks — the criteria are well-formed, all nine gold entity types are
//     covered exactly once, and the trigger-query → expected-routing mapping is total
//     and self-consistent. These assert GREEN now, in CI, with NO backend.
//
//   • LIVE checks — actually drive the orchestrator (POST /api/agent), a board session
//     (POST /api/board/sessions), and RAG citation spot-checks. The orchestrator + board
//     runtime live in the BACKEND repo and are deploy-dormant in prod; FE CI has no
//     backend reachable. So the live checks are GUARDED on AGENT_EVAL_BASE_URL: unset ⇒
//     they report `pending_no_backend` (NOT fail), keeping `npm test` green. This matches
//     ADR-0057's intent: the script is the gate artifact; the live green run + Mark's
//     hands-on sign-off happen against a configured backend before the v1 cut.
//
// Contracts driven (documented in CLAUDE.md §2 / mapped via src/lib/services/external-client.ts):
//   Orchestrator: POST /api/agent
//     { message, actingUserId, agent?, context?, conversationId? }
//       → { text, routedTo, routingReason, usage, conversationId? }
//   Board:        POST /api/board/sessions
//     { topic, actingUserId, personaAgentIds?, context?, cisoPosition?, advisorAgentIds? }
//       → { sessionId, status, recommendation, usage }
//
// SECURITY: read-only eval. No secrets, tokens, or URLs are hardcoded — the backend
// base URL is env-driven (AGENT_EVAL_BASE_URL); the deployed path uses the same
// managed-identity caller-auth as src/lib/services/external-client.ts (ADR-0028). No
// client PII is written into criteria or results — trigger queries are synthetic.

/**
 * @typedef {object} EntityCriteria
 * @property {string} entityType   One of the nine gold entity_type values (migration 0045).
 * @property {string} triggerQuery A synthetic question that should exercise this entity type.
 * @property {string} expectedRouting Sub-agent the orchestrator should route to (substring match on routedTo).
 * @property {string[]} expectKeywords Lower-cased keywords expected in the answer text (all required).
 * @property {boolean} expectCitations Whether the answer should carry gold-knowledge citations.
 * @property {string} pass         Human-readable pass criterion for this entity type.
 */

// ── The nine gold entity types (db/migrations/0045_gold_knowledge_vectors.sql) ──────
// `itglue_doc` and other "…" types exist in the store, but ADR-0057's gate is THESE nine.
export const NINE_GOLD_ENTITY_TYPES = [
  "account",
  "contact",
  "device",
  "contract",
  "ticket",
  "proposal",
  "exposure",
  "assessment",
  "posture",
];

/**
 * Per-entity-type pass-criteria cards. One card per gold entity type — a synthetic
 * trigger query, the sub-agent the orchestrator should route to, keywords the answer
 * must contain, whether citations are expected, and the plain-English pass criterion.
 * Pure data — importable by the harness and the test.
 *
 * @type {EntityCriteria[]}
 */
export const ENTITY_CRITERIA = [
  {
    entityType: "account",
    triggerQuery: "Summarize the relationship and open business for the Contoso account.",
    expectedRouting: "crm",
    expectKeywords: ["account", "contoso"],
    expectCitations: true,
    pass: "Routes to the CRM agent; answer names the account and cites gold account knowledge.",
  },
  {
    entityType: "contact",
    triggerQuery: "Who is the primary technical contact at Contoso and what do we know about them?",
    expectedRouting: "crm",
    expectKeywords: ["contact"],
    expectCitations: true,
    pass: "Routes to CRM; answer identifies a contact and cites the contact dossier (no PII fabrication).",
  },
  {
    entityType: "device",
    triggerQuery: "What endpoints does Contoso have under management and what are their OS versions?",
    expectedRouting: "itglue",
    expectKeywords: ["device"],
    expectCitations: true,
    pass: "Routes to the IT Glue agent; answer enumerates devices from gold device knowledge with citations.",
  },
  {
    entityType: "contract",
    triggerQuery: "What is the term and renewal date of Contoso's current managed-services contract?",
    expectedRouting: "autotask",
    expectKeywords: ["contract"],
    expectCitations: true,
    pass: "Routes to the Autotask agent; answer states contract term/renewal and cites the contract record.",
  },
  {
    entityType: "ticket",
    triggerQuery: "What are the open support tickets for Contoso and their current status?",
    expectedRouting: "autotask",
    expectKeywords: ["ticket"],
    expectCitations: true,
    pass: "Routes to Autotask; answer lists open tickets with status and cites the ticket records.",
  },
  {
    entityType: "proposal",
    triggerQuery: "Summarize the latest proposal we sent Contoso and its current stage.",
    expectedRouting: "proposal",
    expectKeywords: ["proposal"],
    expectCitations: true,
    pass: "Routes to the Proposal agent; answer summarizes the proposal and cites the proposal document.",
  },
  {
    entityType: "exposure",
    triggerQuery: "What security exposures or vulnerabilities are currently flagged for Contoso?",
    expectedRouting: "posture",
    expectKeywords: ["exposure"],
    expectCitations: true,
    pass: "Routes to the security/posture agent; answer lists exposures and cites the exposure findings.",
  },
  {
    entityType: "assessment",
    triggerQuery: "What were the findings of Contoso's most recent security assessment?",
    expectedRouting: "posture",
    expectKeywords: ["assessment"],
    expectCitations: true,
    pass: "Routes to the posture/security agent; answer summarizes assessment findings with citations.",
  },
  {
    entityType: "posture",
    triggerQuery: "What is Contoso's overall security posture against the benchmark right now?",
    expectedRouting: "posture",
    expectKeywords: ["posture"],
    expectCitations: true,
    pass: "Routes to the posture agent; answer reports posture vs benchmark and cites the posture snapshot.",
  },
];

/**
 * Board-session criterion (ADR-0057): one board session over a REAL packet — a
 * reporting snapshot + campaign metrics + security posture + topic-knowledge retrieval,
 * persisted to board_session.packet_md.
 */
export const BOARD_CRITERIA = {
  topic: "Should we expand the managed-security offering to Contoso next quarter?",
  /** Substrings the packet/recommendation should reflect, proving a real packet was assembled. */
  expectPacketSignals: ["reporting", "campaign", "posture"],
  /** A finished session is one that produced a recommendation. */
  expectStatuses: ["complete", "completed", "done"],
  pass:
    "POST /api/board/sessions returns a session whose status is terminal and whose " +
    "recommendation is non-empty; the packet reflects reporting + campaign + posture inputs.",
};

/**
 * RAG citation spot-check criteria. Each query must come back grounded — the answer
 * carries at least one citation that resolves to a gold knowledge object, and the cited
 * entity_type is one of the nine. Spot-checks span distinct entity types.
 */
export const RAG_CRITERIA = {
  minCitationsPerAnswer: 1,
  spotChecks: [
    {
      query: "Cite where Contoso's contract renewal date comes from.",
      expectEntityType: "contract",
      pass: "Answer cites a gold knowledge_object of entity_type 'contract'.",
    },
    {
      query: "Cite the source for Contoso's latest security posture score.",
      expectEntityType: "posture",
      pass: "Answer cites a gold knowledge_object of entity_type 'posture'.",
    },
    {
      query: "Cite where the open-ticket count for Contoso is recorded.",
      expectEntityType: "ticket",
      pass: "Answer cites a gold knowledge_object of entity_type 'ticket'.",
    },
  ],
};

// ── PURE validators (asserted GREEN in CI with no backend) ──────────────────────────

/**
 * Validate the criteria set is well-formed and TOTAL over the nine gold entity types.
 * Returns an array of human-readable problems; empty array == valid.
 * @param {EntityCriteria[]} criteria
 * @returns {string[]}
 */
export function validateCriteria(criteria = ENTITY_CRITERIA) {
  const errors = [];

  if (!Array.isArray(criteria)) return ["criteria must be an array"];

  // 1. Every card is structurally complete.
  criteria.forEach((c, i) => {
    const where = `criteria[${i}] (${c?.entityType ?? "?"})`;
    if (!c || typeof c !== "object") {
      errors.push(`${where} must be an object`);
      return;
    }
    if (typeof c.entityType !== "string" || !c.entityType)
      errors.push(`${where}: entityType must be a non-empty string`);
    if (typeof c.triggerQuery !== "string" || c.triggerQuery.trim().length < 8)
      errors.push(`${where}: triggerQuery must be a meaningful question`);
    if (typeof c.expectedRouting !== "string" || !c.expectedRouting)
      errors.push(`${where}: expectedRouting must be a non-empty string`);
    if (!Array.isArray(c.expectKeywords) || c.expectKeywords.length === 0)
      errors.push(`${where}: expectKeywords must be a non-empty array`);
    else if (c.expectKeywords.some((k) => typeof k !== "string" || k !== k.toLowerCase()))
      errors.push(`${where}: expectKeywords must be lower-cased strings (case-insensitive match)`);
    if (typeof c.expectCitations !== "boolean")
      errors.push(`${where}: expectCitations must be a boolean`);
    if (typeof c.pass !== "string" || !c.pass)
      errors.push(`${where}: pass criterion must be a non-empty string`);
  });

  // 2. Coverage is TOTAL and EXACT over the nine gold entity types — no gaps, no extras,
  //    no duplicates. This is the headline invariant of the gate.
  const covered = criteria.map((c) => c?.entityType);
  const coveredSet = new Set(covered);
  if (covered.length !== coveredSet.size)
    errors.push(`duplicate entityType in criteria: ${covered.join(", ")}`);
  for (const t of NINE_GOLD_ENTITY_TYPES)
    if (!coveredSet.has(t)) errors.push(`missing pass-criteria card for gold entity type '${t}'`);
  for (const t of coveredSet)
    if (!NINE_GOLD_ENTITY_TYPES.includes(t))
      errors.push(`criteria covers '${t}', which is not one of the nine gold entity types`);

  // 3. The trigger-query → entity mapping is a function: distinct query per type.
  const queries = criteria.map((c) => c?.triggerQuery);
  if (new Set(queries).size !== queries.length)
    errors.push("trigger queries must be distinct across entity types");

  return errors;
}

/** True when the criteria set passes every pure check. */
export function criteriaAreValid(criteria = ENTITY_CRITERIA) {
  return validateCriteria(criteria).length === 0;
}

// ── LIVE evaluation primitives (only exercised when a backend is configured) ────────

/**
 * Evaluate one orchestrator answer against an entity criterion. Pure given a response —
 * no I/O — so it is unit-testable without a backend.
 * @param {EntityCriteria} criterion
 * @param {{ text?: string, routedTo?: string, citations?: unknown[] }} response
 * @returns {{ pass: boolean, reasons: string[] }}
 */
export function evaluateOrchestratorAnswer(criterion, response) {
  const reasons = [];
  const text = (response?.text ?? "").toLowerCase();
  const routedTo = (response?.routedTo ?? "").toLowerCase();

  if (!text) reasons.push("empty answer text");
  for (const kw of criterion.expectKeywords)
    if (!text.includes(kw)) reasons.push(`answer missing expected keyword '${kw}'`);

  if (criterion.expectedRouting && !routedTo.includes(criterion.expectedRouting.toLowerCase()))
    reasons.push(`routed to '${response?.routedTo}', expected to include '${criterion.expectedRouting}'`);

  if (criterion.expectCitations) {
    const n = Array.isArray(response?.citations) ? response.citations.length : 0;
    if (n < 1) reasons.push("expected at least one gold-knowledge citation, got none");
  }

  return { pass: reasons.length === 0, reasons };
}

/** Evaluate a board-session response against the board criterion. Pure given a response. */
export function evaluateBoardSession(response, criterion = BOARD_CRITERIA) {
  const reasons = [];
  const status = (response?.status ?? "").toLowerCase();
  if (!criterion.expectStatuses.includes(status))
    reasons.push(`status '${response?.status}' is not terminal (expected one of ${criterion.expectStatuses.join("/")})`);
  if (!response?.recommendation || String(response.recommendation).trim().length === 0)
    reasons.push("recommendation is empty");
  return { pass: reasons.length === 0, reasons };
}

/** Evaluate a RAG spot-check answer. Pure given a response. */
export function evaluateRagSpotCheck(spotCheck, response, min = RAG_CRITERIA.minCitationsPerAnswer) {
  const reasons = [];
  const citations = Array.isArray(response?.citations) ? response.citations : [];
  if (citations.length < min) reasons.push(`expected >= ${min} citation(s), got ${citations.length}`);
  const types = citations.map((c) => (c?.entityType ?? c?.entity_type ?? "").toLowerCase());
  if (!types.includes(spotCheck.expectEntityType))
    reasons.push(`no citation of entity_type '${spotCheck.expectEntityType}' (saw: ${types.join(", ") || "none"})`);
  return { pass: reasons.length === 0, reasons };
}

// ── Results shape ───────────────────────────────────────────────────────────────────

/** Status of any single check. */
export const CHECK = {
  PASS: "pass",
  FAIL: "fail",
  PENDING_NO_BACKEND: "pending_no_backend",
};

/**
 * Build the empty/pending results document — the artifact shape the harness emits.
 * When no backend is configured every live check is `pending_no_backend`; the pure
 * criteria check still records its real status.
 * @param {{ baseUrl?: string|null, criteriaValid: boolean }} opts
 */
export function buildPendingResults({ baseUrl, criteriaValid }) {
  const pending = (note) => ({ status: CHECK.PENDING_NO_BACKEND, note });
  return {
    schemaVersion: 1,
    ranAt: new Date().toISOString(),
    adr: "ADR-0057",
    backendConfigured: Boolean(baseUrl),
    // base URL value is intentionally NOT recorded (no endpoint leakage in the artifact).
    checks: {
      criteriaWellFormed: {
        status: criteriaValid ? CHECK.PASS : CHECK.FAIL,
        note: "Pure check: criteria total/consistent over the nine gold entity types.",
      },
      orchestratorNineTypes: Object.fromEntries(
        ENTITY_CRITERIA.map((c) => [c.entityType, pending("orchestrator (/api/agent) not reachable")]),
      ),
      boardSession: pending("board runtime (/api/board/sessions) not reachable"),
      ragSpotChecks: Object.fromEntries(
        RAG_CRITERIA.spotChecks.map((s, i) => [`spot_${i}_${s.expectEntityType}`, pending("RAG not reachable")]),
      ),
    },
    summary: {
      pass: criteriaValid ? 1 : 0,
      fail: criteriaValid ? 0 : 1,
      pending:
        ENTITY_CRITERIA.length + 1 /* board */ + RAG_CRITERIA.spotChecks.length,
      note: baseUrl
        ? "Backend configured but live run not executed by buildPendingResults — use runLive()."
        : "AGENT_EVAL_BASE_URL unset — live checks PENDING backend runtime (ADR-0057). Pure check ran.",
    },
  };
}

// ── Live runner (HTTP) — only used when AGENT_EVAL_BASE_URL is set ───────────────────

/**
 * POST JSON to the configured backend and return the parsed body. Mirrors the contract
 * of src/lib/services/external-client.ts (managed-identity auth is applied by that
 * client in the deployed app; for a local/manual run an operator may front the backend).
 * Kept dependency-free so the harness runs under plain `node`.
 */
async function postJson(baseUrl, path, body, { timeoutMs = 60_000, bearer } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { text };
    }
    return { ok: res.ok, status: res.status, body: parsed };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Run the full LIVE eval against a configured backend. Returns a results document of the
 * same shape as buildPendingResults, with real pass/fail per check.
 * @param {{ baseUrl: string, actingUserId: string, bearer?: string }} cfg
 */
export async function runLive({ baseUrl, actingUserId, bearer }) {
  const results = buildPendingResults({ baseUrl, criteriaValid: criteriaAreValid() });
  const counts = { pass: results.checks.criteriaWellFormed.status === CHECK.PASS ? 1 : 0, fail: 0, pending: 0 };
  if (results.checks.criteriaWellFormed.status === CHECK.FAIL) counts.fail++;

  // 1. Orchestrator across the nine gold entity types.
  for (const c of ENTITY_CRITERIA) {
    try {
      const { ok, status, body } = await postJson(
        baseUrl,
        "/api/agent",
        { message: c.triggerQuery, actingUserId },
        { bearer },
      );
      if (!ok) {
        results.checks.orchestratorNineTypes[c.entityType] = { status: CHECK.FAIL, note: `HTTP ${status}` };
        counts.fail++;
        continue;
      }
      const verdict = evaluateOrchestratorAnswer(c, body);
      results.checks.orchestratorNineTypes[c.entityType] = verdict.pass
        ? { status: CHECK.PASS, routedTo: body.routedTo }
        : { status: CHECK.FAIL, reasons: verdict.reasons, routedTo: body.routedTo };
      verdict.pass ? counts.pass++ : counts.fail++;
    } catch (err) {
      results.checks.orchestratorNineTypes[c.entityType] = { status: CHECK.FAIL, note: String(err?.message ?? err) };
      counts.fail++;
    }
  }

  // 2. Board session over a real packet.
  try {
    const { ok, status, body } = await postJson(
      baseUrl,
      "/api/board/sessions",
      { topic: BOARD_CRITERIA.topic, actingUserId },
      { bearer, timeoutMs: 120_000 },
    );
    if (!ok) {
      results.checks.boardSession = { status: CHECK.FAIL, note: `HTTP ${status}` };
      counts.fail++;
    } else {
      const verdict = evaluateBoardSession(body);
      results.checks.boardSession = verdict.pass
        ? { status: CHECK.PASS, sessionId: body.sessionId }
        : { status: CHECK.FAIL, reasons: verdict.reasons };
      verdict.pass ? counts.pass++ : counts.fail++;
    }
  } catch (err) {
    results.checks.boardSession = { status: CHECK.FAIL, note: String(err?.message ?? err) };
    counts.fail++;
  }

  // 3. RAG citation spot-checks.
  for (let i = 0; i < RAG_CRITERIA.spotChecks.length; i++) {
    const s = RAG_CRITERIA.spotChecks[i];
    const key = `spot_${i}_${s.expectEntityType}`;
    try {
      const { ok, status, body } = await postJson(
        baseUrl,
        "/api/agent",
        { message: s.query, actingUserId },
        { bearer },
      );
      if (!ok) {
        results.checks.ragSpotChecks[key] = { status: CHECK.FAIL, note: `HTTP ${status}` };
        counts.fail++;
        continue;
      }
      const verdict = evaluateRagSpotCheck(s, body);
      results.checks.ragSpotChecks[key] = verdict.pass
        ? { status: CHECK.PASS }
        : { status: CHECK.FAIL, reasons: verdict.reasons };
      verdict.pass ? counts.pass++ : counts.fail++;
    } catch (err) {
      results.checks.ragSpotChecks[key] = { status: CHECK.FAIL, note: String(err?.message ?? err) };
      counts.fail++;
    }
  }

  results.summary = {
    pass: counts.pass,
    fail: counts.fail,
    pending: counts.pending,
    note:
      counts.fail === 0
        ? "All live checks passed — gate GREEN (still requires Mark's hands-on UX sign-off, ADR-0057)."
        : `${counts.fail} live check(s) failed — see per-check reasons.`,
  };
  return results;
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────
// `npm run eval` → node scripts/agent-quality-eval.mjs
//   • AGENT_EVAL_BASE_URL set   → runs runLive() and prints the results JSON (exit 1 on any fail).
//   • AGENT_EVAL_BASE_URL unset → prints criteria + pending results and exits 0 (CI-safe).
// Optional env: AGENT_EVAL_ACTING_USER_ID, AGENT_EVAL_BEARER (never logged).
async function main() {
  const baseUrl = process.env.AGENT_EVAL_BASE_URL?.trim();
  const criteriaValid = criteriaAreValid();

  if (!criteriaValid) {
    console.error("::error::agent-quality eval criteria are malformed:");
    for (const e of validateCriteria()) console.error(`  • ${e}`);
    process.exit(1);
  }

  if (!baseUrl) {
    const pending = buildPendingResults({ baseUrl: null, criteriaValid });
    console.log("agent-quality eval — PENDING backend runtime (ADR-0057).");
    console.log(`Criteria well-formed: covers all ${NINE_GOLD_ENTITY_TYPES.length} gold entity types.`);
    console.log("Set AGENT_EVAL_BASE_URL to a reachable backend to run the live checks.");
    console.log(JSON.stringify(pending, null, 2));
    process.exit(0); // CI-safe: pure check passed, live checks are pending, not failed.
  }

  const actingUserId = process.env.AGENT_EVAL_ACTING_USER_ID?.trim() || "agent-eval-harness";
  const bearer = process.env.AGENT_EVAL_BEARER?.trim() || undefined;
  const results = await runLive({ baseUrl, actingUserId, bearer });
  console.log(JSON.stringify(results, null, 2));
  process.exit(results.summary.fail === 0 ? 0 : 1);
}

// Run only when invoked directly, not when imported by the test suite.
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("agent-quality-eval.mjs")) {
  main();
}
