/**
 * `agent_action_autonomy` data layer (#1013 / 2E-3, ADR-0109, migration 0158) — the
 * read + write for the 1–5 actuation autonomy dial.
 *
 * Unlike the orchestrator settings / tool grants (which are PROCESSES routed through the
 * backend), this dial is FRONT-END-OWNED config: migration 0158 grants the web identity
 * SELECT/INSERT/UPDATE/DELETE on `agent_action_autonomy` and the backend only SELECT (it
 * reads the dial at dispatch, ADR-0109 D4). So the slider writes the row DIRECTLY here,
 * like `personal_note` / `saved_views` / `tags` — the `agents:operate` server-action gate
 * is the authorization, the web grant is the database floor. There is no backend write
 * path for this table to route to.
 *
 * Degrades like the rest of the data layer (ADR-0007/0024): DB unset → mock sample rows;
 * a query failure on read → empty list (never a page error); a write with no pool →
 * a not-configured result.
 *
 * Server-only.
 */
import "server-only";
import { getPool } from "@/lib/db/client";
import {
  coerceLevel,
  resolveTierCeiling,
  type AutonomyLevel,
  type AutonomyTier,
} from "@/lib/agent/action-autonomy";

/** A persisted actuation-dial row, keyed `(agentKey, actionClass)`. */
export interface ActionAutonomyDial {
  agentKey: string;
  actionClass: string;
  level: AutonomyLevel;
  /** The level→tier-ceiling override jsonb (`{}` = built-in defaults). */
  ceilings: Record<string, string>;
  /** The ADR-0055 tier ceiling this level resolves to (derived, not stored). */
  resolvedCeiling: AutonomyTier;
  note: string | null;
  updatedAt: string | null;
}

interface DialRow {
  agent_key: string;
  action_class: string;
  level: number;
  ceilings: unknown;
  note: string | null;
  updated_at: string | null;
}

/** Coerce a jsonb ceilings value into `{ level: tier }`; anything else → `{}`. */
function normalizeCeilings(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function mapRow(r: DialRow): ActionAutonomyDial {
  const level = coerceLevel(r.level);
  const ceilings = normalizeCeilings(r.ceilings);
  return {
    agentKey: r.agent_key,
    actionClass: r.action_class,
    level,
    ceilings,
    resolvedCeiling: resolveTierCeiling(level, ceilings),
    note: r.note,
    updatedAt: r.updated_at,
  };
}

const MOCK_DIALS: ActionAutonomyDial[] = [
  mapRow({
    agent_key: "*",
    action_class: "*",
    level: 1,
    ceilings: {},
    note: "Global default — fail-closed (Manual).",
    updated_at: null,
  }),
];

/**
 * Every configured actuation dial (most-specific keying preserved). DB unset → mock;
 * query failure → empty, never a page error.
 */
export async function listActionAutonomyDials(): Promise<ActionAutonomyDial[]> {
  const pool = getPool();
  if (!pool) return MOCK_DIALS; // mock fallback (ADR-0007)

  try {
    const { rows } = await pool.query<DialRow>(
      `SELECT agent_key, action_class, level, ceilings, note, updated_at
         FROM agent_action_autonomy
        ORDER BY agent_key, action_class`,
    );
    return rows.map(mapRow);
  } catch (err) {
    console.error("action autonomy dials read failed:", err);
    return []; // never fail the page over the dial list
  }
}

/** The outcome of an upsert — drives the slider's inline notice. */
export type UpsertDialOutcome =
  | { ok: true }
  | { ok: false; notConfigured: boolean; message: string };

/**
 * Set the autonomy `level` for `(agentKey, actionClass)` (idempotent upsert). Direct
 * write on the FE-owned table (ADR-0109 D4); the caller MUST gate on `agents:operate`
 * first. `note` is optional operator context. Returns a not-configured outcome in mock
 * mode (no pool) so the action can explain why nothing was saved.
 */
export async function upsertActionAutonomyDial(input: {
  agentKey: string;
  actionClass: string;
  level: AutonomyLevel;
  note?: string | null;
}): Promise<UpsertDialOutcome> {
  const pool = getPool();
  if (!pool) {
    return {
      ok: false,
      notConfigured: true,
      message: "The database isn't configured in this environment — the dial can't be saved yet.",
    };
  }

  try {
    await pool.query(
      `INSERT INTO agent_action_autonomy (agent_key, action_class, level, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (agent_key, action_class)
       DO UPDATE SET level = EXCLUDED.level, note = EXCLUDED.note, updated_at = now()`,
      [input.agentKey, input.actionClass, input.level, input.note ?? null],
    );
    return { ok: true };
  } catch (err) {
    console.error("action autonomy dial write failed:", err);
    return { ok: false, notConfigured: false, message: "Saving the dial failed — try again in a moment." };
  }
}
