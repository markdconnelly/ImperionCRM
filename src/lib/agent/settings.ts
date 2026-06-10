/**
 * Agent-layer settings — pure helpers for the AI Agents page (ADR-0048).
 *
 * The source of truth for presets and budget is the BACKEND (backend ADR-0037,
 * `agent_settings` singleton, migration 0054). This module is deliberately pure
 * (no pg, no env, no server-only) so the validation and presentation logic can
 * be unit-tested directly and imported by client components.
 *
 * The preset → model-pair catalog below MIRRORS the backend's
 * `shared/agent-settings.ts` (PRESET_MODELS). The live GET response carries the
 * authoritative `presets` map; the mirror is only the render fallback when the
 * backend is unreachable. If the backend retunes the catalog, update this too.
 */

export const AGENT_PRESETS = ["economy", "balanced", "premium"] as const;
export type AgentPreset = (typeof AGENT_PRESETS)[number];

/** The (cheap, premium) Claude pair a preset pins (backend ADR-0037). */
export interface ModelPair {
  cheap: string;
  premium: string;
}

export const DEFAULT_PRESET: AgentPreset = "balanced";

/** Mirror of the backend catalog (model ids verified 2026-06-09). */
export const PRESET_MODELS: Record<AgentPreset, ModelPair> = {
  economy: { cheap: "claude-haiku-4-5-20251001", premium: "claude-haiku-4-5-20251001" },
  balanced: { cheap: "claude-haiku-4-5-20251001", premium: "claude-sonnet-4-6" },
  premium: { cheap: "claude-sonnet-4-6", premium: "claude-opus-4-8" },
};

/** Presentation copy for the preset selector. */
export const PRESET_META: Record<AgentPreset, { label: string; tagline: string }> = {
  economy: { label: "Economy", tagline: "Everything on Haiku — cheapest possible operation." },
  balanced: {
    label: "Balanced",
    tagline: "Haiku for routing and sub-agents, Sonnet for synthesis (the default).",
  },
  premium: { label: "Premium", tagline: "Sonnet for routing and sub-agents, Opus for synthesis." },
};

export function isAgentPreset(v: unknown): v is AgentPreset {
  return typeof v === "string" && (AGENT_PRESETS as readonly string[]).includes(v);
}

/** Shorten a Claude model id to a friendly family name ("claude-sonnet-4-6" → "Sonnet 4.6"). */
export function modelShortName(modelId: string): string {
  const m = /^claude-(haiku|sonnet|opus)-(\d+)-(\d+)/.exec(modelId);
  if (!m) return modelId;
  const family = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  return `${family} ${m[2]}.${m[3]}`;
}

/** Result of parsing the budget form input. */
export type BudgetParse = { ok: true; value: number | null } | { ok: false; error: string };

/**
 * Parse the monthly-budget input. Blank → null (no cap). Otherwise it must be a
 * non-negative finite USD amount; values are rounded to cents. A leading "$" and
 * thousands separators are tolerated — operators type money like money.
 */
export function parseBudgetInput(raw: string): BudgetParse {
  const cleaned = raw.trim().replace(/^\$/, "").replace(/,/g, "");
  if (cleaned === "") return { ok: true, value: null };
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return { ok: false, error: "Budget must be a number (or blank for no cap)." };
  if (n < 0) return { ok: false, error: "Budget cannot be negative." };
  return { ok: true, value: Math.round(n * 100) / 100 };
}

/** Tone for the budget progress bar (mirrors the app's green/amber/red tokens). */
export type BudgetTone = "green" | "amber" | "red";

/**
 * Progress toward the monthly budget. `pct` is clamped 0–100 and null when no
 * budget is set (nothing to progress toward). Red at the ceiling (the backend
 * refuses turns there, backend ADR-0037), amber from 80%.
 */
export function budgetProgress(
  spendUsd: number,
  budgetUsdMonthly: number | null,
): { pct: number | null; tone: BudgetTone } {
  if (budgetUsdMonthly == null || budgetUsdMonthly <= 0) return { pct: null, tone: "green" };
  const ratio = spendUsd / budgetUsdMonthly;
  const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  return { pct, tone: ratio >= 1 ? "red" : ratio >= 0.8 ? "amber" : "green" };
}

/** Format a USD amount for display ("$12.34"; sub-cent spend still shows movement). */
export function formatUsd(n: number): string {
  if (n > 0 && n < 0.01) return "<$0.01";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
