// Eval CI quality gate (ADR-0106, epic #983 slice 4 / issue #988).
//
// The regression net for agent QUALITY — the docs-gate / okf-sync shape applied to
// behavior. It runs the eval plane's suites against the backend runner
// (POST /api/agent/eval/run → { aggregateScore }, backend ADR-0077) and FAILS the build
// when a suite's score drops below its committed baseline (minus a tolerance band).
//
// Dormant-by-default, exactly like the v1 acceptance eval (agent-quality-eval.mjs,
// ADR-0057): the live run is GUARDED on AGENT_EVAL_BASE_URL. Unset ⇒ the gate reports
// `pending_no_backend` and exits 0, so CI stays green until a backend is reachable and the
// repo configures AGENT_EVAL_BASE_URL (+ EVAL_ACTING_USER_ID). Once configured, a real
// regression blocks the merge.
//
// SECURITY: no secrets/URLs hardcoded — base URL, acting-user, and bearer are env-driven
// (the same managed-identity caller-auth path as src/lib/services/external-client.ts,
// ADR-0028). Suites are synthetic; no client PII flows through the gate.
//
// Pure functions are exported for the vitest suite; main() runs in CI.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const BASELINES_FILE = "eval/baselines.json";

/** Parse a comma/space-separated suite list from env; defaults to the baselined suites. */
export function parseSuites(envValue, baselines) {
  if (envValue && envValue.trim()) {
    return envValue
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return Object.keys(baselines.suites ?? {});
}

/** Load the committed baselines document. */
export function loadBaselines(repoRoot = process.cwd(), file = BASELINES_FILE) {
  const raw = readFileSync(join(repoRoot, file), "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || typeof parsed.suites !== "object") {
    throw new Error(`${file}: expected { tolerance?, suites: { <suite>: <0..1> } }`);
  }
  return parsed;
}

/**
 * PURE gate verdict. Each result is { suite, aggregateScore }. A suite FAILS when its score
 * is below (baseline - tolerance). A suite with no committed baseline is a failure too — the
 * gate must not silently pass an unbaselined suite (no silent caps).
 *
 * @returns {{ ok: boolean, checked: number, failures: Array<{suite,score,baseline,reason}> }}
 */
export function evaluateEvalGate({ results, baselines, tolerance }) {
  const tol = typeof tolerance === "number" ? tolerance : (baselines.tolerance ?? 0.05);
  const failures = [];
  for (const { suite, aggregateScore } of results) {
    const baseline = baselines.suites?.[suite];
    if (typeof baseline !== "number") {
      failures.push({ suite, score: aggregateScore, baseline: null, reason: "no committed baseline" });
      continue;
    }
    if (typeof aggregateScore !== "number" || Number.isNaN(aggregateScore)) {
      failures.push({ suite, score: aggregateScore, baseline, reason: "no aggregate score returned" });
      continue;
    }
    if (aggregateScore < baseline - tol) {
      failures.push({
        suite,
        score: aggregateScore,
        baseline,
        reason: `score ${aggregateScore.toFixed(3)} < baseline ${baseline} - tol ${tol}`,
      });
    }
  }
  return { ok: failures.length === 0, checked: results.length, failures };
}

// ── Live runner (HTTP) — only used when AGENT_EVAL_BASE_URL is set ───────────────────

/** POST JSON to the backend; dependency-free so the gate runs under plain `node`. */
async function postJson(baseUrl, path, body, { timeoutMs = 120_000, bearer } = {}) {
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

/** Run each suite against the backend runner and collect { suite, aggregateScore }. */
export async function runSuitesLive({ baseUrl, actingUserId, bearer, suites, gitSha }) {
  const results = [];
  for (const suite of suites) {
    try {
      const { ok, status, body } = await postJson(
        baseUrl,
        "/api/agent/eval/run",
        { suite, actingUserId, triggeredBy: "ci", ...(gitSha ? { gitSha } : {}) },
        { bearer },
      );
      results.push({ suite, aggregateScore: ok ? body.aggregateScore : NaN, status: ok ? "ran" : `HTTP ${status}` });
    } catch (err) {
      results.push({ suite, aggregateScore: NaN, status: String(err?.message ?? err) });
    }
  }
  return results;
}

async function main() {
  const baseUrl = process.env.AGENT_EVAL_BASE_URL;
  const baselines = loadBaselines();
  const suites = parseSuites(process.env.EVAL_SUITES, baselines);

  if (!baseUrl) {
    console.log(
      `eval-gate: pending_no_backend — AGENT_EVAL_BASE_URL unset; ${suites.length} suite(s) baselined ` +
        `(${suites.join(", ") || "none"}). Gate is dormant until a backend is configured (ADR-0106 slice 4).`,
    );
    process.exit(0);
  }

  const actingUserId = process.env.EVAL_ACTING_USER_ID;
  if (!actingUserId) {
    console.error("eval-gate: AGENT_EVAL_BASE_URL is set but EVAL_ACTING_USER_ID is missing — cannot run.");
    process.exit(2);
  }

  const results = await runSuitesLive({
    baseUrl,
    actingUserId,
    bearer: process.env.EVAL_RUN_TOKEN,
    suites,
    gitSha: process.env.GITHUB_SHA,
  });
  for (const r of results) {
    console.log(`  ${r.suite}: score=${r.aggregateScore} (${r.status})`);
  }

  const verdict = evaluateEvalGate({ results, baselines });
  if (!verdict.ok) {
    console.error(`eval-gate: FAILED — ${verdict.failures.length}/${verdict.checked} suite(s) regressed:`);
    for (const f of verdict.failures) console.error(`  ✗ ${f.suite}: ${f.reason}`);
    process.exit(1);
  }
  console.log(`eval-gate: PASS — ${verdict.checked} suite(s) at/above baseline.`);
}

// Run only when invoked directly (not when imported by the test suite). Windows-safe path
// check, matching scripts/agent-quality-eval.mjs.
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("eval-gate.mjs")) {
  main().catch((err) => {
    console.error("eval-gate: unexpected error", err);
    process.exit(2);
  });
}
