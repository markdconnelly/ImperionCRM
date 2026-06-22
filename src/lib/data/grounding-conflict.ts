/**
 * `grounding_conflict` data layer — the company-tier grounding-conflict resolution workflow
 * (#1035, ADR-01XX, agentic-OS contract decision 4). The company-tier twin of
 * `personal_contradiction` (0169): a tri-tier disagreement (canon/OKF vs company silver vs
 * personal) raised at grounding time, routed to its `domain_owner`, resolved by the owner —
 * never auto-resolved, every action ledgered.
 *
 * This FE surface is two-sided:
 *   - the orchestrator RAISES a conflict (carrying the labelled most-authoritative interim answer
 *     it served — the anti-stall contract) — `raiseConflict`;
 *   - any employee READS the open queue (transparency) — `listConflicts`;
 *   - the assigned domain owner / fallback role / admin RESOLVES (affirm a tier or dismiss) —
 *     `resolveConflict` (the DB RLS resolve-policy + `app_grounding_conflict_resolver` predicate
 *     scope who may; `id` is a filter, not the security boundary).
 *
 * The resolution WRITE-BACK (pushing the owner's correction into canon via an okf-sync issue, or
 * into company silver via a merge correction) is the DEFERRED follow-up (#TBD) — this layer
 * records the owner's DECISION + direction; the backend executes it later.
 *
 * Server-only; degrades to `[]` / `null` in mock mode (no pool), like the rest of the data layer.
 */
import "server-only";
import type { IdentityContext } from "@/lib/db/identity";
import { withIdentity } from "@/lib/db/identity";
import type { GroundingConflictDraft, GroundingTier } from "@/lib/grounding/authority";

export type ConflictStatus = "open" | "resolved" | "dismissed";
/** Terminal moves an owner can make on an open conflict. */
export type ConflictResolution = "resolved" | "dismissed";

export interface GroundingConflict {
  id: string;
  domain: string;
  concept: string | null;
  canonClaim: string | null;
  companyClaim: string | null;
  personalClaim: string | null;
  detail: string;
  servedTier: GroundingTier;
  servedLabel: string;
  status: ConflictStatus;
  resolutionTier: GroundingTier | null;
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  raisedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GroundingConflictRow {
  id: string;
  domain: string;
  concept: string | null;
  canon_claim: string | null;
  company_claim: string | null;
  personal_claim: string | null;
  detail: string;
  served_tier: GroundingTier;
  served_label: string;
  status: ConflictStatus;
  resolution_tier: GroundingTier | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  raised_by: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS =
  "id, domain, concept, canon_claim, company_claim, personal_claim, detail, served_tier, " +
  "served_label, status, resolution_tier, resolution_note, resolved_by, resolved_at, raised_by, " +
  "created_at, updated_at";

function mapRow(r: GroundingConflictRow): GroundingConflict {
  return {
    id: r.id,
    domain: r.domain,
    concept: r.concept,
    canonClaim: r.canon_claim,
    companyClaim: r.company_claim,
    personalClaim: r.personal_claim,
    detail: r.detail,
    servedTier: r.served_tier,
    servedLabel: r.served_label,
    status: r.status,
    resolutionTier: r.resolution_tier,
    resolutionNote: r.resolution_note,
    resolvedBy: r.resolved_by,
    resolvedAt: r.resolved_at,
    raisedBy: r.raised_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * The conflict queue, newest first. Filter by `status` (default `open` — the actionable set) and/or
 * `domain`. Broad employee read (transparency); the resolve path is what's scoped.
 */
export async function listConflicts(
  identity: IdentityContext,
  opts: { status?: ConflictStatus; domain?: string } = { status: "open" },
): Promise<GroundingConflict[]> {
  const rows = await withIdentity(identity, async (client) => {
    const params: unknown[] = [];
    const clauses: string[] = [];
    if (opts.status) {
      params.push(opts.status);
      clauses.push(`status = $${params.length}`);
    }
    if (opts.domain) {
      params.push(opts.domain);
      clauses.push(`domain = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await client.query<GroundingConflictRow>(
      `SELECT ${SELECT_COLS}
         FROM grounding_conflict
        ${where}
        ORDER BY created_at DESC`,
      params,
    );
    return rows;
  });
  return (rows ?? []).map(mapRow);
}

/**
 * Raise a conflict from a {@link GroundingConflictDraft} produced by `resolveGrounding`. Records
 * the labelled most-authoritative interim answer the agent served (anti-stall) and ledgers the
 * raise. `raisedBy` is the agent/run that detected it. Returns the new row, or null in mock mode.
 */
export async function raiseConflict(
  identity: IdentityContext,
  args: {
    domain: string;
    concept?: string | null;
    raisedBy?: string | null;
    draft: GroundingConflictDraft;
  },
): Promise<GroundingConflict | null> {
  const { domain, concept = null, raisedBy = null, draft } = args;
  const row = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<GroundingConflictRow>(
      `INSERT INTO grounding_conflict
         (domain, concept, canon_claim, company_claim, personal_claim, detail,
          served_tier, served_label, raised_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${SELECT_COLS}`,
      [
        domain,
        concept,
        draft.canonClaim,
        draft.companyClaim,
        draft.personalClaim,
        draft.detail,
        draft.servedTier,
        draft.servedLabel,
        raisedBy,
      ],
    );
    const created = rows[0] ?? null;
    if (created) {
      await client.query(
        `INSERT INTO grounding_conflict_event (conflict_id, actor, action, detail)
         VALUES ($1, $2, 'raise', $3)`,
        [
          created.id,
          raisedBy ?? "orchestrator",
          JSON.stringify({ servedTier: draft.servedTier, domain, concept }),
        ],
      );
    }
    return created;
  });
  return row ? mapRow(row) : null;
}

/**
 * Resolve an OPEN conflict — affirm the authoritative tier (`resolved`) or `dismissed`. Stamps the
 * resolver as `resolved_by` / `resolved_at`, records which tier won (`resolutionTier`) + the
 * owner's direction (`resolutionNote`, for the deferred write-back), and ledgers the action.
 *
 * Only matches a row still `open`, so re-resolve is a no-op. The DB resolve-policy (
 * `app_grounding_conflict_resolver(domain)`) restricts WHICH callers may move the row; this query's
 * `id`/`status` are filters, not the security boundary. Returns the updated row, or null when
 * nothing matched (already resolved, not a resolver, unresolved identity, or mock mode).
 */
export async function resolveConflict(
  identity: IdentityContext,
  id: string,
  resolution: ConflictResolution,
  opts: { resolutionTier?: GroundingTier | null; note?: string | null } = {},
): Promise<GroundingConflict | null> {
  if (!identity.userId) return null;
  const { resolutionTier = null, note = null } = opts;
  const row = await withIdentity(identity, async (client) => {
    const { rows } = await client.query<GroundingConflictRow>(
      `UPDATE grounding_conflict
          SET status = $2,
              resolution_tier = $3,
              resolution_note = $4,
              resolved_by = $5,
              resolved_at = now()
        WHERE id = $1 AND status = 'open'
       RETURNING ${SELECT_COLS}`,
      [id, resolution, resolutionTier, note, identity.userId],
    );
    const updated = rows[0] ?? null;
    if (updated) {
      await client.query(
        `INSERT INTO grounding_conflict_event (conflict_id, actor, action, detail)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          identity.userId,
          resolution === "resolved" ? "resolve" : "dismiss",
          JSON.stringify({ resolutionTier, hasNote: note != null }),
        ],
      );
    }
    return updated;
  });
  return row ? mapRow(row) : null;
}
