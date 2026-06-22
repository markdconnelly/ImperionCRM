/**
 * Eval golden-set HARVEST + the PII redaction contract (#1037, ADR-0119, epic #983).
 *
 * THE PROBLEM. The richest source of new golden-eval cases is what agents have ACTUALLY done —
 * the `agent_run` / `agent_message` ledger (migration 0056). But that ledger carries verbatim
 * client data: emails, names, ticket bodies, dollar figures — `client_pii` / `financial`
 * (#1034). The eval corpus (`agent_eval_case`, 0154) is curated/synthetic-ONLY by contract
 * (system CLAUDE.md §8; ADR-0106 §6: "Never commit secrets", no client identifiers). So a real
 * trace can NEVER be copied into a case verbatim — it must pass a redaction/synthesis step first.
 *
 * THE CONTRACT (provable exclusion). This module is the single, pure, unit-tested gate every
 * harvested string passes through before it can become `agent_eval_case.input`:
 *
 *   1. {@link redactPii} replaces every recognised PII/secret token with a stable typed
 *      placeholder (`[EMAIL]`, `[PERSON]`, `[MONEY]`, …) — never the original substring.
 *   2. {@link assertHarvestSafe} is the FAIL-CLOSED guard: it re-scans the candidate and throws
 *      if ANY residual PII pattern survives. The harvest pipeline (backend runtime) MUST call it
 *      and MUST drop the candidate on throw. A case that cannot be made safe is never harvested —
 *      synthesis is preferred over a lossy copy (ADR-0119).
 *
 * This is a PURE module (no `server-only`, no DB, no network) so the redaction guarantee is
 * exhaustively testable with PII-bearing fixtures (`eval-harvest.test.ts`). The backend is the
 * runtime that reads the ledger, calls this gate, and writes the redacted candidate (ADR-0042
 * split, mirroring the eval runner); this module is the shared contract both sides trust.
 *
 * NOT a substitute for access control: redaction is defence-in-depth ON TOP of the data_class
 * RLS floor (0175) — the harvester reads under a permission-scoped identity; this guarantees the
 * *corpus* stays clean even when the *source* row was legitimately readable.
 */

/** A recognised sensitive-token kind and its replacement placeholder. */
export interface RedactionRule {
  kind: string;
  /** Global, case-insensitive where appropriate. Match = one sensitive token. */
  pattern: RegExp;
  placeholder: string;
}

/**
 * The redaction rule-set. Ordered: broader/structural patterns (emails, URLs) run before
 * narrower ones (bare numbers) so a token is typed by its most specific match. Each pattern is
 * `g`-flagged; {@link redactPii} clones lastIndex-safe copies per call.
 *
 * Conservative by design — it OVER-redacts rather than risk a leak (a redacted-away true
 * negative only costs realism; a missed PII token breaks the §8 contract). New token classes are
 * added here with a fixture in `eval-harvest.test.ts`.
 */
export const REDACTION_RULES: readonly RedactionRule[] = [
  // Emails — before URLs/numbers so the local part isn't half-redacted.
  { kind: "email", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, placeholder: "[EMAIL]" },
  // URLs (may embed tenant/host identifiers).
  { kind: "url", pattern: /\bhttps?:\/\/[^\s)]+/gi, placeholder: "[URL]" },
  // E.164-ish / NA phone numbers.
  {
    kind: "phone",
    pattern: /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    placeholder: "[PHONE]",
  },
  // Money — a currency symbol with digits (financial data_class).
  { kind: "money", pattern: /[$£€]\s?\d[\d,]*(?:\.\d{1,2})?/g, placeholder: "[MONEY]" },
  // IPv4.
  { kind: "ip", pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, placeholder: "[IP]" },
  // UUIDs (entity/client identifiers).
  {
    kind: "uuid",
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    placeholder: "[ID]",
  },
  // Long bare digit runs (account #s, ticket #s, SSNs, card-ish) — after money/phone/ip/uuid.
  { kind: "number", pattern: /\b\d{5,}\b/g, placeholder: "[NUMBER]" },
  // Capitalised two-word proper names (a coarse PERSON heuristic — over-redacts on purpose).
  {
    kind: "person",
    pattern: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
    placeholder: "[PERSON]",
  },
];

/** A literal placeholder cannot itself match any rule (so re-scanning a redacted string is clean). */
const PLACEHOLDER_RE = /\[(?:EMAIL|URL|PHONE|MONEY|IP|ID|NUMBER|PERSON)\]/g;

/** One pass of every rule over `text`, replacing matches with typed placeholders. */
export function redactPii(text: string): string {
  let out = text;
  for (const rule of REDACTION_RULES) {
    out = out.replace(new RegExp(rule.pattern.source, rule.pattern.flags), rule.placeholder);
  }
  return out;
}

/**
 * Re-scan a (presumed already-redacted) string and return every residual sensitive token. The
 * proof the contract holds: a fully-redacted string returns `[]`. Placeholders are stripped
 * first so they are never themselves flagged.
 */
export function residualPii(text: string): Array<{ kind: string; match: string }> {
  const stripped = text.replace(PLACEHOLDER_RE, " ");
  const hits: Array<{ kind: string; match: string }> = [];
  for (const rule of REDACTION_RULES) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(stripped)) !== null) {
      hits.push({ kind: rule.kind, match: m[0] });
      if (m.index === re.lastIndex) re.lastIndex++; // zero-width guard
    }
  }
  return hits;
}

/**
 * FAIL-CLOSED harvest guard. Throws if any residual PII survives in the candidate's harvested
 * fields. The harvest pipeline MUST call this on the redacted candidate and DROP it on throw —
 * this is the line the §8 contract is enforced at. Returns the candidate unchanged when clean.
 */
export function assertHarvestSafe<T extends { input: string; name?: string }>(candidate: T): T {
  const fields: Array<[string, string | undefined]> = [
    ["input", candidate.input],
    ["name", candidate.name],
  ];
  for (const [field, value] of fields) {
    if (value == null) continue;
    const residual = residualPii(value);
    if (residual.length > 0) {
      // The message names the KIND only — never the matched value (which is the PII itself).
      const kinds = [...new Set(residual.map((r) => r.kind))].join(", ");
      throw new HarvestRedactionError(
        `harvest candidate rejected: residual PII (${kinds}) in field "${field}" — drop, do not store`,
      );
    }
  }
  return candidate;
}

/** Thrown by {@link assertHarvestSafe} when a candidate still carries PII after redaction. */
export class HarvestRedactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HarvestRedactionError";
  }
}

/** A golden-case candidate harvested from a low-scoring trace (pre-storage shape). */
export interface HarvestCandidate {
  module: string;
  name: string;
  input: string;
  /** Why this trace was harvested — e.g. "eval result scored 0.42 < 0.75". Audit, redaction-safe. */
  reason: string;
  /** Source ledger row the candidate was synthesised from (an id, not its content). */
  sourceRunId: string;
}

/**
 * Build a redaction-safe golden-case candidate from a raw trace. Redacts `input` + `name`, then
 * runs the fail-closed guard. Throws {@link HarvestRedactionError} if the trace cannot be made
 * safe — the caller drops it. This is the ONLY supported path from a trace to a stored case.
 */
export function buildHarvestCandidate(raw: {
  module: string;
  name: string;
  input: string;
  reason: string;
  sourceRunId: string;
}): HarvestCandidate {
  const candidate: HarvestCandidate = {
    module: raw.module,
    name: redactPii(raw.name),
    input: redactPii(raw.input),
    reason: raw.reason, // caller-authored, must already be redaction-safe (asserted below)
    sourceRunId: raw.sourceRunId,
  };
  assertHarvestSafe(candidate);
  // The reason is operator-authored metadata, not trace content, but guard it too.
  if (residualPii(candidate.reason).length > 0) {
    throw new HarvestRedactionError(`harvest reason carries residual PII — author it from metadata only`);
  }
  return candidate;
}
